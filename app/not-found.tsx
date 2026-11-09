import type { Metadata } from "next";

import { NaoEncontrado } from "@/components/site/nao-encontrado";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteSettings } from "@/lib/queries";

export const metadata: Metadata = { title: "Página não encontrada" };

/** URLs que não batem com nenhuma rota. Repete o layout público (menu e rodapé). */
export default async function NotFound() {
  const { psAberto } = await getSiteSettings();
  return (
    <>
      <SiteHeader psAberto={psAberto} />
      <main id="conteudo" className="flex-1 pt-18">
        <NaoEncontrado />
      </main>
      <SiteFooter />
    </>
  );
}
