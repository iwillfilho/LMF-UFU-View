-- =============================================================================
-- Testes das permissões por papel (pgTAP). Rodar com: npm run db:test
-- Tudo roda numa transação e é desfeito no final (rollback).
--
-- Usuários de teste:
--   p  presidente@lmf.com   presidente (seed, vinculado a Júlia Kasahara)
--   d  diretor.rh@lmf.com   diretor_rh (seed, vinculado a Iolanda Andrade)
--   e  editor@teste.local   editor (liberado DEPOIS de a conta existir)
--   r  rh@teste.local       rh
--   m  membro@teste.local   membro (vinculado a Gustavo Kono)
--   s  estranho@...         conta sem nenhum acesso
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(63);

-- Liberação antes de a conta existir (caminho normal).
insert into public.access_grants (email, role) values ('rh@teste.local', 'rh');
insert into public.access_grants (email, role, member_id)
  select 'membro@teste.local', 'membro', id from public.members where slug = 'gustavo-kono';

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'presidente@lmf.com'),
  ('a0000000-0000-0000-0000-000000000002', 'diretor.rh@lmf.com'),
  ('a0000000-0000-0000-0000-000000000003', 'editor@teste.local'),
  ('a0000000-0000-0000-0000-000000000004', 'rh@teste.local'),
  ('a0000000-0000-0000-0000-000000000005', 'membro@teste.local'),
  ('a0000000-0000-0000-0000-000000000006', 'estranho@teste.local');

-- Documento interno de exemplo (só existe dentro desta transação).
insert into public.documents (titulo, categoria, file_path) values ('Estatuto Social', 'estatuto', 'e/estatuto.pdf');

-- Liberação depois de a conta existir.
insert into public.access_grants (email, role) values ('editor@teste.local', 'editor');

-- -----------------------------------------------------------------------------
-- Sincronização de acessos e hook de cadastro
-- -----------------------------------------------------------------------------
select results_eq(
  $$select role::text from public.user_roles where user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  array['presidente'],
  'primeiro login do presidente recebe o papel liberado por e-mail'
);
select results_eq(
  $$select m.slug::text from public.member_private mp join public.members m on m.id = mp.member_id
    where mp.user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  array['julia-kasahara'],
  'a conta do presidente fica vinculada ao cadastro de membro'
);
select results_eq(
  $$select role::text from public.user_roles where user_id = 'a0000000-0000-0000-0000-000000000003'$$,
  array['editor'],
  'liberar o acesso de quem já tem conta aplica o papel na hora'
);
select is_empty(
  $$select 1 from public.user_roles where user_id = 'a0000000-0000-0000-0000-000000000006'$$,
  'conta sem liberação não tem papel'
);
select is(
  private.before_user_created('{"user":{"email":"Estranho@Teste.local"}}'::jsonb) -> 'error' ->> 'http_code',
  '403',
  'hook recusa criar conta para e-mail não liberado'
);
select is(
  private.before_user_created('{"user":{"email":"Presidente@LMF.com"}}'::jsonb),
  '{}'::jsonb,
  'hook aceita e-mail liberado, sem diferenciar maiúsculas'
);

-- -----------------------------------------------------------------------------
-- Visitante (anon)
-- -----------------------------------------------------------------------------
set local role anon;

select results_eq($$select count(*)::int from public.members$$, array[9],
  'visitante vê os membros');
select results_eq($$select count(*)::int from public.reports$$, array[1],
  'visitante vê só relatórios publicados');
select throws_ok($$select * from public.access_grants$$, '42501', null,
  'visitante não lê a lista de acessos');
select throws_ok($$select * from public.hr_records$$, '42501', null,
  'visitante não lê pontos/strikes');
select throws_ok($$select * from public.restricted_settings$$, '42501', null,
  'visitante não lê o link do Drive');
select throws_ok($$select * from public.calendars$$, '42501', null,
  'visitante não lê os calendários internos');
select throws_ok($$select * from public.documents$$, '42501', null,
  'visitante não lê a lista de documentos internos');
select lives_ok(
  $$insert into public.contact_messages (nome, email, mensagem) values ('Visitante', 'visitante@teste.local', 'Olá!')$$,
  'visitante envia mensagem de contato');
select throws_ok(
  $$insert into public.contact_messages (nome, email, mensagem, lida) values ('V', 'v@teste.local', 'x', true)$$,
  '42501', null, 'visitante não controla a coluna lida');
select throws_ok($$select * from public.contact_messages$$, '42501', null,
  'visitante não lê mensagens de contato');
select lives_ok(
  $$insert into public.alumni_submissions (nome, email, consentimento) values ('Ex-membro', 'ex@teste.local', true)$$,
  'visitante envia cadastro de alumni');
select throws_ok(
  $$insert into public.alumni_submissions (nome, email, consentimento, status) values ('Ex', 'ex2@teste.local', true, 'aprovado')$$,
  '42501', null, 'visitante não aprova o próprio cadastro de alumni');

-- -----------------------------------------------------------------------------
-- Membro comum
-- -----------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000005';

select results_eq($$select count(*)::int from public.restricted_settings$$, array[1],
  'membro lê as configurações restritas (Drive)');
select results_eq($$select count(*)::int from public.calendars$$, array[1],
  'membro lê os calendários');
select throws_ok(
  $$insert into public.calendars (nome, google_calendar_id) values ('Pessoal', 'pessoal@group.calendar.google.com')$$,
  '42501', null, 'membro não cadastra calendário');
select results_eq($$select count(*)::int from public.documents$$, array[1],
  'membro lê a lista de documentos');
select throws_ok(
  $$insert into public.documents (titulo, categoria, file_path) values ('Falso', 'auxiliar', 'x/falso.pdf')$$,
  '42501', null, 'membro não cadastra documento');
select results_eq($$select count(*)::int from public.reports$$, array[1],
  'membro não vê rascunhos de relatório');
select throws_ok(
  $$insert into public.hr_records (member_id, tipo, motivo, gestao)
    select id, 'ponto', 'autoatribuído', '2026.2' from public.members where slug = 'gustavo-kono'$$,
  '42501', null, 'membro não lança pontos');
select throws_ok(
  $$insert into public.posts (slug, titulo, categoria) values ('post-membro', 'Post', 'evento')$$,
  '42501', null, 'membro não publica posts');
select is_empty($$update public.nucleos set nome = 'X' returning id$$,
  'membro não edita núcleos');
select is_empty($$select * from public.access_grants$$,
  'membro não vê a lista de acessos');

-- -----------------------------------------------------------------------------
-- RH
-- -----------------------------------------------------------------------------
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000004';

select lives_ok(
  $$insert into public.hr_records (member_id, tipo, valor, motivo, gestao)
    select id, 'ponto', 2, 'Apresentação no SMF', '2026.2' from public.members where slug = 'gustavo-kono'$$,
  'RH lança ponto');
select lives_ok(
  $$insert into public.hr_records (member_id, tipo, motivo, gestao)
    select id, 'strike', 'Falta em reunião', '2026.2' from public.members where slug = 'julia-kasahara'$$,
  'RH lança strike');
select throws_ok(
  $$insert into public.hr_records (member_id, tipo, motivo, gestao, created_by)
    select id, 'ponto', 'x', '2026.2', 'a0000000-0000-0000-0000-000000000001' from public.members where slug = 'gustavo-kono'$$,
  '42501', null, 'RH não lança em nome de outra pessoa');
select results_eq($$select count(*)::int from public.hr_records$$, array[2],
  'RH vê o histórico de todos');
select is_empty($$update public.hr_records set valor = 50 returning id$$,
  'RH não altera lançamentos (só presidente/diretor_rh corrigem)');

set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000005';
select results_eq($$select tipo::text from public.hr_records$$, array['ponto'],
  'membro vê só os próprios pontos/strikes');

-- -----------------------------------------------------------------------------
-- Editor
-- -----------------------------------------------------------------------------
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000003';

select lives_ok(
  $$insert into public.posts (slug, titulo, categoria) values ('palestra-teste', 'Palestra teste', 'palestra')$$,
  'editor cria post');
select results_eq($$select count(*)::int from public.reports$$, array[7],
  'editor vê rascunhos de relatório');
select throws_ok(
  $$insert into public.history_sections (periodo, titulo) values ('2020', 'Fundação')$$,
  '42501', null, 'editor não edita Nossa História (conteúdo fixo)');
select is_empty($$update public.site_settings set ps_aberto = true returning id$$,
  'editor não abre o Processo Seletivo');
select is_empty($$select * from public.hr_records$$,
  'editor não vê pontos/strikes dos outros');

-- -----------------------------------------------------------------------------
-- Conta logada sem acesso
-- -----------------------------------------------------------------------------
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000006';

select is_empty($$select * from public.restricted_settings$$,
  'conta sem acesso não lê o Drive');
select is_empty($$select * from public.calendars$$,
  'conta sem acesso não lê os calendários');
select is_empty($$select * from public.documents$$,
  'conta sem acesso não lê a lista de documentos');
select is_empty($$select * from public.member_private$$,
  'conta sem acesso não lê contatos dos membros');
select throws_ok(
  $$insert into public.posts (slug, titulo, categoria) values ('post-estranho', 'Post', 'evento')$$,
  '42501', null, 'conta sem acesso não publica');

-- -----------------------------------------------------------------------------
-- Presidente
-- -----------------------------------------------------------------------------
set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';

select results_eq($$update public.site_settings set ps_aberto = true returning ps_aberto$$, array[true],
  'presidente abre o Processo Seletivo');
select lives_ok(
  $$update public.restricted_settings set drive_url = 'https://drive.google.com/drive/folders/teste'$$,
  'presidente edita o link do Drive');
select lives_ok(
  $$insert into public.calendars (nome, google_calendar_id, cor) values ('Diretoria', 'diretoria@group.calendar.google.com', '#3F0953')$$,
  'presidente cadastra calendário');
select lives_ok(
  $$insert into public.documents (titulo, categoria, file_path) values ('Regimento Interno', 'regimento', 'r/regimento.pdf')$$,
  'presidente cadastra documento');
select results_eq($$select count(*)::int from public.alumni_submissions$$, array[1],
  'presidente vê cadastros de alumni pendentes');
select results_eq($$select count(*)::int from public.contact_messages$$, array[1],
  'presidente lê mensagens de contato');
select results_eq($$update public.hr_records set valor = 3 where tipo = 'ponto' returning valor$$, array[3],
  'presidente corrige lançamento de RH');
select lives_ok($$delete from public.access_grants where email = 'membro@teste.local'$$,
  'presidente revoga acesso');

set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000005';
select is_empty($$select * from public.restricted_settings$$,
  'acesso revogado vale na próxima consulta');
select is_empty($$select * from public.hr_records$$,
  'acesso revogado deixa de ver os próprios lançamentos');

set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
select lives_ok($$delete from public.access_grants where email = 'diretor.rh@lmf.com'$$,
  'presidente remove o diretor de RH (ainda resta um admin)');
select throws_ok($$delete from public.access_grants where email = 'presidente@lmf.com'$$,
  'P0001', null, 'não dá para remover o último administrador');
select throws_ok($$update public.access_grants set role = 'membro' where email = 'presidente@lmf.com'$$,
  'P0001', null, 'não dá para rebaixar o último administrador');

-- -----------------------------------------------------------------------------
-- Storage
-- -----------------------------------------------------------------------------
reset role;
insert into storage.objects (bucket_id, name) values ('documentos', 'estatuto.pdf');
set local role authenticated;

set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000006';
select is_empty($$select * from storage.objects where bucket_id = 'documentos'$$,
  'conta sem acesso não baixa documentos internos');

set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
select results_eq($$select count(*)::int from storage.objects where bucket_id = 'documentos'$$, array[1],
  'presidente vê documentos internos');

set local request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000003';
select throws_ok($$insert into storage.objects (bucket_id, name) values ('fotos', 'membros/x.webp')$$,
  '42501', null, 'editor não troca foto de membro');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('fotos', 'posts/x.webp')$$,
  'editor envia foto de post');

set local role anon;
set local request.jwt.claim.sub = '';
select throws_ok($$insert into storage.objects (bucket_id, name) values ('envios', 'outra/x.jpg')$$,
  '42501', null, 'visitante só envia foto dentro de alumni/');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('envios', 'alumni/x.jpg')$$,
  'visitante envia foto do cadastro de alumni');

select * from finish();
rollback;
