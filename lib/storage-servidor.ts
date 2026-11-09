import "server-only";

import { BYTES_ASSINATURA, ehPdf } from "@/lib/arquivos";
import { publicUrl } from "@/lib/storage";
import type { createClient } from "@/lib/supabase/server";

/** Operações de Storage usadas pelas Server Actions, sempre com a sessão de quem está logado. */

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type Bucket = "fotos" | "relatorios" | "documentos";

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
