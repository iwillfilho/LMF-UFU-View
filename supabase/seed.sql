-- =============================================================================
-- Seed de desenvolvimento local (roda em `supabase db reset`).
-- Não roda em produção: lá os dados entram pela Área Restrita.
--
-- Conteúdo migrado de legacy/index.html. Gestão atual assumida: 2026.2.
-- O repositório é público: não coloque aqui e-mails reais nem o link do Drive.
-- =============================================================================

-- --- Núcleos ----------------------------------------------------------------
insert into public.nucleos (slug, nome, area, descricao, ordem) values
  ('asset',  'Asset',  'Asset Management',
   'Alocação de ativos, gestão de portfólio e estratégias de investimento diversificadas.', 1),
  ('equity', 'Equity', 'Equity Research',
   'Análise setorial, empresarial, financeira e fundamentalista de empresas, valuation e elaboração de relatórios de investimento.', 2),
  ('quant',  'Quant',  'Análise Quantitativa',
   'Modelos quantitativos, análise de dados financeiros, machine learning e estratégias baseadas em algoritmos.', 3);

-- --- Diretorias -------------------------------------------------------------
insert into public.diretorias (slug, nome, ordem) values
  ('presidencia',       'Presidência',       1),
  ('vice-presidencia',  'Vice-Presidência',  2),
  ('academica',         'Acadêmica',         3),
  ('marketing',         'Marketing',         4),
  ('parcerias',         'Parcerias',         5),
  ('pesquisa',          'Pesquisa',          6),
  ('recursos-humanos',  'Recursos Humanos',  7);

-- --- Membros ----------------------------------------------------------------
insert into public.members (slug, nome, curso, status) values
  ('julia-kasahara',      'Júlia Kasahara',      null,                       'ativo'),
  ('arthur-leves',        'Arthur Leves',        null,                       'ativo'),
  ('arthur-pires',        'Arthur Pires',        null,                       'ativo'),
  ('danilo-abbade-diniz', 'Danilo Abbade Diniz', null,                       'ativo'),
  ('geovani-faria',       'Geovani Faria',       null,                       'ativo'),
  ('iolanda-andrade',     'Iolanda Andrade',     null,                       'ativo'),
  ('joao-vitor-segato',   'João Vitor Segato',   null,                       'ativo'),
  ('gabriel-alvaro',      'Gabriel Álvaro',      'Engenharia de Computação', 'ativo'),
  ('gustavo-kono',        'Gustavo Kono',        'Engenharia de Computação', 'ativo');

-- --- Cargos da gestão 2026.2 ------------------------------------------------
insert into public.member_terms (member_id, gestao, cargo, diretoria_id, nucleo_id, ordem)
select m.id, '2026.2', t.cargo, d.id, n.id, t.ordem
from (values
  ('julia-kasahara',      'Presidente',      'presidencia',      null,     1),
  ('arthur-leves',        'Vice-presidente', 'vice-presidencia', null,     2),
  ('arthur-pires',        'Diretor(a)',      'pesquisa',         'quant',  3),
  ('danilo-abbade-diniz', 'Diretor(a)',      'academica',        'quant',  4),
  ('geovani-faria',       'Diretor(a)',      'parcerias',        'equity', 5),
  ('iolanda-andrade',     'Diretor(a)',      'recursos-humanos', 'quant',  6),
  ('joao-vitor-segato',   'Diretor(a)',      'marketing',        'asset',  7),
  ('gabriel-alvaro',      'Membro efetivo',  'marketing',        'quant',  8),
  ('gustavo-kono',        'Membro efetivo',  'pesquisa',         'quant',  9)
) as t(member_slug, cargo, diretoria_slug, nucleo_slug, ordem)
join public.members m on m.slug = t.member_slug
left join public.diretorias d on d.slug = t.diretoria_slug
left join public.nucleos n on n.slug = t.nucleo_slug;

-- --- Parceiros institucionais (rodapé) --------------------------------------
insert into public.partners (nome, url, institucional, ordem) values
  ('TradingView', 'https://br.tradingview.com',           true, 1),
  ('Bullseye',    'https://www.bullseye.com.br',          true, 2),
  ('Ghia XP',     'https://www.ghiainvestimentos.com.br', true, 3),
  ('Safra',       'https://www.safra.com.br',             true, 4);

-- --- Relatórios -------------------------------------------------------------
-- Só o INTB3 tem PDF. Os demais entram como rascunho até o PDF definitivo
-- ser enviado pela Área Restrita (o site antigo apontava todos para o INTB3).
insert into public.reports (slug, titulo, resumo, tipo, nucleo_id, setor, ticker, pdf_path, publicado, publicado_em)
select r.slug, r.titulo, r.resumo, r.tipo::public.report_tipo, n.id, r.setor, r.ticker, r.pdf_path, r.publicado,
       case when r.publicado then '2025-06-01 12:00-03'::timestamptz end
from (values
  ('intb3', 'INTB3', 'Valuation e análise do domínio de mercado da Intelbras em segurança eletrônica.',
   'iniciacao', 'equity', 'Tech', 'INTB3', 'intelbras-relatorio-valuation.pdf', true),
  ('abev3', 'ABEV3', 'Resiliência de margens e o desafio da Ambev no segmento premium.',
   'iniciacao', 'equity', 'Consumo', 'ABEV3', null, false),
  ('smft3', 'SMFT3', 'Expansão na América Latina e o modelo de recorrência da Smart Fit.',
   'iniciacao', 'equity', 'Saúde/Lazer', 'SMFT3', null, false),
  ('tfco4', 'TFCO4', 'Track & Field: consolidação de marca e o poder do ecossistema wellness.',
   'iniciacao', 'equity', 'Varejo', 'TFCO4', null, false),
  ('alocacao-tatica-pos-copom', 'Alocação Tática Pós-Copom',
   'Como estruturar uma carteira balanceada frente aos cortes da Selic, equilibrando NTN-Bs e fundos multimercado.',
   'tese', 'asset', null, null, null, false),
  ('setor-eletrico-geracao-vs-transmissao', 'Setor Elétrico: Geração vs Transmissão',
   'Um estudo sobre alocação de capital em tempos de crise hídrica e os múltiplos do setor elétrico brasileiro.',
   'tese', 'equity', 'Elétrico', null, null, false),
  ('estrategias-de-long-short', 'Estratégias de Long & Short',
   'Aplicação de cointegração para identificar pares no setor de commodities metálicas.',
   'tese', 'quant', null, null, null, false)
) as r(slug, titulo, resumo, tipo, nucleo_slug, setor, ticker, pdf_path, publicado)
join public.nucleos n on n.slug = r.nucleo_slug;

-- --- Calendários da Área Restrita -----------------------------------------
-- Exemplo público (feriados nacionais do Google). Os calendários reais da LMF
-- são cadastrados pela Área Restrita.
insert into public.calendars (nome, google_calendar_id, cor, ordem) values
  ('Feriados nacionais (exemplo)', 'pt-br.brazilian#holiday@group.v.calendar.google.com', '#C455ED', 0);

-- --- Acessos iniciais (e-mails genéricos de exemplo) ------------------------
-- Troque pelos e-mails Google reais antes de usar fora do ambiente local.
insert into public.access_grants (email, role, member_id, granted_by)
select g.email, g.role::public.app_role, m.id, null
from (values
  ('presidente@lmf.com', 'presidente', 'julia-kasahara'),
  ('diretor.rh@lmf.com', 'diretor_rh', 'iolanda-andrade')
) as g(email, role, member_slug)
join public.members m on m.slug = g.member_slug;
