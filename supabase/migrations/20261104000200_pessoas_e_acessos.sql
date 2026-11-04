-- =============================================================================
-- Pessoas e acessos: estrutura (núcleos, diretorias), membros, cargos por
-- gestão, liberação de acesso por e-mail e papéis.
--
-- Fluxo de acesso:
--   1. Presidente/Diretor de RH cria uma linha em `access_grants` com o e-mail
--      Google da pessoa e o papel.
--   2. O hook `before_user_created` só deixa criar conta para e-mails liberados.
--   3. No primeiro login, o trigger em auth.users copia os papéis para
--      `user_roles` e vincula a conta ao cadastro de membro.
--   4. Apagar o grant remove o papel na hora (FK em cascata); a próxima
--      requisição já é recusada pela RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Estrutura
-- -----------------------------------------------------------------------------
create table public.nucleos (
  id          uuid primary key default gen_random_uuid(),
  slug        public.slug not null unique,
  nome        text not null check (char_length(nome) between 1 and 60),
  area        text check (char_length(area) <= 80),
  descricao   text check (char_length(descricao) <= 2000),
  banner_path text,
  ordem       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);
comment on table public.nucleos is 'Núcleos de estudo (Asset, Equity, Quant). Editado por presidente/diretor_rh.';

create table public.diretorias (
  id         uuid primary key default gen_random_uuid(),
  slug       public.slug not null unique,
  nome       text not null check (char_length(nome) between 1 and 80),
  ordem      int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
comment on table public.diretorias is 'Diretorias do organograma (Presidência, RH, Marketing...).';

-- -----------------------------------------------------------------------------
-- Membros (ativos e alumni na mesma tabela, como pedido no PDF)
-- -----------------------------------------------------------------------------
create table public.members (
  id             uuid primary key default gen_random_uuid(),
  slug           public.slug not null unique,
  nome           text not null check (char_length(nome) between 1 and 120),
  curso          text check (char_length(curso) <= 120),
  foto_path      text,
  status         public.member_status not null default 'ativo',
  gestao_trainee public.gestao,
  linkedin       text check (linkedin ~ '^https://([a-z]+\.)?linkedin\.com/'),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users (id) on delete set null
);
comment on table public.members is 'Membros ativos e alumni. Dados públicos; contato e vínculo com login ficam em member_private.';
create index members_status_idx on public.members (status);

-- Dados que não podem ir para o site público. Separados em outra tabela porque
-- a RLS é por linha: não dá para esconder só uma coluna de `members`.
create table public.member_private (
  member_id     uuid primary key references public.members (id) on delete cascade,
  user_id       uuid unique references auth.users (id) on delete set null,
  email_contato public.email,
  telefone      text check (char_length(telefone) <= 30),
  updated_at    timestamptz not null default now()
);
comment on table public.member_private is 'Contato e conta de login de cada membro. Visível só para quem tem acesso à Área Restrita.';

-- Um registro por cargo em cada gestão: preserva o histórico do "currículo".
create table public.member_terms (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.members (id) on delete cascade,
  gestao       public.gestao not null,
  cargo        text not null check (char_length(cargo) between 1 and 80),
  diretoria_id uuid references public.diretorias (id) on delete set null,
  nucleo_id    uuid references public.nucleos (id) on delete set null,
  ordem        int not null default 0,
  created_at   timestamptz not null default now(),
  unique (member_id, gestao, cargo)
);
create index member_terms_member_idx on public.member_terms (member_id);
create index member_terms_gestao_idx on public.member_terms (gestao);
create index member_terms_diretoria_idx on public.member_terms (diretoria_id);
create index member_terms_nucleo_idx on public.member_terms (nucleo_id);

-- -----------------------------------------------------------------------------
-- Acessos
-- -----------------------------------------------------------------------------
create table public.access_grants (
  id         uuid primary key default gen_random_uuid(),
  email      public.email not null,
  role       public.app_role not null,
  member_id  uuid references public.members (id) on delete set null,
  granted_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (email, role)
);
comment on table public.access_grants is 'Lista de liberação por e-mail Google. É a fonte da verdade dos acessos; user_roles é derivada dela.';
create index access_grants_member_idx on public.access_grants (member_id);

-- Derivada de access_grants pelos triggers abaixo. Nenhum cliente escreve aqui.
create table public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  grant_id   uuid not null references public.access_grants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index user_roles_grant_idx on public.user_roles (grant_id);

-- -----------------------------------------------------------------------------
-- Funções usadas nas policies. SECURITY DEFINER para ler user_roles sem
-- depender da RLS dela (evita recursão) e sempre com search_path vazio.
-- Nas policies, chame dentro de (select ...) para o Postgres avaliar uma vez
-- por consulta, e não uma vez por linha.
-- -----------------------------------------------------------------------------
create function private.has_role(variadic roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = any (roles)
  );
$$;

-- Presidente e Diretor de RH: administram acessos, membros e conteúdo fixo.
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('presidente', 'diretor_rh');
$$;

-- Qualquer pessoa com algum papel, ou seja, com acesso à Área Restrita.
create function private.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles ur where ur.user_id = (select auth.uid()));
$$;

-- Cadastro de membro da pessoa logada (para "Meus pontos").
create function private.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select mp.member_id from public.member_private mp where mp.user_id = (select auth.uid());
$$;

revoke execute on function private.has_role, private.is_admin, private.is_member,
  private.current_member_id from public;
grant execute on function private.has_role, private.is_admin, private.is_member,
  private.current_member_id to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Sincronização access_grants → user_roles / member_private
-- -----------------------------------------------------------------------------
create function private.sync_user_access(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.user_roles where user_id = p_user_id;

  insert into public.user_roles (user_id, role, grant_id)
  select p_user_id, g.role, g.id
  from public.access_grants g
  where g.email = lower(p_email);

  -- Vincula a conta ao cadastro de membro indicado no grant.
  update public.member_private set user_id = null
  where user_id = p_user_id
    and member_id not in (
      select g.member_id from public.access_grants g
      where g.email = lower(p_email) and g.member_id is not null
    );

  insert into public.member_private (member_id, user_id)
  select distinct g.member_id, p_user_id
  from public.access_grants g
  where g.email = lower(p_email) and g.member_id is not null
  on conflict (member_id) do update
    set user_id = excluded.user_id
    where public.member_private.user_id is null
       or public.member_private.user_id = excluded.user_id;
end;
$$;
revoke execute on function private.sync_user_access from public, anon, authenticated;

-- Primeiro login (ou troca de e-mail da conta).
create function private.on_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    perform private.sync_user_access(new.id, new.email);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.on_auth_user_change();

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.on_auth_user_change();

-- Mudança na lista de liberação: ressincroniza quem já tem conta.
create function private.on_access_grant_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  u record;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    for u in select id, email from auth.users where lower(email) = old.email loop
      perform private.sync_user_access(u.id, u.email);
    end loop;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    for u in select id, email from auth.users where lower(email) = new.email loop
      perform private.sync_user_access(u.id, u.email);
    end loop;
  end if;
  return null;
end;
$$;

create trigger access_grants_sync
  after insert or update or delete on public.access_grants
  for each row execute function private.on_access_grant_change();

-- O site nunca pode ficar sem ninguém para liberar acessos.
create function private.guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role in ('presidente', 'diretor_rh')
     and (tg_op = 'DELETE' or new.role not in ('presidente', 'diretor_rh'))
     and not exists (
       select 1 from public.access_grants g
       where g.id <> old.id and g.role in ('presidente', 'diretor_rh')
     )
  then
    raise exception 'A LMF precisa de pelo menos um Presidente ou Diretor de RH com acesso. Libere o acesso do sucessor antes de remover este.'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger access_grants_guard_last_admin
  before update or delete on public.access_grants
  for each row execute function private.guard_last_admin();

-- -----------------------------------------------------------------------------
-- Hook de Auth: só cria conta para e-mail liberado. Quem não está na lista
-- nem chega a ganhar usuário no Supabase.
-- Local: config.toml [auth.hook.before_user_created].
-- Produção: Dashboard → Authentication → Hooks → Before User Created.
-- -----------------------------------------------------------------------------
create function private.before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := lower(event -> 'user' ->> 'email');
begin
  if v_email is not null and exists (select 1 from public.access_grants g where g.email = v_email) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'message', 'Este e-mail ainda não tem acesso à Área Restrita da LMF. Fale com o Diretor de RH.',
      'http_code', 403
    )
  );
end;
$$;

grant usage on schema private to supabase_auth_admin;
revoke execute on function private.before_user_created from public, anon, authenticated;
grant execute on function private.before_user_created to supabase_auth_admin;

-- -----------------------------------------------------------------------------
-- Auditoria
-- -----------------------------------------------------------------------------
create trigger nucleos_audit before update on public.nucleos
  for each row execute function private.touch_audit();
create trigger diretorias_audit before update on public.diretorias
  for each row execute function private.touch_audit();
create trigger members_audit before update on public.members
  for each row execute function private.touch_audit();
create trigger member_private_touch before update on public.member_private
  for each row execute function private.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Permissões e RLS
-- -----------------------------------------------------------------------------
alter table public.nucleos        enable row level security;
alter table public.diretorias     enable row level security;
alter table public.members        enable row level security;
alter table public.member_private enable row level security;
alter table public.member_terms   enable row level security;
alter table public.access_grants  enable row level security;
alter table public.user_roles     enable row level security;

-- Públicas: qualquer um lê; só presidente/diretor_rh escrevem.
grant select on public.nucleos, public.diretorias, public.members, public.member_terms
  to anon, authenticated;
grant insert, update, delete on public.nucleos, public.diretorias, public.members, public.member_terms
  to authenticated;

create policy "nucleos: leitura pública" on public.nucleos
  for select to anon, authenticated using (true);
create policy "nucleos: admin insere" on public.nucleos
  for insert to authenticated with check ((select private.is_admin()));
create policy "nucleos: admin altera" on public.nucleos
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "nucleos: admin exclui" on public.nucleos
  for delete to authenticated using ((select private.is_admin()));

create policy "diretorias: leitura pública" on public.diretorias
  for select to anon, authenticated using (true);
create policy "diretorias: admin insere" on public.diretorias
  for insert to authenticated with check ((select private.is_admin()));
create policy "diretorias: admin altera" on public.diretorias
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "diretorias: admin exclui" on public.diretorias
  for delete to authenticated using ((select private.is_admin()));

create policy "members: leitura pública" on public.members
  for select to anon, authenticated using (true);
create policy "members: admin insere" on public.members
  for insert to authenticated with check ((select private.is_admin()));
create policy "members: admin altera" on public.members
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "members: admin exclui" on public.members
  for delete to authenticated using ((select private.is_admin()));

create policy "member_terms: leitura pública" on public.member_terms
  for select to anon, authenticated using (true);
create policy "member_terms: admin insere" on public.member_terms
  for insert to authenticated with check ((select private.is_admin()));
create policy "member_terms: admin altera" on public.member_terms
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "member_terms: admin exclui" on public.member_terms
  for delete to authenticated using ((select private.is_admin()));

-- Privadas de membros: quem tem acesso lê; admin escreve.
grant select, insert, update, delete on public.member_private to authenticated;

create policy "member_private: membros leem" on public.member_private
  for select to authenticated using ((select private.is_member()));
create policy "member_private: admin insere" on public.member_private
  for insert to authenticated with check ((select private.is_admin()));
create policy "member_private: admin altera" on public.member_private
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "member_private: admin exclui" on public.member_private
  for delete to authenticated using ((select private.is_admin()));

-- Lista de liberação: só admin.
grant select, insert, update, delete on public.access_grants to authenticated;

create policy "access_grants: admin lê" on public.access_grants
  for select to authenticated using ((select private.is_admin()));
create policy "access_grants: admin libera" on public.access_grants
  for insert to authenticated with check ((select private.is_admin()));
create policy "access_grants: admin altera" on public.access_grants
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "access_grants: admin revoga" on public.access_grants
  for delete to authenticated using ((select private.is_admin()));

-- Papéis: cada um vê os seus (para montar o menu); admin vê todos.
grant select on public.user_roles to authenticated;

create policy "user_roles: próprios ou admin" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
