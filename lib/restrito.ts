import "server-only";

import { exigirPapel } from "@/lib/auth";
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
  const { data, error } = await supabase.from("members").select("id, nome, status").order("nome");
  if (error) falha("members", error);
  return data.map((m) => ({ id: m.id, nome: m.nome, detalhe: m.status === "alumni" ? "Alumni" : undefined }));
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

/** Membros ativos e alumni, para escolher em quem lançar. */
export async function getMembrosRH(): Promise<MembroRH[]> {
  await exigirPapel(RH);
  const supabase = await createClient();
  const { data, error } = await supabase.from("members").select("id, nome, status").order("nome");
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
