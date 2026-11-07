import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventosView } from "@/components/site/eventos-view";
import { SUBPAGINAS_EVENTOS, type SubpaginaEventos } from "@/lib/labels";

const DESCRICOES: Record<SubpaginaEventos, string> = {
  smf: "A Semana do Mercado Financeiro organizada pela liga.",
  viagens: "Viagens e visitas técnicas da liga.",
  palestras: "Palestras com profissionais do mercado financeiro.",
};

function subpagina(categoria: string): SubpaginaEventos | null {
  // hasOwn ignora o protótipo: "constructor" e "__proto__" têm de dar 404.
  return Object.hasOwn(SUBPAGINAS_EVENTOS, categoria) ? (categoria as SubpaginaEventos) : null;
}

export function generateStaticParams() {
  return Object.keys(SUBPAGINAS_EVENTOS).map((categoria) => ({ categoria }));
}

export async function generateMetadata({ params }: PageProps<"/eventos/[categoria]">): Promise<Metadata> {
  const chave = subpagina((await params).categoria);
  if (!chave) return {};
  return { title: SUBPAGINAS_EVENTOS[chave].titulo, description: DESCRICOES[chave] };
}

export default async function Page({ params }: PageProps<"/eventos/[categoria]">) {
  const chave = subpagina((await params).categoria);
  if (!chave) notFound();
  const { titulo, categoria } = SUBPAGINAS_EVENTOS[chave];

  return <EventosView titulo={titulo} descricao={DESCRICOES[chave]} categorias={[categoria]} ativa={chave} />;
}
