import "server-only";

import { BYTES_ASSINATURA, ehPdf, extensaoImagem, IMAGEM_MAX, MIME_IMAGEM, primeirosBytes } from "@/lib/arquivos";
import { publicUrl } from "@/lib/storage";
import type { createClient } from "@/lib/supabase/server";

/** Operações de Storage usadas pelas Server Actions, sempre com a sessão de quem está logado. */

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type Bucket = "fotos" | "relatorios" | "documentos" | "site";

/** Arquivos de uma pasta, com a data de criação. Falha de listagem vira lista vazia (e log). */
export async function listarPasta(supabase: Supabase, bucket: Bucket, pasta: string) {
  const { data, error } = await supabase.storage.from(bucket).list(pasta, { limit: 1000 });
  if (error) {
    console.error(`listar ${bucket}/${pasta}`, error);
    return [];
  }
  return data.filter((f) => f.id).map((f) => ({ path: `${pasta}/${f.name}`, criadoEm: f.created_at }));
}

export async function remover(supabase: Supabase, bucket: Bucket, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) console.error(`remover ${bucket}`, paths, error);
}

/**
 * Confere que o arquivo já enviado é mesmo um PDF lendo só os primeiros bytes
 * (Range). Bucket público usa a URL pública; privado, uma URL assinada de 60 s.
 */
export async function conferirPdf(supabase: Supabase, bucket: "relatorios" | "documentos", path: string) {
  let url: string | null = null;
  if (bucket === "relatorios") {
    url = publicUrl("relatorios", path);
  } else {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error) console.error("assinar URL para conferir PDF", error);
    url = data?.signedUrl ?? null;
  }
  if (!url) return false;
  try {
    const resposta = await fetch(url, { headers: { Range: `bytes=0-${BYTES_ASSINATURA - 1}` }, cache: "no-store" });
    return resposta.ok && ehPdf(new Uint8Array(await resposta.arrayBuffer()));
  } catch (e) {
    console.error("conferir PDF", e);
    return false;
  }
}

/**
 * Imagem enviada num campo de formulário (já reduzida no navegador). Confere
 * tamanho e conteúdo real; null se o campo veio vazio.
 */
export async function lerImagem(valor: FormDataEntryValue | null): Promise<{ arquivo: File } | { erro: string } | null> {
  if (!(valor instanceof File) || valor.size === 0) return null;
  if (valor.size > IMAGEM_MAX) return { erro: "A imagem pode ter no máximo 5 MB." };
  if (!extensaoImagem(await primeirosBytes(valor))) return { erro: "Envie a imagem em JPG, PNG ou WebP." };
  return { arquivo: valor };
}

/** Envia uma imagem já conferida para <pasta>/<uuid>.<ext>. Devolve o caminho ou null. */
export async function subirImagem(supabase: Supabase, bucket: "fotos" | "site", pasta: string, arquivo: Blob) {
  const ext = extensaoImagem(await primeirosBytes(arquivo));
  if (!ext) return null;
  const path = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, arquivo, { contentType: MIME_IMAGEM[ext], upsert: false });
  if (error) {
    console.error(`upload ${bucket}/${path}`, error);
    return null;
  }
  return path;
}

/** Apaga da pasta tudo o que não estiver em `manter` (depois que o banco já aponta para os novos). */
export async function podarPasta(supabase: Supabase, bucket: Bucket, pasta: string, manter: (string | null)[]) {
  const ficam = new Set(manter.filter(Boolean));
  const sobras = (await listarPasta(supabase, bucket, pasta)).map((f) => f.path).filter((p) => !ficam.has(p));
  await remover(supabase, bucket, sobras);
}
