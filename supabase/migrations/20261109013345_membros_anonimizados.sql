-- =============================================================================
-- Membros anonimizados (LGPD).
--
-- Quem tem relatório publicado não pode ser excluído (report_authors.member_id
-- é "on delete restrict"). Nesse caso o cadastro é anonimizado: nome
-- "Ex-membro", sem foto, curso, LinkedIn ou contato. A linha continua só para
-- manter a autoria dos relatórios, e o site público não a lista em Equipe/Alumni.
-- =============================================================================

alter table public.members
  add column anonimizado boolean not null default false;

comment on column public.members.anonimizado is
  'Cadastro anonimizado a pedido (LGPD). Fica fora das listas públicas; só aparece como autor de relatório.';

-- Anonimizado não tem dados pessoais nem acesso: o banco garante, não só o app.
alter table public.members
  add constraint members_anonimizado_sem_dados
  check (not anonimizado or (foto_path is null and curso is null and linkedin is null and status = 'alumni'));
