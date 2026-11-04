-- =============================================================================
-- Conteúdo do site, configurações, Área Restrita, formulários públicos e RH.
--
-- Quem escreve o quê (decisões de 2026-11-04):
--   posts, reports, report_authors ......... editor, presidente, diretor_rh
--   conteúdo fixo (parceiros, história,
--   etapas do PS, calendários) e settings .. presidente, diretor_rh
--   hr_records ............................. rh, diretor_rh, presidente lançam;
--                                            cada membro lê só os próprios
-- =============================================================================

create function private.can_publish()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('editor', 'presidente', 'diretor_rh');
$$;

create function private.can_manage_hr()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('rh', 'diretor_rh', 'presidente');
$$;

revoke execute on function private.can_publish, private.can_manage_hr from public;
grant execute on function private.can_publish, private.can_manage_hr to anon, authenticated;

-- Ao publicar, registra a data se ninguém informou.
create function private.stamp_publicado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publicado and new.publicado_em is null then
    new.publicado_em := now();
  end if;
  return new;
end;
$$;

-- =============================================================================
-- Parceiros
-- =============================================================================
create table public.partners (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (char_length(nome) between 1 and 80),
  url           text check (url ~ '^https://'),
  logo_path     text,
  institucional boolean not null default false,
  ordem         int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users (id) on delete set null
);
comment on column public.partners.institucional is 'true = aparece no rodapé como parceiro institucional.';

create table public.nucleo_partners (
  nucleo_id  uuid not null references public.nucleos (id) on delete cascade,
  partner_id uuid not null references public.partners (id) on delete cascade,
  ordem      int not null default 0,
  primary key (nucleo_id, partner_id)
);
create index nucleo_partners_partner_idx on public.nucleo_partners (partner_id);

-- =============================================================================
-- Relatórios
-- =============================================================================
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  slug         public.slug not null unique,
  titulo       text not null check (char_length(titulo) between 1 and 160),
  resumo       text check (char_length(resumo) <= 1000),
  tipo         public.report_tipo not null,
  nucleo_id    uuid references public.nucleos (id) on delete set null,
  setor        text check (char_length(setor) <= 60),
  ticker       text check (ticker ~ '^[A-Z0-9]{4,6}$'),
  pdf_path     text,
  publicado    boolean not null default false,
  publicado_em timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users (id) on delete set null,
  constraint reports_publicado_tem_pdf check (not publicado or pdf_path is not null)
);
comment on column public.reports.pdf_path is 'Caminho no bucket `relatorios`, ex. 2026/intb3.pdf';
create index reports_nucleo_idx on public.reports (nucleo_id);
create index reports_publicado_idx on public.reports (publicado, publicado_em desc);

create table public.report_authors (
  report_id uuid not null references public.reports (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete restrict,
  ordem     int not null default 0,
  primary key (report_id, member_id)
);
comment on column public.report_authors.member_id is
  'restrict: um membro com relatórios não é excluído, e sim anonimizado (LGPD).';
create index report_authors_member_idx on public.report_authors (member_id);

-- =============================================================================
-- Publicações (eventos, palestras, viagens, SMF, competições)
-- Relatórios não são posts: o editor de Publicações grava em `reports`.
-- =============================================================================
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         public.slug not null unique,
  titulo       text not null check (char_length(titulo) between 1 and 160),
  resumo       text check (char_length(resumo) <= 500),
  categoria    public.post_categoria not null,
  corpo        jsonb not null default '{}'::jsonb,
  capa_path    text,
  galeria      text[] not null default '{}',
  data_evento  timestamptz,
  local        text check (char_length(local) <= 160),
  publicado    boolean not null default false,
  publicado_em timestamptz,
  autor_id     uuid references public.members (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users (id) on delete set null
);
comment on column public.posts.corpo is 'Documento do editor Tiptap (JSON).';
create index posts_categoria_idx on public.posts (categoria, data_evento desc);
create index posts_publicado_idx on public.posts (publicado, publicado_em desc);
create index posts_autor_idx on public.posts (autor_id);

-- =============================================================================
-- Nossa História e etapas do Processo Seletivo
-- =============================================================================
create table public.history_sections (
  id         uuid primary key default gen_random_uuid(),
  periodo    text not null check (char_length(periodo) between 1 and 40),
  titulo     text not null check (char_length(titulo) between 1 and 160),
  texto      text check (char_length(texto) <= 5000),
  fotos      text[] not null default '{}',
  conquistas text[] not null default '{}',
  ordem      int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table public.ps_steps (
  id         uuid primary key default gen_random_uuid(),
  ordem      int not null default 0,
  titulo     text not null check (char_length(titulo) between 1 and 120),
  descricao  text check (char_length(descricao) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- =============================================================================
-- Configurações (uma linha cada). Separadas porque a pública é lida por
-- visitantes e a restrita só por quem tem acesso (RLS é por linha).
-- =============================================================================
create table public.site_settings (
  id              boolean primary key default true check (id),
  ps_aberto       boolean not null default false,
  edital_pdf_path text,
  forms_url       text check (forms_url ~ '^https://(docs\.google\.com/forms/|forms\.gle/)'),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users (id) on delete set null
);
comment on table public.site_settings is 'Linha única. ps_aberto controla o botão do Processo Seletivo.';
insert into public.site_settings (id) values (true);

create table public.restricted_settings (
  id         boolean primary key default true check (id),
  drive_url  text check (drive_url ~ '^https://drive\.google\.com/'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
comment on table public.restricted_settings is 'Linha única, só para a Área Restrita (link do Google Drive da LMF).';
insert into public.restricted_settings (id) values (true);

-- =============================================================================
-- Área Restrita: calendários e documentos
-- =============================================================================
create table public.calendars (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null check (char_length(nome) between 1 and 80),
  google_calendar_id text not null unique check (char_length(google_calendar_id) <= 255),
  cor                text not null default '#8C14B9' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  ordem              int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by         uuid references auth.users (id) on delete set null
);

create table public.documents (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null check (char_length(titulo) between 1 and 160),
  descricao  text check (char_length(descricao) <= 500),
  categoria  public.document_categoria not null,
  file_path  text not null,
  ordem      int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
comment on column public.documents.file_path is 'Caminho no bucket privado `documentos` (servido por URL assinada).';

-- =============================================================================
-- Formulários públicos
-- =============================================================================
create table public.alumni_submissions (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null check (char_length(nome) between 1 and 120),
  curso          text check (char_length(curso) <= 120),
  email          public.email not null,
  linkedin       text check (linkedin ~ '^https://([a-z]+\.)?linkedin\.com/'),
  gestao_trainee public.gestao,
  gestoes        text check (char_length(gestoes) <= 500),
  cargos         text check (char_length(cargos) <= 1000),
  foto_path      text check (foto_path like 'alumni/%'),
  mensagem       text check (char_length(mensagem) <= 2000),
  consentimento  boolean not null check (consentimento),
  status         public.submission_status not null default 'pendente',
  member_id      uuid references public.members (id) on delete set null,
  reviewed_by    uuid references auth.users (id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);
comment on column public.alumni_submissions.consentimento is
  'LGPD: a pessoa autorizou a publicação dos dados no site. Obrigatório.';
create index alumni_submissions_status_idx on public.alumni_submissions (status, created_at desc);

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(nome) between 1 and 120),
  email      public.email not null,
  assunto    text check (char_length(assunto) <= 160),
  mensagem   text not null check (char_length(mensagem) between 1 and 5000),
  lida       boolean not null default false,
  created_at timestamptz not null default now()
);
create index contact_messages_created_idx on public.contact_messages (created_at desc);

-- =============================================================================
-- RH: pontos e strikes (histórico por membro, inclusive alumni)
-- =============================================================================
create table public.hr_records (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members (id) on delete cascade,
  tipo       public.hr_tipo not null,
  valor      int not null default 1 check (valor between 1 and 100),
  motivo     text not null check (char_length(motivo) between 1 and 500),
  gestao     public.gestao not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index hr_records_member_idx on public.hr_records (member_id, created_at desc);

-- =============================================================================
-- Triggers de auditoria
-- =============================================================================
create trigger partners_audit before update on public.partners
  for each row execute function private.touch_audit();
create trigger reports_audit before update on public.reports
  for each row execute function private.touch_audit();
create trigger reports_publicado_em before insert or update on public.reports
  for each row execute function private.stamp_publicado_em();
create trigger posts_audit before update on public.posts
  for each row execute function private.touch_audit();
create trigger posts_publicado_em before insert or update on public.posts
  for each row execute function private.stamp_publicado_em();
create trigger history_sections_audit before update on public.history_sections
  for each row execute function private.touch_audit();
create trigger ps_steps_audit before update on public.ps_steps
  for each row execute function private.touch_audit();
create trigger site_settings_audit before update on public.site_settings
  for each row execute function private.touch_audit();
create trigger restricted_settings_audit before update on public.restricted_settings
  for each row execute function private.touch_audit();
create trigger calendars_audit before update on public.calendars
  for each row execute function private.touch_audit();
create trigger documents_audit before update on public.documents
  for each row execute function private.touch_audit();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.partners            enable row level security;
alter table public.nucleo_partners     enable row level security;
alter table public.reports             enable row level security;
alter table public.report_authors      enable row level security;
alter table public.posts               enable row level security;
alter table public.history_sections    enable row level security;
alter table public.ps_steps            enable row level security;
alter table public.site_settings       enable row level security;
alter table public.restricted_settings enable row level security;
alter table public.calendars           enable row level security;
alter table public.documents           enable row level security;
alter table public.alumni_submissions  enable row level security;
alter table public.contact_messages    enable row level security;
alter table public.hr_records          enable row level security;

-- --- Conteúdo fixo: leitura pública, escrita do admin ------------------------
grant select on public.partners, public.nucleo_partners, public.history_sections, public.ps_steps
  to anon, authenticated;
grant insert, update, delete on public.partners, public.nucleo_partners, public.history_sections, public.ps_steps
  to authenticated;

create policy "partners: leitura pública" on public.partners
  for select to anon, authenticated using (true);
create policy "partners: admin insere" on public.partners
  for insert to authenticated with check ((select private.is_admin()));
create policy "partners: admin altera" on public.partners
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "partners: admin exclui" on public.partners
  for delete to authenticated using ((select private.is_admin()));

create policy "nucleo_partners: leitura pública" on public.nucleo_partners
  for select to anon, authenticated using (true);
create policy "nucleo_partners: admin insere" on public.nucleo_partners
  for insert to authenticated with check ((select private.is_admin()));
create policy "nucleo_partners: admin altera" on public.nucleo_partners
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "nucleo_partners: admin exclui" on public.nucleo_partners
  for delete to authenticated using ((select private.is_admin()));

create policy "history_sections: leitura pública" on public.history_sections
  for select to anon, authenticated using (true);
create policy "history_sections: admin insere" on public.history_sections
  for insert to authenticated with check ((select private.is_admin()));
create policy "history_sections: admin altera" on public.history_sections
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "history_sections: admin exclui" on public.history_sections
  for delete to authenticated using ((select private.is_admin()));

create policy "ps_steps: leitura pública" on public.ps_steps
  for select to anon, authenticated using (true);
create policy "ps_steps: admin insere" on public.ps_steps
  for insert to authenticated with check ((select private.is_admin()));
create policy "ps_steps: admin altera" on public.ps_steps
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "ps_steps: admin exclui" on public.ps_steps
  for delete to authenticated using ((select private.is_admin()));

-- --- Publicações: o público vê o publicado; editor vê e edita tudo -----------
grant select on public.reports, public.report_authors, public.posts to anon, authenticated;
grant insert, update, delete on public.reports, public.report_authors, public.posts to authenticated;

create policy "reports: publicados ou editor" on public.reports
  for select to anon, authenticated
  using (publicado or (select private.can_publish()));
create policy "reports: editor insere" on public.reports
  for insert to authenticated with check ((select private.can_publish()));
create policy "reports: editor altera" on public.reports
  for update to authenticated using ((select private.can_publish())) with check ((select private.can_publish()));
create policy "reports: editor exclui" on public.reports
  for delete to authenticated using ((select private.can_publish()));

create policy "report_authors: de relatório visível" on public.report_authors
  for select to anon, authenticated
  using (exists (
    select 1 from public.reports r
    where r.id = report_id and (r.publicado or (select private.can_publish()))
  ));
create policy "report_authors: editor insere" on public.report_authors
  for insert to authenticated with check ((select private.can_publish()));
create policy "report_authors: editor altera" on public.report_authors
  for update to authenticated using ((select private.can_publish())) with check ((select private.can_publish()));
create policy "report_authors: editor exclui" on public.report_authors
  for delete to authenticated using ((select private.can_publish()));

create policy "posts: publicados ou editor" on public.posts
  for select to anon, authenticated
  using (publicado or (select private.can_publish()));
create policy "posts: editor insere" on public.posts
  for insert to authenticated with check ((select private.can_publish()));
create policy "posts: editor altera" on public.posts
  for update to authenticated using ((select private.can_publish())) with check ((select private.can_publish()));
create policy "posts: editor exclui" on public.posts
  for delete to authenticated using ((select private.can_publish()));

-- --- Configurações: linha única, só UPDATE pelo admin ------------------------
grant select on public.site_settings to anon, authenticated;
grant update (ps_aberto, edital_pdf_path, forms_url) on public.site_settings to authenticated;

create policy "site_settings: leitura pública" on public.site_settings
  for select to anon, authenticated using (true);
create policy "site_settings: admin altera" on public.site_settings
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

grant select on public.restricted_settings to authenticated;
grant update (drive_url) on public.restricted_settings to authenticated;

create policy "restricted_settings: membros leem" on public.restricted_settings
  for select to authenticated using ((select private.is_member()));
create policy "restricted_settings: admin altera" on public.restricted_settings
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- --- Calendários e documentos: membros leem, admin escreve -------------------
grant select, insert, update, delete on public.calendars, public.documents to authenticated;

create policy "calendars: membros leem" on public.calendars
  for select to authenticated using ((select private.is_member()));
create policy "calendars: admin insere" on public.calendars
  for insert to authenticated with check ((select private.is_admin()));
create policy "calendars: admin altera" on public.calendars
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "calendars: admin exclui" on public.calendars
  for delete to authenticated using ((select private.is_admin()));

create policy "documents: membros leem" on public.documents
  for select to authenticated using ((select private.is_member()));
create policy "documents: admin insere" on public.documents
  for insert to authenticated with check ((select private.is_admin()));
create policy "documents: admin altera" on public.documents
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "documents: admin exclui" on public.documents
  for delete to authenticated using ((select private.is_admin()));

-- --- Formulários públicos: qualquer um envia, só admin lê --------------------
-- O visitante só grava as colunas do formulário; status e revisão ficam com o admin.
grant insert (nome, curso, email, linkedin, gestao_trainee, gestoes, cargos, foto_path, mensagem, consentimento)
  on public.alumni_submissions to anon, authenticated;
grant select, update, delete on public.alumni_submissions to authenticated;

create policy "alumni_submissions: qualquer um envia" on public.alumni_submissions
  for insert to anon, authenticated
  with check (status = 'pendente' and member_id is null and reviewed_by is null and reviewed_at is null);
create policy "alumni_submissions: admin lê" on public.alumni_submissions
  for select to authenticated using ((select private.is_admin()));
create policy "alumni_submissions: admin revisa" on public.alumni_submissions
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "alumni_submissions: admin exclui" on public.alumni_submissions
  for delete to authenticated using ((select private.is_admin()));

grant insert (nome, email, assunto, mensagem) on public.contact_messages to anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;

create policy "contact_messages: qualquer um envia" on public.contact_messages
  for insert to anon, authenticated with check (not lida);
create policy "contact_messages: admin lê" on public.contact_messages
  for select to authenticated using ((select private.is_admin()));
create policy "contact_messages: admin marca lida" on public.contact_messages
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "contact_messages: admin exclui" on public.contact_messages
  for delete to authenticated using ((select private.is_admin()));

-- --- RH ----------------------------------------------------------------------
grant select, insert, update, delete on public.hr_records to authenticated;

create policy "hr_records: próprios ou RH" on public.hr_records
  for select to authenticated
  using (member_id = (select private.current_member_id()) or (select private.can_manage_hr()));
create policy "hr_records: RH lança" on public.hr_records
  for insert to authenticated
  with check ((select private.can_manage_hr()) and created_by = (select auth.uid()));
create policy "hr_records: admin corrige" on public.hr_records
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "hr_records: admin exclui" on public.hr_records
  for delete to authenticated using ((select private.is_admin()));
