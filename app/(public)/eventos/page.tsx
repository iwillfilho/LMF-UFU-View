import type { Metadata } from "next";

import { EventosView } from "@/components/site/eventos-view";
import { CATEGORIAS_EVENTOS } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Eventos",
  description: "Semana do Mercado Financeiro, viagens técnicas e palestras da LMF UFU.",
};

export default function Page() {
  return (
    <EventosView
      titulo="Eventos"
      descricao="Semana do Mercado Financeiro, viagens técnicas e palestras."
      categorias={CATEGORIAS_EVENTOS}
      ativa="todos"
    />
  );
}
