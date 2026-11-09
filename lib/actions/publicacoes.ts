"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/actions/form-state";
import { primeiroErro } from "@/lib/actions/form-state";
import { extensaoImagem, IMAGEM_MAX, MIME_IMAGEM, primeirosBytes } from "@/lib/arquivos";
import { exigirPapel } from "@/lib/auth";
import { imagensDoDoc, validarCorpo } from "@/lib/corpo-post";
import { deInputDataHora } from "@/lib/data-hora";
import { PUBLICA } from "@/lib/papeis";
import { TAGS } from "@/lib/queries";
import { gerarSlug, slugLivre } from "@/lib/slug";
import { conferirPdf, listarPasta, remover } from "@/lib/storage-servidor";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/**
 * Publicações da Área Restrita (papéis editor, presidente, diretor_rh).
 * Ordem em toda ação: papel → validação → banco → arquivos → cache.
 * Arquivos antigos só são apagados depois que o banco já aponta para os novos.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CATEGORIAS = ["evento", "palestra", "viagem", "smf", "competicao"] as const;
const TIPOS = ["tese", "iniciacao"] as const;
/** Arquivo solto na pasta (enviado e não usado) é apagado depois disto. */
const IDADE_ORFAO_MS = 24 * 60 * 60 * 1000;

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ErroPg = { code?: string; message: string };

function mensagemErro(error: ErroPg, contexto: string): string {
  console.error(contexto, error);
  if (error.code === "23505") return "Já existe uma publicação com este endereço. Tente outro título.";
  if (error.message.includes("reports_publicado_tem_pdf")) return "Envie o PDF antes de publicar o relatório.";
  if (error.code === "23514") return "Algum campo está fora do formato aceito.";
  if (error.code === "42501") return "Você não tem permissão para esta ação.";
  return "Não foi possível salvar agora. Tente de novo em instantes.";
}

const texto = (max: number, msg: string) => z.string().trim().max(max, msg);

async function slugDisponivel(supabase: Supabase, tabela: "posts" | "reports", titulo: string) {
  const base = gerarSlug(titulo);
  const { data, error } = await supabase.from(tabela).select("slug").like("slug", `${base}%`);
  if (error) throw new Error(`Supabase (${tabela}): ${error.message}`);
  return slugLivre(
    base,
    data.map((r) => r.slug),
  );
}

// =============================================================================
// Posts
// =============================================================================
const novoPostSchema = z.object({
  titulo: z.string().trim().min(3, "Informe um título.").max(160, "Use no máximo 160 caracteres."),
  categoria: z.enum(CATEGORIAS, "Escolha a categoria."),
});

/** Cria o rascunho e abre o editor completo (imagens só depois de existir o post). */
export async function criarPost(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(PUBLICA);
  const valores = { titulo: String(formData.get("titulo") ?? ""), categoria: String(formData.get("categoria") ?? "") };
  const parsed = novoPostSchema.safeParse(valores);
  if (!parsed.success) {
    return {
      status: "erro",
      mensagem: "Revise os campos destacados.",
      erros: primeiroErro(z.flattenError(parsed.error).fieldErrors),
      valores,
    };
  }

  const supabase = await createClient();
  const id = crypto.randomUUID();
  const slug = await slugDisponivel(supabase, "posts", parsed.data.titulo);
  const { error } = await supabase
    .from("posts")
    .insert({ id, slug, titulo: parsed.data.titulo, categoria: parsed.data.categoria, publicado: false });
  if (error) return { status: "erro", mensagem: mensagemErro(error, "criar post"), valores };

  redirect(`/area-restrita/publicacoes/posts/${id}`);
}

const postSchema = z.object({
  titulo: z.string().trim().min(3, "Informe um título.").max(160, "Use no máximo 160 caracteres."),
  resumo: texto(500, "Use no máximo 500 caracteres."),
  categoria: z.enum(CATEGORIAS, "Escolha a categoria."),
  data_evento: z
    .string()
    .trim()
    .refine((v) => v === "" || deInputDataHora(v) !== null, "Data inválida."),
  local: texto(160, "Use no máximo 160 caracteres."),
});

export async function salvarPost(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(PUBLICA);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { status: "erro", mensagem: "Publicação inválida." };

  const valores = Object.fromEntries(
    ["titulo", "resumo", "categoria", "data_evento", "local"].map((c) => [c, String(formData.get(c) ?? "")]),
  );
  const parsed = postSchema.safeParse(valores);
  const erros: Record<string, string> = parsed.success ? {} : primeiroErro(z.flattenError(parsed.error).fieldErrors);

  // Imagens só da pasta deste post.
  const pasta = `posts/${id}`;
  const imagemDoPost = new RegExp(`^posts/${id}/[0-9a-f-]{36}\\.(jpg|png|webp)$`);
  const capa = String(formData.get("capa") ?? "");
  if (capa && !imagemDoPost.test(capa)) erros.capa = "Capa inválida.";
  let galeria: string[] = [];
  try {
    galeria = JSON.parse(String(formData.get("galeria") ?? "[]"));
    if (
      !Array.isArray(galeria) ||
      galeria.length > 30 ||
      !galeria.every((g) => typeof g === "string" && imagemDoPost.test(g))
    ) {
      erros.galeria = "Galeria inválida (até 30 fotos).";
    }
  } catch {
    erros.galeria = "Galeria inválida.";
  }

  const corpoBruto = String(formData.get("corpo") ?? "");
  let corpo: ReturnType<typeof validarCorpo> = { ok: false, motivo: "Texto inválido." };
  if (corpoBruto.length > 1_000_000) erros.corpo = "O texto está grande demais.";
  else {
    try {
      const json = JSON.parse(corpoBruto || "{}");
      // {} é o padrão do banco para post sem texto: vale como documento vazio.
      const vazio = json && typeof json === "object" && !Array.isArray(json) && Object.keys(json).length === 0;
      corpo = validarCorpo(vazio ? { type: "doc" } : json, `${pasta}/`);
      if (!corpo.ok) erros.corpo = corpo.motivo;
    } catch {
      erros.corpo = "Texto inválido.";
    }
  }

  if (!parsed.success || !corpo.ok || Object.keys(erros).length > 0) {
    return { status: "erro", mensagem: "Revise os campos destacados.", erros };
  }

  const supabase = await createClient();
  const { data: antigo, error: erroLeitura } = await supabase
    .from("posts")
    .select("slug, capa_path, galeria, corpo")
    .eq("id", id)
    .maybeSingle();
  if (erroLeitura || !antigo) return { status: "erro", mensagem: "Publicação não encontrada." };

  const publicado = formData.get("publicado") === "on";
  const d = parsed.data;
  const { error } = await supabase
    .from("posts")
    .update({
      titulo: d.titulo,
      resumo: d.resumo || null,
      categoria: d.categoria,
      data_evento: d.data_evento ? deInputDataHora(d.data_evento) : null,
      local: d.local || null,
      // validarCorpo reconstruiu o documento só com valores JSON simples.
      corpo: corpo.doc as unknown as NonNullable<Json>,
      capa_path: capa || null,
      galeria,
      publicado,
    })
    .eq("id", id);
  if (error) return { status: "erro", mensagem: mensagemErro(error, "salvar post") };

  // Limpeza: o que saiu do post agora, e o que foi enviado e esquecido há mais de 24 h.
  const usadas = new Set([capa, ...galeria, ...corpo.imagens].filter(Boolean));
  const antes = new Set([antigo.capa_path, ...antigo.galeria, ...imagensDoDoc(antigo.corpo)].filter(Boolean));
  const limite = Date.now() - IDADE_ORFAO_MS;
  const sobras = (await listarPasta(supabase, "fotos", pasta))
    .filter(
      (f) =>
        !usadas.has(f.path) && (antes.has(f.path) || (f.criadoEm ? new Date(f.criadoEm).getTime() < limite : false)),
    )
    .map((f) => f.path);
  await remover(supabase, "fotos", sobras);

  updateTag(TAGS.posts);
  updateTag(`${TAGS.posts}:${antigo.slug}`);
  return {
    status: "ok",
    mensagem: publicado ? "Salvo e publicado no site." : "Rascunho salvo. Ele não aparece no site.",
  };
}

export type ResultadoUpload = { ok: true; path: string } | { ok: false; erro: string };

/** Capa, galeria e imagens do texto. Fica em posts/<id>/ no bucket público `fotos`. */
export async function enviarImagemPost(postId: string, formData: FormData): Promise<ResultadoUpload> {
  await exigirPapel(PUBLICA);
  if (!UUID.test(postId)) return { ok: false, erro: "Publicação inválida." };
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: "Escolha uma imagem." };
  if (arquivo.size > IMAGEM_MAX) return { ok: false, erro: "A imagem pode ter no máximo 5 MB." };
  const ext = extensaoImagem(await primeirosBytes(arquivo));
  if (!ext) return { ok: false, erro: "Envie a imagem em JPG, PNG ou WebP." };

  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("id").eq("id", postId).maybeSingle();
  if (!post) return { ok: false, erro: "Publicação não encontrada." };

  const path = `posts/${postId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("fotos")
    .upload(path, arquivo, { contentType: MIME_IMAGEM[ext], upsert: false });
  if (error) {
    console.error("upload imagem post", error);
    return { ok: false, erro: "Não foi possível enviar a imagem." };
  }
  return { ok: true, path };
}

export async function excluirPost(formData: FormData) {
  await exigirPapel(PUBLICA);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect("/area-restrita/publicacoes");

  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("slug").eq("id", id).maybeSingle();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) {
    console.error("excluir post", error);
    redirect(`/area-restrita/publicacoes/posts/${id}?erro=excluir`);
  }
  await remover(
    supabase,
    "fotos",
    (await listarPasta(supabase, "fotos", `posts/${id}`)).map((f) => f.path),
  );

  updateTag(TAGS.posts);
  if (post) updateTag(`${TAGS.posts}:${post.slug}`);
  redirect("/area-restrita/publicacoes?excluido=post");
}

// =============================================================================
// Relatórios
// =============================================================================
const novoRelatorioSchema = z.object({
  titulo: z.string().trim().min(3, "Informe um título.").max(160, "Use no máximo 160 caracteres."),
  tipo: z.enum(TIPOS, "Escolha o tipo."),
});

export async function criarRelatorio(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(PUBLICA);
  const valores = { titulo: String(formData.get("titulo") ?? ""), tipo: String(formData.get("tipo") ?? "") };
  const parsed = novoRelatorioSchema.safeParse(valores);
  if (!parsed.success) {
    return {
      status: "erro",
      mensagem: "Revise os campos destacados.",
      erros: primeiroErro(z.flattenError(parsed.error).fieldErrors),
      valores,
    };
  }

  const supabase = await createClient();
  const id = crypto.randomUUID();
  const slug = await slugDisponivel(supabase, "reports", parsed.data.titulo);
  const { error } = await supabase
    .from("reports")
    .insert({ id, slug, titulo: parsed.data.titulo, tipo: parsed.data.tipo, publicado: false });
  if (error) return { status: "erro", mensagem: mensagemErro(error, "criar relatório"), valores };

  redirect(`/area-restrita/publicacoes/relatorios/${id}`);
}

const relatorioSchema = z.object({
  titulo: z.string().trim().min(3, "Informe um título.").max(160, "Use no máximo 160 caracteres."),
  resumo: texto(1000, "Use no máximo 1.000 caracteres."),
  tipo: z.enum(TIPOS, "Escolha o tipo."),
  nucleo_id: z.string().refine((v) => v === "" || UUID.test(v), "Núcleo inválido."),
  setor: texto(60, "Use no máximo 60 caracteres."),
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z0-9]{4,6}$/.test(v), "Use de 4 a 6 letras ou números, ex. PETR4."),
});

export async function salvarRelatorio(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(PUBLICA);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { status: "erro", mensagem: "Relatório inválido." };

  const valores = Object.fromEntries(
    ["titulo", "resumo", "tipo", "nucleo_id", "setor", "ticker"].map((c) => [c, String(formData.get(c) ?? "")]),
  );
  const parsed = relatorioSchema.safeParse(valores);
  const erros: Record<string, string> = parsed.success ? {} : primeiroErro(z.flattenError(parsed.error).fieldErrors);

  let autores: string[] = [];
  try {
    autores = JSON.parse(String(formData.get("autores") ?? "[]"));
    if (
      !Array.isArray(autores) ||
      autores.length > 20 ||
      !autores.every((a) => typeof a === "string" && UUID.test(a))
    ) {
      erros.autores = "Lista de autores inválida.";
    }
    autores = [...new Set(autores)];
  } catch {
    erros.autores = "Lista de autores inválida.";
  }

  const publicado = formData.get("publicado") === "on";
  if (publicado && autores.length === 0) erros.autores = "Escolha ao menos um autor antes de publicar.";

  if (!parsed.success || Object.keys(erros).length > 0) {
    return { status: "erro", mensagem: "Revise os campos destacados.", erros };
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({
      titulo: d.titulo,
      resumo: d.resumo || null,
      tipo: d.tipo,
      nucleo_id: d.nucleo_id || null,
      setor: d.setor || null,
      ticker: d.ticker || null,
      publicado,
    })
    .eq("id", id);
  if (error) return { status: "erro", mensagem: mensagemErro(error, "salvar relatório") };

  // Autores: grava os novos (com a ordem) antes de tirar os que saíram, para
  // o relatório nunca ficar sem autor no meio do caminho.
  if (autores.length > 0) {
    const { error: e1 } = await supabase.from("report_authors").upsert(
      autores.map((member_id, ordem) => ({ report_id: id, member_id, ordem })),
      { onConflict: "report_id,member_id" },
    );
    if (e1) return { status: "erro", mensagem: mensagemErro(e1, "salvar autores") };
  }
  let remocao = supabase.from("report_authors").delete().eq("report_id", id);
  if (autores.length > 0) remocao = remocao.not("member_id", "in", `(${autores.join(",")})`);
  const { error: e2 } = await remocao;
  if (e2) return { status: "erro", mensagem: mensagemErro(e2, "remover autores") };

  updateTag(TAGS.reports);
  return {
    status: "ok",
    mensagem: publicado ? "Salvo e publicado no site." : "Rascunho salvo. Ele não aparece no site.",
  };
}

/**
 * Depois que o navegador envia o PDF direto ao Storage (até 20 MB, acima do
 * limite das Server Actions), confere o arquivo e liga ao relatório.
 */
export async function anexarPdfRelatorio(reportId: string, path: string): Promise<{ ok: boolean; mensagem: string }> {
  await exigirPapel(PUBLICA);
  if (!UUID.test(reportId) || !new RegExp(`^${reportId}/[0-9a-f-]{36}\\.pdf$`).test(path)) {
    return { ok: false, mensagem: "Arquivo inválido." };
  }
  const supabase = await createClient();

  // Lê só o começo do arquivo para conferir que é mesmo um PDF.
  const valido = await conferirPdf(supabase, "relatorios", path);
  if (!valido) {
    await remover(supabase, "relatorios", [path]);
    return { ok: false, mensagem: "O arquivo enviado não é um PDF válido." };
  }

  const { data: antigo } = await supabase.from("reports").select("pdf_path").eq("id", reportId).maybeSingle();
  if (!antigo) {
    await remover(supabase, "relatorios", [path]);
    return { ok: false, mensagem: "Relatório não encontrado." };
  }
  const { error } = await supabase.from("reports").update({ pdf_path: path }).eq("id", reportId);
  if (error) {
    await remover(supabase, "relatorios", [path]);
    return { ok: false, mensagem: mensagemErro(error, "anexar PDF") };
  }

  // O banco já aponta para o novo: agora sim apaga o PDF antigo e sobras da pasta.
  const sobras = (await listarPasta(supabase, "relatorios", reportId)).map((f) => f.path).filter((p) => p !== path);
  if (antigo.pdf_path && antigo.pdf_path !== path) sobras.push(antigo.pdf_path);
  await remover(supabase, "relatorios", [...new Set(sobras)]);

  updateTag(TAGS.reports);
  return { ok: true, mensagem: "PDF anexado." };
}

export async function excluirRelatorio(formData: FormData) {
  await exigirPapel(PUBLICA);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect("/area-restrita/publicacoes");

  const supabase = await createClient();
  const { data: relatorio } = await supabase.from("reports").select("pdf_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) {
    console.error("excluir relatório", error);
    redirect(`/area-restrita/publicacoes/relatorios/${id}?erro=excluir`);
  }
  const arquivos = (await listarPasta(supabase, "relatorios", id)).map((f) => f.path);
  if (relatorio?.pdf_path) arquivos.push(relatorio.pdf_path);
  await remover(supabase, "relatorios", [...new Set(arquivos)]);

  updateTag(TAGS.reports);
  redirect("/area-restrita/publicacoes?excluido=relatorio");
}
