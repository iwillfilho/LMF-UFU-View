-- =============================================================================
-- E-mails com espaços em volta (DEF-13)
-- -----------------------------------------------------------------------------
-- O hook e a sincronização comparavam lower(email) sem trim(): um e-mail com
-- espaço em volta era recusado pelo hook, e a conta não seria ligada aos
-- grants. access_grants.email nunca tem espaços nem maiúsculas (domínio
-- public.email), então basta normalizar o lado que vem do Auth.
-- =============================================================================

create or replace function private.before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(event -> 'user' ->> 'email'));
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

create or replace function private.sync_user_access(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
begin
  delete from public.user_roles where user_id = p_user_id;

  insert into public.user_roles (user_id, role, grant_id)
  select p_user_id, g.role, g.id
  from public.access_grants g
  where g.email = v_email;

  -- Vincula a conta ao cadastro de membro indicado no grant.
  update public.member_private set user_id = null
  where user_id = p_user_id
    and member_id not in (
      select g.member_id from public.access_grants g
      where g.email = v_email and g.member_id is not null
    );

  insert into public.member_private (member_id, user_id)
  select distinct g.member_id, p_user_id
  from public.access_grants g
  where g.email = v_email and g.member_id is not null
  on conflict (member_id) do update
    set user_id = excluded.user_id
    where public.member_private.user_id is null
       or public.member_private.user_id = excluded.user_id;
end;
$$;

create or replace function private.on_access_grant_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  u record;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    for u in select id, email from auth.users where lower(trim(email)) = old.email loop
      perform private.sync_user_access(u.id, u.email);
    end loop;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    for u in select id, email from auth.users where lower(trim(email)) = new.email loop
      perform private.sync_user_access(u.id, u.email);
    end loop;
  end if;
  return null;
end;
$$;
