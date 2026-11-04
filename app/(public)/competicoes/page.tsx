import type { Metadata } from "next";

import { PageIntro } from "@/components/site/page-intro";
import { PostGrid } from "@/components/site/post-card";
import { getPosts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Competições",
  description: "Desafios e competições de que a LMF UFU participa, com os resultados de cada edição.",
};

export default async function Page() {
  const competicoes = await getPosts(["competicao"]);

  return (
    <>
      <PageIntro titulo="Competições">Desafios e competições de que a liga participa, com os resultados de cada edição.</PageIntro>
      <section aria-label="Competições" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-10">
        <PostGrid posts={competicoes} vazio="As competições e seus resultados aparecem aqui assim que forem publicados pela diretoria." />
      </section>
    </>
  );
}
