import type { Metadata } from "next";

import { HistoricoRH, totais } from "@/components/area-restrita/historico-rh";
import { exigirPapel } from "@/lib/auth";
import { gestaoDe } from "@/lib/format";
import { TODOS } from "@/lib/papeis";
import { getMeusPontos } from "@/lib/restrito";

export const metadata: Metadata = { title: "Meus pontos" };

const caixa =
  "mt-10 max-w-[62ch] rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-dashed border-border p-6 text-muted-foreground";

export default async function Page() {
  await exigirPapel(TODOS);
  const { membro, registros } = await getMeusPontos();
  const gestao = gestaoDe(new Date());
  const atual = totais(registros.filter((r) => r.gestao === gestao));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <h1 className="text-title">Meus pontos</h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Pontos e strikes lançados pelo RH, com o motivo de cada um. Só você e o RH veem esta página.
      </p>

      {!membro ? (
        <p className={caixa}>
          Sua conta ainda não está ligada a um cadastro de membro, então não há pontos para mostrar. Fale com o Diretor
          de RH.
        </p>
      ) : (
        <>
          <section aria-labelledby="resumo" className="mt-10">
            <h2 id="resumo" className="sr-only">
              Resumo da gestão {gestao}
            </h2>
            <dl className="grid max-w-md grid-cols-2 gap-3">
              <Resumo rotulo={`Pontos em ${gestao}`} valor={atual.pontos} />
              <Resumo rotulo={`Strikes em ${gestao}`} valor={atual.strikes} />
            </dl>
          </section>

          <section aria-labelledby="historico" className="mt-14">
            <h2 id="historico" className="text-3xl">
              Histórico
            </h2>
            {registros.length === 0 ? (
              <p className={caixa}>Nenhum ponto ou strike lançado para você ainda.</p>
            ) : (
              <div className="mt-6">
                <HistoricoRH registros={registros} />
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-2xl border border-border p-5">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="mt-1 font-serif text-4xl text-foreground">{valor}</dd>
    </div>
  );
}
