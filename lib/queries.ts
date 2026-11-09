import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { compararGestao, intervaloGestoes } from "@/lib/format";
import { BANNER_PADRAO, FOTO_PADRAO, publicUrl } from "@/lib/storage";
import type { Enums } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Leituras das páginas públicas. Todas rodam com o papel `anon` (só o que
 * está publicado) e ficam em cache com uma tag por tabela. Na Fase 4, cada
 * Server Action da Área Restrita chama updateTag(<tag>) depois de salvar.
 */
export const TAGS = {
  settings: "site_settings",
  nucleos: "nucleos",
  members: "members",
  reports: "reports",
  posts: "posts",
  partners: "partners",
  history: "history_sections",
  psSteps: "ps_steps",
} as const;

function falha(contexto: string, error: { message: string }): never {
  throw new Error(`Supabase (${contexto}): ${error.message}`);
}

// =============================================================================
// Configurações
// =============================================================================
export type SiteSettings = { psAberto: boolean; editalUrl: string | null; formsUrl: string | null };

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("conteudo");
  cacheTag(TAGS.settings);

  const { data, error } = await createPublicClient()
    .from("site_settings")
    .select("ps_aberto, edital_pdf_path, forms_url")
    .maybeSingle();
  if (error) falha("site_settings", error);
  return {
    psAberto: data?.ps_aberto ?? false,
    editalUrl: publicUrl("site", data?.edital_pdf_path),
    formsUrl: data?.forms_url ?? null,
  };
}

// =============================================================================
// Parceiros e núcleos
// =============================================================================
export type Parceiro = { id: string; nome: string; url: string | null; logoUrl: string | null };

export async function getParceirosInstitucionais(): Promise<Parceiro[]> {
  "use cache";
  cacheLife("conteudo");
  cacheTag(TAGS.partners);

  const { data, error } = await createPublicClient()
    .from("partners")
    .select("id, nome, url, logo_path")
    .eq("institucional", true)
    .order("ordem");
  if (error) falha("partners", error);
  return data.map((p) => ({ id: p.id, nome: p.nome, url: p.url, logoUrl: publicUrl("site", p.logo_path) }));
}

export type Nucleo = {
  id: string;
  slug: string;
  nome: string;
  area: string | null;
  descricao: string | null;
  bannerUrl: string;
  parceiros: Parceiro[];
};

export async function getNucleos(): Promise<Nucleo[]> {
  "use cache";
  cacheLife("conteudo");
  cacheTag(TAGS.nucleos, TAGS.partners);

  const { data, error } = await createPublicClient()
    .from("nucleos")
    .select("id, slug, nome, area, descricao, banner_path, nucleo_partners(partners(id, nome, url, logo_path, ordem))")
    .order("ordem");
  if (error) falha("nucleos", error);

  return data.map((n) => ({
    id: n.id,
    slug: n.slug,
    nome: n.nome,
    area: n.area,
    descricao: n.descricao,
    bannerUrl: publicUrl("site", n.banner_path) ?? BANNER_PADRAO,
    // A ordem dos parceiros é a da lista geral (Área Restrita → Conteúdo → Parceiros).
    parceiros: n.nucleo_partners
      .flatMap(({ partners: p }) => (p ? [p] : []))
      .sort((a, b) => a.ordem - b.ordem)
      .map((p) => ({ id: p.id, nome: p.nome, url: p.url, logoUrl: publicUrl("site", p.logo_path) })),
  }));
}

// =============================================================================
// Diretorias (organograma)
// =============================================================================
export type Diretoria = { slug: string; nome: string };

export async function getDiretorias(): Promise<Diretoria[]> {
  "use cache";
  cacheLife("conteudo");
  cacheTag(TAGS.members);

  const { data, error } = await createPublicClient().from("diretorias").select("slug, nome").order("ordem");
  if (error) falha("diretorias", error);
  return data;
}

// =============================================================================
// Membros (ativos e alumni)
// =============================================================================
export type Cargo = {
  gestao: string;
  cargo: string;
  diretoria: string | null;
  diretoriaSlug: string | null;
  nucleo: string | null;
  nucleoSlug: string | null;
};

export type Membro = {
  slug: string;
  nome: string;
  curso: string | null;
  fotoUrl: string;
  temFoto: boolean;
  status: Enums<"member_status">;
  gestaoTrainee: string | null;
  linkedin: string | null;
  /** Todos os cargos, da gestão mais recente para a mais antiga. */
  cargos: Cargo[];
  /** "2025.1 – 2026.2": gestões como membro efetivo (exclui trainee). */
  gestoesEfetivo: string | null;
  /** Cargo na gestão mais recente em que a pessoa aparece. */
  atual: Cargo | null;
  relatorios: number;
};

export type Equipe = { gestaoAtual: string | null; membros: Membro[] };

export async function getEquipe(): Promise<Equipe> {
  "use cache";
  cacheLife("conteudo");
  cacheTag(TAGS.members, TAGS.reports, TAGS.nucleos);

  const { data, error } = await createPublicClient()
    .from("members")
    .select(
      `slug, nome, curso, foto_path, status, gestao_trainee, linkedin,
       member_terms(gestao, cargo, ordem, diretorias(slug, nome), nucleos(slug, nome)),
       report_authors(report_id)`,
    )
    // Anonimizados (LGPD) só aparecem como autor de relatório, nunca nas listas.
    .eq("anonimizado", false)
    .order("nome");
  if (error) falha("members", error);

  const gestaoAtual =
    data.flatMap((m) => m.member_terms.map((t) => t.gestao)).sort(compararGestao).at(-1) ?? null;

  const membros = data.map((m): Membro => {
    const cargos = [...m.member_terms]
      .sort((a, b) => compararGestao(b.gestao, a.gestao) || a.ordem - b.ordem)
      .map((t) => ({
        gestao: t.gestao,
        cargo: t.cargo,
        diretoria: t.diretorias?.nome ?? null,
        diretoriaSlug: t.diretorias?.slug ?? null,
        nucleo: t.nucleos?.nome ?? null,
        nucleoSlug: t.nucleos?.slug ?? null,
      }));
    const foto = publicUrl("fotos", m.foto_path);
    return {
      slug: m.slug,
      nome: m.nome,
      curso: m.curso,
      fotoUrl: foto ?? FOTO_PADRAO,
      temFoto: foto !== null,
      status: m.status,
      gestaoTrainee: m.gestao_trainee,
      linkedin: m.linkedin,
      cargos,
      gestoesEfetivo: intervaloGestoes(cargos.filter((c) => !/trainee/i.test(c.cargo)).map((c) => c.gestao)),
      atual: cargos[0] ?? null,
      // A RLS de report_authors só devolve autorias de relatórios publicados.
      relatorios: m.report_authors.length,
    };
  });

  return { gestaoAtual, membros };
}

// =============================================================================
// Relatórios
// =============================================================================
export type Relatorio = {
  slug: string;
  titulo: string;
  resumo: string | null;
  tipo: Enums<"report_tipo">;
  nucleo: { slug: string; nome: string } | null;
  setor: string | null;
  ticker: string | null;
  pdfUrl: string | null;
  publicadoEm: string | null;
  /** anonimo: cadastro anonimizado (LGPD), mostrado sem link para o currículo. */
  autores: { slug: string; nome: string; anonimo: boolean }[];
};

export async function getRelatorios(): Promise<Relatorio[]> {
  "use cache";
  cacheLife("conteudo");
  cacheTag(TAGS.reports, TAGS.members, TAGS.nucleos);

  const { data, error } = await createPublicClient()
    .from("reports")
    .select(
      `slug, titulo, resumo, tipo, setor, ticker, pdf_path, publicado_em,
       nucleos(slug, nome),
       report_authors(ordem, members(slug, nome, anonimizado))`,
    )
    .eq("publicado", true)
    .order("publicado_em", { ascending: false });
  if (error) falha("reports", error);

  return data.map((r) => ({
    slug: r.slug,
    titulo: r.titulo,
    resumo: r.resumo,
    tipo: r.tipo,
    nucleo: r.nucleos ? { slug: r.nucleos.slug, nome: r.nucleos.nome } : null,
    setor: r.setor,
    ticker: r.ticker,
    pdfUrl: publicUrl("relatorios", r.pdf_path),
    publicadoEm: r.publicado_em,
    autores: [...r.report_authors]
      .sort((a, b) => a.ordem - b.ordem)
      .flatMap(({ members: m }) => (m ? [{ slug: m.slug, nome: m.nome, anonimo: m.anonimizado }] : [])),
  }));
}

// =============================================================================
// Publicações (eventos, palestras, viagens, SMF, competições)
// =============================================================================
export type Categoria = Enums<"post_categoria">;

export type PostResumo = {
  slug: string;
  titulo: string;
  resumo: string | null;
  categoria: Categoria;
  capaUrl: string | null;
  dataEvento: string | null;
  local: string | null;
  publicadoEm: string | null;
};

export type Post = PostResumo & { corpo: unknown; galeria: string[]; autor: string | null };

const CAMPOS_RESUMO = "slug, titulo, resumo, categoria, capa_path, data_evento, local, publicado_em";

type LinhaResumo = {
  slug: string;
  titulo: string;
  resumo: string | null;
  categoria: Categoria;
  capa_path: string | null;
  data_evento: string | null;
  local: string | null;
  publicado_em: string | null;
};

function paraResumo(p: LinhaResumo): PostResumo {
  return {
    slug: p.slug,
    titulo: p.titulo,
    resumo: p.resumo,
    categoria: p.categoria,
    capaUrl: publicUrl("fotos", p.capa_path),
    dataEvento: p.data_evento,
    local: p.local,
    publicadoEm: p.publicado_em,
  };
}

/** Posts publicados das categorias pedidas, do mais recente para o mais antigo. */
export async function getPosts(categorias: Categoria[]): Promise<PostResumo[]> {
  "use cache";
  cacheLife("conteudo");
  cacheTag(TAGS.posts);

  const { data, error } = await createPublicClient()
    .from("posts")
    .select(CAMPOS_RESUMO)
    .eq("publicado", true)
    .in("categoria", categorias)
    .order("data_evento", { ascending: false, nullsFirst: false })
    .order("publicado_em", { ascending: false });
  if (error) falha("posts", error);
  return data.map(paraResumo);
}

/** Separa em próximos (data futura, do mais próximo ao mais distante) e anteriores. */
export async function getEventos(categorias: Categoria[]) {
  "use cache";
  cacheLife("conteudo");
  cacheTag(TAGS.posts);

  const posts = await getPosts(categorias);
  // Dentro de 'use cache', "agora" é o momento em que o cache foi gerado
  // (no máximo 5 minutos atrás, pelo perfil `conteudo`).
  const agora = Date.now();
  const proximos = posts
    .filter((p) => p.dataEvento && new Date(p.dataEvento).getTime() >= agora)
    .reverse();
  const anteriores = posts.filter((p) => !p.dataEvento || new Date(p.dataEvento).getTime() < agora);
  return { proximos, anteriores };
}

export async function getPost(slug: string): Promise<Post | null> {
  "use cache";
  cacheLife("conteudo");
  cacheTag(TAGS.posts, `${TAGS.posts}:${slug}`);

  const { data, error } = await createPublicClient()
    .from("posts")
    .select(`${CAMPOS_RESUMO}, corpo, galeria, members(nome)`)
    .eq("publicado", true)
    .eq("slug", slug)
    .maybeSingle();
  if (error) falha("posts", error);
  if (!data) return null;
  return {
    ...paraResumo(data),
    corpo: data.corpo,
    galeria: data.galeria.flatMap((path) => publicUrl("fotos", path) ?? []),
    autor: data.members?.nome ?? null,
  };
}

export async function getSlugsPosts(): Promise<string[]> {
  "use cache";
  cacheLife("conteudo");
  cacheTag(TAGS.posts);

  const { data, error } = await createPublicClient().from("posts").select("slug").eq("publicado", true);
  if (error) falha("posts", error);
  return data.map((p) => p.slug);
}

/** Últimas publicações da home: posts e relatórios misturados por data. */
export type Publicacao =
  | { tipo: "post"; data: string | null; post: PostResumo }
  | { tipo: "relatorio"; data: string | null; relatorio: Relatorio };

export async function getUltimasPublicacoes(limite = 3): Promise<Publicacao[]> {
  "use cache";
  cacheLife("conteudo");
  cacheTag(TAGS.posts, TAGS.reports);

  const [posts, relatorios] = await Promise.all([
    getPosts(["evento", "palestra", "viagem", "smf", "competicao"]),
    getRelatorios(),
  ]);
  const itens: Publicacao[] = [
    ...posts.map((post) => ({ tipo: "post" as const, data: post.publicadoEm ?? post.dataEvento, post })),
    ...relatorios.map((relatorio) => ({ tipo: "relatorio" as const, data: relatorio.publicadoEm, relatorio })),
  ];
  return itens.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")).slice(0, limite);
}

// =============================================================================
// Nossa História
// =============================================================================
export type SecaoHistoria = {
  id: string;
  periodo: string;
  titulo: string;
  texto: string | null;
  fotos: string[];
  conquistas: string[];
};

export async function getHistoria(): Promise<SecaoHistoria[]> {
  "use cache";
  cacheLife("conteudo");
  cacheTag(TAGS.history);

  const { data, error } = await createPublicClient()
    .from("history_sections")
    .select("id, periodo, titulo, texto, fotos, conquistas")
    .order("ordem");
  if (error) falha("history_sections", error);
  return data.map((s) => ({ ...s, fotos: s.fotos.flatMap((path) => publicUrl("fotos", path) ?? []) }));
}
