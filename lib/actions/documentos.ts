"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/lib/actions/form-state";
import { primeiroErro } from "@/lib/actions/form-state";
import { exigirPapel } from "@/lib/auth";
import { ADMIN } from "@/lib/papeis";
import { conferirPdf, listarPasta, remover } from "@/lib/storage-servidor";
import { createClient } from "@/lib/supabase/server";

/**
 * Documentos internos (bucket privado `documentos`) e link do Drive.
 * Só Presidente e Diretor de RH gerenciam; os membros só leem e baixam.
 * O PDF vai do navegador direto ao Storage em documentos/<id>/<uuid>.pdf e
 * estas ações conferem o arquivo antes de gravar no banco.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CATEGORIAS = ["estatuto", "regimento", "auxiliar"] as const;

function mensagemErro(error: { code?: string; message: string }, contexto: string) {
  console.error(contexto, error);
  if (error.code === "23514") return "Algum campo está fora do formato aceito.";
  if (error.code === "42501") return "Você não tem permissão para esta ação.";
  return "Não foi possível salvar agora. Tente de novo em instantes.";
}

const pdfDoDocumento = (id: string, path: string) => new RegExp(`^${id}/[0-9a-f-]{36}\\.pdf$`).test(path);

const dadosSchema = z.object({
  titulo: z.string().trim().min(2, "Informe um título.").max(160, "Use no máximo 160 caracteres."),
  descricao: z.string().trim().max(500, "Use no máximo 500 caracteres."),
  categoria: z.enum(CATEGORIAS, "Escolha a categoria."),
  ordem: z.coerce.number().int("Use um número inteiro.").min(0, "Use 0 ou mais.").max(999, "Use até 999."),
});

function lerDados(formData: FormData) {
  const valores = Object.fromEntries(
    ["titulo", "descricao", "categoria", "ordem"].map((c) => [c, String(formData.get(c) ?? "")]),
  );
  const parsed = dadosSchema.safeParse({ ...valores, ordem: valores.ordem || "0" });
  return { valores, parsed };
}

/** Novo documento: o PDF já foi enviado pelo navegador para documentos/<id>/. */
export async function criarDocumento(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = String(formData.get("id") ?? "");
  const path = String(formData.get("arquivo") ?? "");
  const { valores, parsed } = lerDados(formData);
  const erros: Record<string, string> = parsed.success ? {} : primeiroErro(z.flattenError(parsed.error).fieldErrors);
  if (!UUID.test(id) || !pdfDoDocumento(id, path)) erros.arquivo = "Envie o PDF do documento.";
  if (!parsed.success || Object.keys(erros).length > 0) {
    return { status: "erro", mensagem: "Revise os campos destacados.", erros, valores };
  }

  const supabase = await createClient();
  if (!(await conferirPdf(supabase, "documentos", path))) {
    await remover(supabase, "documentos", [path]);
    return {
      status: "erro",
      mensagem: "O arquivo enviado não é um PDF válido.",
      erros: { arquivo: "Envie um PDF." },
      valores,
    };
  }

  const d = parsed.data;
  const { error } = await supabase.from("documents").insert({
    id,
    titulo: d.titulo,
    descricao: d.descricao || null,
    categoria: d.categoria,
    ordem: d.ordem,
    file_path: path,
  });
  if (error) {
    await remover(supabase, "documentos", [path]);
    return { status: "erro", mensagem: mensagemErro(error, "criar documento"), valores };
  }

  refresh();
  return { status: "ok", mensagem: `“${d.titulo}” adicionado.` };
}

export async function salvarDocumento(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { status: "erro", mensagem: "Documento inválido." };
  const { valores, parsed } = lerDados(formData);
  if (!parsed.success) {
    return {
      status: "erro",
      mensagem: "Revise os campos destacados.",
      erros: primeiroErro(z.flattenError(parsed.error).fieldErrors),
      valores,
    };
  }

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({ titulo: d.titulo, descricao: d.descricao || null, categoria: d.categoria, ordem: d.ordem })
    .eq("id", id);
  if (error) return { status: "erro", mensagem: mensagemErro(error, "salvar documento"), valores };

  refresh();
  return { status: "ok", mensagem: "Alterações salvas." };
}

/** Troca o PDF: confere o novo, aponta o banco para ele e só então apaga o antigo. */
export async function trocarArquivoDocumento(id: string, path: string): Promise<{ ok: boolean; mensagem: string }> {
  await exigirPapel(ADMIN);
  if (!UUID.test(id) || !pdfDoDocumento(id, path)) return { ok: false, mensagem: "Arquivo inválido." };

  const supabase = await createClient();
  if (!(await conferirPdf(supabase, "documentos", path))) {
    await remover(supabase, "documentos", [path]);
    return { ok: false, mensagem: "O arquivo enviado não é um PDF válido." };
  }
  const { data: antigo } = await supabase.from("documents").select("file_path").eq("id", id).maybeSingle();
  if (!antigo) {
    await remover(supabase, "documentos", [path]);
    return { ok: false, mensagem: "Documento não encontrado." };
  }
  const { error } = await supabase.from("documents").update({ file_path: path }).eq("id", id);
  if (error) {
    await remover(supabase, "documentos", [path]);
    return { ok: false, mensagem: mensagemErro(error, "trocar arquivo") };
  }

  const sobras = (await listarPasta(supabase, "documentos", id)).map((f) => f.path).filter((p) => p !== path);
  if (antigo.file_path !== path) sobras.push(antigo.file_path);
  await remover(supabase, "documentos", [...new Set(sobras)]);

  refresh();
  return { ok: true, mensagem: "Arquivo substituído." };
}

export async function excluirDocumento(formData: FormData) {
  await exigirPapel(ADMIN);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;

  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("file_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) {
    console.error("excluir documento", error);
    return;
  }
  const arquivos = (await listarPasta(supabase, "documentos", id)).map((f) => f.path);
  if (doc?.file_path) arquivos.push(doc.file_path);
  await remover(supabase, "documentos", [...new Set(arquivos)]);
  refresh();
}

const driveSchema = z
  .string()
  .trim()
  .max(500, "Link longo demais.")
  .refine(
    (v) => v === "" || /^https:\/\/drive\.google\.com\//.test(v),
    "Cole um link que comece com https://drive.google.com/.",
  );

export async function salvarDrive(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const valor = String(formData.get("drive_url") ?? "");
  const parsed = driveSchema.safeParse(valor);
  if (!parsed.success) {
    return {
      status: "erro",
      mensagem: "Revise o link.",
      erros: { drive_url: parsed.error.issues[0]?.message ?? "Link inválido." },
      valores: { drive_url: valor },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("restricted_settings")
    .update({ drive_url: parsed.data || null })
    .eq("id", true);
  if (error) return { status: "erro", mensagem: mensagemErro(error, "salvar drive"), valores: { drive_url: valor } };

  refresh();
  return { status: "ok", mensagem: parsed.data ? "Link do Drive salvo." : "Link do Drive removido." };
}
