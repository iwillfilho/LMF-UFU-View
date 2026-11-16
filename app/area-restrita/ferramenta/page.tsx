import type { Metadata } from "next";

import { PaginaProvisoria } from "@/components/area-restrita/provisoria";
import { exigirPapel } from "@/lib/auth";
import { EFETIVOS } from "@/lib/papeis";

export const metadata: Metadata = { title: "Ferramenta" };

export default async function Page() {
  await exigirPapel(EFETIVOS);
  return <PaginaProvisoria titulo="Ferramenta">Página reservada para a ferramenta da LMF, que ainda está sendo definida.</PaginaProvisoria>;
}
