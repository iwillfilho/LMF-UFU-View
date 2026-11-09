import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormPost } from "@/components/area-restrita/form-post";
import { Voltar } from "@/components/area-restrita/voltar";
import { exigirPapel } from "@/lib/auth";
import { PUBLICA } from "@/lib/papeis";
import { getPostEditor } from "@/lib/restrito";

export const metadata: Metadata = { title: "Editar post" };

export default async function Page({ params, searchParams }: PageProps<"/area-restrita/publicacoes/posts/[id]">) {
  await exigirPapel(PUBLICA);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const post = await getPostEditor(id);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <Voltar />
      <h1 className="text-title mt-6">Editar post</h1>
      {sp.erro === "excluir" ? (
        <p role="alert" className="mt-4 text-destructive">
          Não foi possível excluir o post. Tente de novo.
        </p>
      ) : null}
      <FormPost post={post} />
    </div>
  );
}
