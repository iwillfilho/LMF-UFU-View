import "server-only";

import { exigirPapel } from "@/lib/auth";
import { compararGestao, gestaoDe } from "@/lib/format";
import { ADMIN, PAPEIS, type Papel, PUBLICA, RH, TODOS } from "@/lib/papeis";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/**
 * Leituras da Área Restrita. Cada função confere o papel antes de consultar
 * (mesmo que a página já confira) e usa a sessão da pessoa, então a RLS
 * também se aplica. Nada aqui usa 'use cache'.
 */

function falha(contexto: string, error: { message: string }): never {
  throw new Error(`Supabase (${contexto}): ${error.message}`);
}

// =============================================================================
// Calendário
// =============================================================================
export type Calendario = { id: string; nome: string; googleId: string; cor: string };

export async function getCalendarios(): Promise<Calendario[]> {
  await exigirPapel(TODOS);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendars")
    .select("id, nome, google_calendar_id, cor")
    .order("ordem")
    .order("nome");
  if (error) falha("calendars", error);
  return data.map((c) => ({ id: c.id, nome: c.nome, googleId: c.google_calendar_id, cor: c.cor }));
}

// =============================================================================
// Publicações (posts e relatórios, inclusive rascunhos)
// =============================================================================
export type PostLista = {
  id: string;
  slug: string;
  titulo: string;
  categoria: Enums<"post_categoria">;
  publicado: boolean;
  dataEvento: string | null;
  atualizadoEm: string;
};

export async function getPostsEditor(): Promise<PostLista[]> {
  await exigirPapel(PUBLICA);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, titulo, categoria, publicado, data_evento, updated_at")
    .order("updated_at", { ascending: false });
  if (error) falha("posts", error);
  return data.map((p) => ({
    id: p.id,
    slug: p.slug,
    titulo: p.titulo,
    categoria: p.categoria,
    publicado: p.publicado,
    dataEvento: p.data_evento,
    atualizadoEm: p.updated_at,
  }));
}

export type PostEditor = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  categoria: Enums<"post_categoria">;
  corpo: unknown;
  capaPath: string | null;
  galeria: string[];
  dataEvento: string | null;
  local: string;
  publicado: boolean;
};

export async function getPostEditor(id: string): Promise<PostEditor | null> {
  await exigirPapel(PUBLICA);
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, titulo, resumo, categoria, corpo, capa_path, galeria, data_evento, local, publicado")
    .eq("id", id)
    .maybeSingle();
  if (error) falha("posts", error);
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    titulo: data.titulo,
    resumo: data.resumo ?? "",
    categoria: data.categoria,
    corpo: data.corpo,
    capaPath: data.capa_path,
    galeria: data.galeria,
    dataEvento: data.data_evento,
    local: data.local ?? "",
    publicado: data.publicado,
  };
}

export type RelatorioLista = {
  id: string;
  slug: string;
  titulo: string;
  tipo: Enums<"report_tipo">;
  nucleo: string | null;
  publicado: boolean;
  temPdf: boolean;
  atualizadoEm: string;
};

export async function getRelatoriosEditor(): Promise<RelatorioLista[]> {
  await exigirPapel(PUBLICA);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, slug, titulo, tipo, publicado, pdf_path, updated_at, nucleos(nome)")
    .order("updated_at", { ascending: false });
  if (error) falha("reports", error);
  return data.map((r) => ({
    id: r.id,
    slug: r.slug,
    titulo: r.titulo,
    tipo: r.tipo,
    nucleo: r.nucleos?.nome ?? null,
    publicado: r.publicado,
    temPdf: Boolean(r.pdf_path),
    atualizadoEm: r.updated_at,
  }));
}

export type RelatorioEditor = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  tipo: Enums<"report_tipo">;
  nucleoId: string | null;
  setor: string;
  ticker: string;
  pdfPath: string | null;
  publicado: boolean;
  autores: string[];
};

export async function getRelatorioEditor(id: string): Promise<RelatorioEditor | null> {
  await exigirPapel(PUBLICA);
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, slug, titulo, resumo, tipo, nucleo_id, setor, ticker, pdf_path, publicado, report_authors(member_id, ordem)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) falha("reports", error);
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    titulo: data.titulo,
    resumo: data.resumo ?? "",
    tipo: data.tipo,
    nucleoId: data.nucleo_id,
    setor: data.setor ?? "",
    ticker: data.ticker ?? "",
    pdfPath: data.pdf_path,
    publicado: data.publicado,
    autores: [...data.report_authors].sort((a, b) => a.ordem - b.ordem).map((a) => a.member_id),
  };
}

export type Opcao = { id: string; nome: string; detalhe?: string };

/** Membros (ativos e alumni) para escolher autores de relatório. */
export async function getMembrosOpcoes(): Promise<Opcao[]> {
  await exigirPapel(PUBLICA);
  const supabase = await createClient();
  const { data, error } = await supabase.from("members").select("id, nome, status, anonimizado").order("nome");
  if (error) falha("members", error);
  // Anonimizados ficam na lista para não sumirem dos relatórios em que já são autores.
  return data.map((m) => ({
    id: m.id,
    nome: m.nome,
    detalhe: m.anonimizado ? "Anonimizado" : m.status === "alumni" ? "Alumni" : undefined,
  }));
}

export async function getNucleosOpcoes(): Promise<Opcao[]> {
  await exigirPapel(PUBLICA);
  const supabase = await createClient();
  const { data, error } = await supabase.from("nucleos").select("id, nome").order("ordem");
  if (error) falha("nucleos", error);
  return data.map((n) => ({ id: n.id, nome: n.nome }));
}

// =============================================================================
// Documentos e link do Drive (membros leem; admin gerencia)
// =============================================================================
export type Documento = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: Enums<"document_categoria">;
  ordem: number;
  atualizadoEm: string;
};

export async function getDocumentos(): Promise<Documento[]> {
  await exigirPapel(TODOS);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, titulo, descricao, categoria, ordem, updated_at")
    .order("categoria")
    .order("ordem")
    .order("titulo");
  if (error) falha("documents", error);
  return data.map((d) => ({
    id: d.id,
    titulo: d.titulo,
    descricao: d.descricao ?? "",
    categoria: d.categoria,
    ordem: d.ordem,
    atualizadoEm: d.updated_at,
  }));
}

/** Link do Google Drive da LMF. Só existe no banco (restricted_settings), nunca no repositório. */
export async function getDriveUrl(): Promise<string | null> {
  await exigirPapel(TODOS);
  const supabase = await createClient();
  const { data, error } = await supabase.from("restricted_settings").select("drive_url").maybeSingle();
  if (error) falha("restricted_settings", error);
  return data?.drive_url ?? null;
}

// =============================================================================
// RH: pontos e strikes
// =============================================================================
export type RegistroRH = {
  id: string;
  membroId: string;
  tipo: Enums<"hr_tipo">;
  valor: number;
  motivo: string;
  gestao: string;
  criadoEm: string;
  /** Nome de quem lançou, quando a conta está ligada a um cadastro de membro. */
  autor: string | null;
};

const COLUNAS_REGISTRO = "id, member_id, tipo, valor, motivo, gestao, created_at, created_by";

type LinhaRegistro = {
  id: string;
  member_id: string;
  tipo: Enums<"hr_tipo">;
  valor: number;
  motivo: string;
  gestao: string;
  created_at: string;
  created_by: string | null;
};

function paraRegistro(r: LinhaRegistro, autores: Map<string, string>): RegistroRH {
  return {
    id: r.id,
    membroId: r.member_id,
    tipo: r.tipo,
    valor: r.valor,
    motivo: r.motivo,
    gestao: r.gestao,
    criadoEm: r.created_at,
    autor: r.created_by ? (autores.get(r.created_by) ?? null) : null,
  };
}

/**
 * Lançamentos do próprio membro. Filtra pelo cadastro ligado à conta: a RLS
 * deixaria o RH ver os de todo mundo, e aqui é só "os meus".
 */
export async function getMeusPontos(): Promise<{ membro: string | null; registros: RegistroRH[] }> {
  const sessao = await exigirPapel(TODOS);
  const supabase = await createClient();
  const { data: vinculo, error: erroVinculo } = await supabase
    .from("member_private")
    .select("member_id, members(nome)")
    .eq("user_id", sessao.userId)
    .maybeSingle();
  if (erroVinculo) falha("member_private", erroVinculo);
  if (!vinculo) return { membro: null, registros: [] };

  const { data, error } = await supabase
    .from("hr_records")
    .select(COLUNAS_REGISTRO)
    .eq("member_id", vinculo.member_id)
    .order("created_at", { ascending: false });
  if (error) falha("hr_records", error);
  return { membro: vinculo.members?.nome ?? null, registros: data.map((r) => paraRegistro(r, new Map())) };
}

/** Todos os lançamentos, com o nome de quem lançou. */
export async function getRegistrosRH(): Promise<RegistroRH[]> {
  await exigirPapel(RH);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hr_records")
    .select(COLUNAS_REGISTRO)
    .order("created_at", { ascending: false });
  if (error) falha("hr_records", error);

  const ids = [...new Set(data.flatMap((r) => (r.created_by ? [r.created_by] : [])))];
  const autores = new Map<string, string>();
  if (ids.length > 0) {
    const { data: contas, error: erroContas } = await supabase
      .from("member_private")
      .select("user_id, members(nome)")
      .in("user_id", ids);
    if (erroContas) falha("member_private", erroContas);
    for (const c of contas) if (c.user_id && c.members) autores.set(c.user_id, c.members.nome);
  }
  return data.map((r) => paraRegistro(r, autores));
}

export type MembroRH = { id: string; nome: string; alumni: boolean };

/** Membros ativos e alumni (sem os anonimizados), para escolher em quem lançar ou a quem ligar um acesso. */
export async function getMembrosRH(): Promise<MembroRH[]> {
  await exigirPapel(RH);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, nome, status")
    .eq("anonimizado", false)
    .order("nome");
  if (error) falha("members", error);
  return data.map((m) => ({ id: m.id, nome: m.nome, alumni: m.status === "alumni" }));
}

// =============================================================================
// Acessos (só Presidente e Diretor de RH)
// =============================================================================
export type PessoaComAcesso = {
  email: string;
  /** Cadastro de membro ligado a este e-mail (o mesmo em todos os papéis). */
  membroId: string | null;
  membro: string | null;
  papeis: { grantId: string; papel: Papel }[];
  /** Já entrou ao menos uma vez com o Google (a conta existe e recebeu os papéis). */
  entrou: boolean;
};

/** access_grants agrupado por e-mail, com os papéis na ordem de PAPEIS. */
export async function getAcessos(): Promise<PessoaComAcesso[]> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const [grants, roles] = await Promise.all([
    supabase.from("access_grants").select("id, email, role, member_id, members(nome)"),
    supabase.from("user_roles").select("grant_id"),
  ]);
  if (grants.error) falha("access_grants", grants.error);
  if (roles.error) falha("user_roles", roles.error);

  const usados = new Set(roles.data.map((r) => r.grant_id));
  const pessoas = new Map<string, PessoaComAcesso>();
  for (const g of grants.data) {
    const p = pessoas.get(g.email) ?? { email: g.email, membroId: null, membro: null, papeis: [], entrou: false };
    p.papeis.push({ grantId: g.id, papel: g.role });
    if (g.member_id && !p.membroId) {
      p.membroId = g.member_id;
      p.membro = g.members?.nome ?? null;
    }
    if (usados.has(g.id)) p.entrou = true;
    pessoas.set(g.email, p);
  }

  const ordem = (papel: Papel) => PAPEIS.indexOf(papel);
  return [...pessoas.values()]
    .map((p) => ({ ...p, papeis: p.papeis.sort((a, b) => ordem(a.papel) - ordem(b.papel)) }))
    .sort((a, b) => (a.membro ?? a.email).localeCompare(b.membro ?? b.email, "pt-BR"));
}

// =============================================================================
// Membros (só Presidente e Diretor de RH)
// =============================================================================
export type CargoAdmin = {
  id: string;
  gestao: string;
  cargo: string;
  diretoriaId: string | null;
  nucleoId: string | null;
  diretoria: string | null;
  nucleo: string | null;
  ordem: number;
};

export type MembroAdmin = {
  id: string;
  slug: string;
  nome: string;
  curso: string | null;
  status: Enums<"member_status">;
  anonimizado: boolean;
  fotoPath: string | null;
  gestaoTrainee: string | null;
  linkedin: string | null;
  email: string | null;
  telefone: string | null;
  /** A conta Google já entrou e está ligada a este cadastro. */
  temConta: boolean;
  /** E-mail e papéis liberados para este cadastro (Acessos). */
  acessoEmail: string | null;
  papeis: Papel[];
  /** Da gestão mais recente para a mais antiga. */
  cargos: CargoAdmin[];
  atual: CargoAdmin | null;
  relatorios: number;
};

const COLUNAS_MEMBRO_ADMIN = `id, slug, nome, curso, status, anonimizado, foto_path, gestao_trainee, linkedin,
  member_private(email_contato, telefone, user_id),
  access_grants(email, role),
  report_authors(report_id),
  member_terms(id, gestao, cargo, ordem, diretoria_id, nucleo_id, diretorias(nome), nucleos(nome))`;

type LinhaMembroAdmin = {
  id: string;
  slug: string;
  nome: string;
  curso: string | null;
  status: Enums<"member_status">;
  anonimizado: boolean;
  foto_path: string | null;
  gestao_trainee: string | null;
  linkedin: string | null;
  member_private: { email_contato: string | null; telefone: string | null; user_id: string | null } | null;
  access_grants: { email: string; role: Papel }[];
  report_authors: { report_id: string }[];
  member_terms: {
    id: string;
    gestao: string;
    cargo: string;
    ordem: number;
    diretoria_id: string | null;
    nucleo_id: string | null;
    diretorias: { nome: string } | null;
    nucleos: { nome: string } | null;
  }[];
};

function paraMembroAdmin(m: LinhaMembroAdmin): MembroAdmin {
  const cargos = [...m.member_terms]
    .sort((a, b) => compararGestao(b.gestao, a.gestao) || a.ordem - b.ordem)
    .map((t) => ({
      id: t.id,
      gestao: t.gestao,
      cargo: t.cargo,
      diretoriaId: t.diretoria_id,
      nucleoId: t.nucleo_id,
      diretoria: t.diretorias?.nome ?? null,
      nucleo: t.nucleos?.nome ?? null,
      ordem: t.ordem,
    }));
  return {
    id: m.id,
    slug: m.slug,
    nome: m.nome,
    curso: m.curso,
    status: m.status,
    anonimizado: m.anonimizado,
    fotoPath: m.foto_path,
    gestaoTrainee: m.gestao_trainee,
    linkedin: m.linkedin,
    email: m.member_private?.email_contato ?? null,
    telefone: m.member_private?.telefone ?? null,
    temConta: Boolean(m.member_private?.user_id),
    acessoEmail: m.access_grants[0]?.email ?? null,
    papeis: PAPEIS.filter((p) => m.access_grants.some((g) => g.role === p)),
    cargos,
    atual: cargos[0] ?? null,
    relatorios: m.report_authors.length,
  };
}

export async function getMembrosAdmin(): Promise<MembroAdmin[]> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const { data, error } = await supabase.from("members").select(COLUNAS_MEMBRO_ADMIN).order("nome");
  if (error) falha("members", error);
  return data.map(paraMembroAdmin);
}

export async function getMembroAdmin(id: string): Promise<MembroAdmin | null> {
  await exigirPapel(ADMIN);
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("members").select(COLUNAS_MEMBRO_ADMIN).eq("id", id).maybeSingle();
  if (error) falha("members", error);
  return data ? paraMembroAdmin(data) : null;
}

export async function getDiretoriasOpcoes(): Promise<Opcao[]> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const { data, error } = await supabase.from("diretorias").select("id, nome").order("ordem");
  if (error) falha("diretorias", error);
  return data.map((d) => ({ id: d.id, nome: d.nome }));
}

// =============================================================================
// Cadastros de alumni enviados pelo formulário público
// =============================================================================
export type EnvioAlumni = {
  id: string;
  nome: string;
  curso: string | null;
  email: string;
  linkedin: string | null;
  gestaoTrainee: string | null;
  gestoes: string | null;
  cargos: string | null;
  mensagem: string | null;
  /** URL assinada (15 min) da foto no bucket privado `envios`. */
  fotoUrl: string | null;
  criadoEm: string;
};

export async function getEnviosPendentes(): Promise<EnvioAlumni[]> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alumni_submissions")
    .select("id, nome, curso, email, linkedin, gestao_trainee, gestoes, cargos, mensagem, foto_path, created_at")
    .eq("status", "pendente")
    .order("created_at");
  if (error) falha("alumni_submissions", error);

  const paths = data.flatMap((e) => (e.foto_path ? [e.foto_path] : []));
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const { data: assinadas, error: erroAssinar } = await supabase.storage
      .from("envios")
      .createSignedUrls(paths, 15 * 60);
    if (erroAssinar) console.error("assinar fotos de alumni", erroAssinar);
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls.set(a.path, a.signedUrl);
  }

  return data.map((e) => ({
    id: e.id,
    nome: e.nome,
    curso: e.curso,
    email: e.email,
    linkedin: e.linkedin,
    gestaoTrainee: e.gestao_trainee,
    gestoes: e.gestoes,
    cargos: e.cargos,
    mensagem: e.mensagem,
    fotoUrl: e.foto_path ? (urls.get(e.foto_path) ?? null) : null,
    criadoEm: e.created_at,
  }));
}

/** Só a contagem, para o aviso na lista de membros. */
export async function contarEnviosPendentes(): Promise<number> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("alumni_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendente");
  if (error) falha("alumni_submissions", error);
  return count ?? 0;
}

/** Nomes de cargo já usados, para sugerir no formulário (evita "Diretor" e "Diretor(a)" misturados). */
export async function getCargosUsados(): Promise<string[]> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const { data, error } = await supabase.from("member_terms").select("cargo");
  if (error) falha("member_terms", error);
  return [...new Set(data.map((t) => t.cargo))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Gestão mais recente com cargo cadastrado (a "gestão atual" do site), ou a do calendário. */
export async function getGestaoAtual(): Promise<string> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const { data, error } = await supabase.from("member_terms").select("gestao");
  if (error) falha("member_terms", error);
  const calendario = gestaoDe(new Date());
  return [calendario, ...data.map((t) => t.gestao)].sort(compararGestao).at(-1) ?? calendario;
}

// =============================================================================
// Conteúdo fixo (só Presidente e Diretor de RH)
// =============================================================================
export type NucleoAdmin = {
  id: string;
  slug: string;
  nome: string;
  area: string;
  descricao: string;
  bannerPath: string | null;
  parceiros: string[];
  relatorios: number;
  cargos: number;
};

export async function getNucleosAdmin(): Promise<NucleoAdmin[]> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nucleos")
    .select("id, slug, nome, area, descricao, banner_path, nucleo_partners(partner_id, ordem), reports(count), member_terms(count)")
    .order("ordem")
    .order("nome");
  if (error) falha("nucleos", error);
  return data.map((n) => ({
    id: n.id,
    slug: n.slug,
    nome: n.nome,
    area: n.area ?? "",
    descricao: n.descricao ?? "",
    bannerPath: n.banner_path,
    parceiros: [...n.nucleo_partners].sort((a, b) => a.ordem - b.ordem).map((p) => p.partner_id),
    relatorios: n.reports[0]?.count ?? 0,
    cargos: n.member_terms[0]?.count ?? 0,
  }));
}

export type DiretoriaAdmin = { id: string; slug: string; nome: string; cargos: number };

export async function getDiretoriasAdmin(): Promise<DiretoriaAdmin[]> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diretorias")
    .select("id, slug, nome, member_terms(count)")
    .order("ordem")
    .order("nome");
  if (error) falha("diretorias", error);
  return data.map((d) => ({ id: d.id, slug: d.slug, nome: d.nome, cargos: d.member_terms[0]?.count ?? 0 }));
}

export type ParceiroAdmin = {
  id: string;
  nome: string;
  url: string;
  logoPath: string | null;
  institucional: boolean;
  nucleos: string[];
};

export async function getParceirosAdmin(): Promise<ParceiroAdmin[]> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .select("id, nome, url, logo_path, institucional, nucleo_partners(nucleo_id)")
    .order("ordem")
    .order("nome");
  if (error) falha("partners", error);
  return data.map((p) => ({
    id: p.id,
    nome: p.nome,
    url: p.url ?? "",
    logoPath: p.logo_path,
    institucional: p.institucional,
    nucleos: p.nucleo_partners.map((n) => n.nucleo_id),
  }));
}

export type SecaoHistoriaAdmin = {
  id: string;
  periodo: string;
  titulo: string;
  texto: string;
  fotos: string[];
  conquistas: string[];
};

export async function getHistoriaAdmin(): Promise<SecaoHistoriaAdmin[]> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("history_sections")
    .select("id, periodo, titulo, texto, fotos, conquistas")
    .order("ordem")
    .order("created_at");
  if (error) falha("history_sections", error);
  return data.map((s) => ({ ...s, texto: s.texto ?? "" }));
}

export type EtapaPS = { id: string; titulo: string; descricao: string };

export async function getEtapasAdmin(): Promise<EtapaPS[]> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ps_steps")
    .select("id, titulo, descricao")
    .order("ordem")
    .order("created_at");
  if (error) falha("ps_steps", error);
  return data.map((e) => ({ ...e, descricao: e.descricao ?? "" }));
}

/** Contagens para a página inicial da aba Conteúdo. */
export async function getResumoConteudo() {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const contar = async (tabela: "nucleos" | "diretorias" | "partners" | "history_sections" | "ps_steps" | "calendars") => {
    const { count, error } = await supabase.from(tabela).select("id", { count: "exact", head: true });
    if (error) falha(tabela, error);
    return count ?? 0;
  };
  const [nucleos, diretorias, parceiros, historia, etapas, calendarios] = await Promise.all([
    contar("nucleos"),
    contar("diretorias"),
    contar("partners"),
    contar("history_sections"),
    contar("ps_steps"),
    contar("calendars"),
  ]);
  return { nucleos, diretorias, parceiros, historia, etapas, calendarios };
}
