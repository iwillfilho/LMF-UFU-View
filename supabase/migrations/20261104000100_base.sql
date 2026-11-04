-- =============================================================================
-- Base: tipos, schema `private` e funções utilitárias.
--
-- Nenhuma tabela nova fica acessível pela API automaticamente. Cada migration
-- concede explicitamente só o que cada papel precisa (anon = visitante,
-- authenticated = quem fez login). A RLS continua valendo por cima disso.
-- =============================================================================

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, public;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;

-- Funções auxiliares das policies. Este schema não é exposto pela API
-- (config.toml → api.schemas), mas as policies precisam executá-las.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('presidente', 'diretor_rh', 'rh', 'editor', 'membro');
comment on type public.app_role is
  'Papéis da Área Restrita. presidente e diretor_rh administram tudo; rh lança pontos/strikes; editor publica posts e relatórios; membro só acessa.';

create type public.member_status as enum ('ativo', 'alumni');
create type public.report_tipo as enum ('tese', 'iniciacao');
create type public.post_categoria as enum ('evento', 'palestra', 'viagem', 'smf', 'competicao');
create type public.hr_tipo as enum ('ponto', 'strike');
create type public.document_categoria as enum ('estatuto', 'regimento', 'auxiliar');
create type public.submission_status as enum ('pendente', 'aprovado', 'rejeitado');

-- Formatos reaproveitados nas constraints.
create domain public.gestao as text
  check (value ~ '^\d{4}\.[12]$');
comment on domain public.gestao is 'Semestre da gestão, ex. 2026.2';

create domain public.slug as text
  check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(value) <= 80);

create domain public.email as text
  check (value ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and value = lower(value) and char_length(value) <= 254);

grant usage on type public.app_role, public.member_status, public.report_tipo,
  public.post_categoria, public.hr_tipo, public.document_categoria,
  public.submission_status to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Auditoria simples: updated_at e, onde existir, updated_by.
-- -----------------------------------------------------------------------------
create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function private.touch_audit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
