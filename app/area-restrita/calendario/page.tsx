import type { Metadata } from "next";

import { AgendaLmf } from "@/components/area-restrita/agenda";
import { exigirPapel } from "@/lib/auth";
import { TODOS } from "@/lib/papeis";
import { getCalendarios } from "@/lib/restrito";

export const metadata: Metadata = { title: "Calendário" };

export default async function Page() {
  await exigirPapel(TODOS);
  const agendas = await getCalendarios();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <h1 className="text-title">Calendário</h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Escolha quais agendas da LMF aparecem. A escolha fica salva neste navegador.
      </p>
      {agendas.length > 0 ? (
        <AgendaLmf agendas={agendas} />
      ) : (
        <p className="mt-10 max-w-[62ch] rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-dashed border-border p-6 text-muted-foreground">
          Nenhuma agenda cadastrada ainda. O Presidente ou o Diretor de RH adiciona as agendas da LMF em Conteúdo → Calendários.
        </p>
      )}
    </div>
  );
}
