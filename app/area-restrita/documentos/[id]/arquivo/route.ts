import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

import { getSessao } from "@/lib/auth";
import { TODOS, temPapel } from "@/lib/papeis";
import { createClient } from "@/lib/supabase/server";

/**
 * Abre um documento interno. Cada clique gera uma URL assinada de 60 s, então
 * o link do arquivo nunca fica na página nem serve depois que o acesso cai.
 */
export async function GET(request: Request, { params }: RouteContext<"/area-restrita/documentos/[id]/arquivo">) {
  const sessao = await getSessao();
  if (!sessao) return NextResponse.redirect(new URL("/login", request.url));
  if (!temPapel(sessao.papeis, TODOS)) notFound();

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("titulo, file_path").eq("id", id).maybeSingle();
  if (!doc) notFound();

  const baixar = new URL(request.url).searchParams.has("baixar");
  const nome = `${doc.titulo.replace(/[^\p{L}\p{N} ._-]/gu, "").trim() || "documento"}.pdf`;
  const { data, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(doc.file_path, 60, baixar ? { download: nome } : undefined);
  if (error || !data) {
    console.error("assinar documento", error);
    return new NextResponse("Não foi possível abrir o documento agora.", { status: 503 });
  }

  const resposta = NextResponse.redirect(data.signedUrl);
  resposta.headers.set("Cache-Control", "private, no-store");
  return resposta;
}
