import type { Metadata } from "next";

import { CabecalhoConteudo } from "@/components/area-restrita/cabecalho-conteudo";
import { Adicionar, FormCalendario, ItemConteudo } from "@/components/area-restrita/conteudo";
import { exigirPapel } from "@/lib/auth";
import { ADMIN } from "@/lib/papeis";
import { getCalendarios } from "@/lib/restrito";

export const metadata: Metadata = { title: "Calendários" };

export default async function Page() {
  await exigirPapel(ADMIN);
  const agendas = await getCalendarios();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <CabecalhoConteudo titulo="Calendários">
        Agendas do Google que todos os membros veem na aba Calendário, cada uma com a sua cor. A agenda precisa estar
        pública no Google para aparecer.
      </CabecalhoConteudo>
      <div className="mt-10">
        <Adicionar rotulo="Adicionar agenda">
          <FormCalendario />
        </Adicionar>
      </div>
      {agendas.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Nenhuma agenda cadastrada.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {agendas.map((a, i) => (
            <ItemConteudo
              key={a.id}
              tabela="calendars"
              id={a.id}
              titulo={a.nome}
              subtitulo={
                <span className="inline-flex items-center gap-2 break-all">
                  <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: a.cor }} />
                  {a.googleId}
                </span>
              }
              primeiro={i === 0}
              ultimo={i === agendas.length - 1}
              excluir={{ descricao: "A agenda sai da aba Calendário. A agenda no Google não é afetada." }}
            >
              <FormCalendario calendario={a} />
            </ItemConteudo>
          ))}
        </ul>
      )}
    </div>
  );
}
