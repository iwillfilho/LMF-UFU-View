import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";

import { GraficoDesempenho } from "@/components/area-restrita/carteira/grafico-desempenho";
import { coresCarteira } from "@/components/area-restrita/estilos";
import { exigirPapel } from "@/lib/auth";
import {
  ALOCACAO_SETOR,
  DATA_POSICAO,
  formatar,
  PATRIMONIO,
  POSICOES_CALCULADAS,
  quedaMaxima,
  retornoNoPeriodo,
  SERIE,
  volatilidade,
} from "@/lib/carteira-demo";
import { EFETIVOS } from "@/lib/papeis";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Carteira" };

const cartao = "rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-border bg-card";

export default async function Page() {
  await exigirPapel(EFETIVOS);

  const retorno = retornoNoPeriodo(SERIE, "carteira");
  const ibov = retornoNoPeriodo(SERIE, "ibovespa");
  const cdi = retornoNoPeriodo(SERIE, "cdi");
  const maiorPeso = ALOCACAO_SETOR[0].peso;

  return (
    <div className={cn("mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14", coresCarteira)}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-title">Carteira LMF</h1>
        <span className="pill border border-border text-sm text-muted-foreground">Demonstração · dados fictícios</span>
      </div>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Posição em {formatar.dataLonga(DATA_POSICAO)}. Valores ilustrativos para apresentação: não refletem a carteira
        real da liga nem são recomendação de investimento.
      </p>

      <section aria-labelledby="indicadores" className="mt-10">
        <h2 id="indicadores" className="sr-only">
          Indicadores
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador rotulo="Patrimônio" valor={formatar.reaisCurto(PATRIMONIO)} detalhe={`${POSICOES_CALCULADAS.length} posições`} />
          <Indicador
            rotulo="Rentabilidade em 12 meses"
            valor={formatar.pctSinal(retorno)}
            detalhe={`Ibovespa ${formatar.pctSinal(ibov)} · CDI ${formatar.pctSinal(cdi)}`}
          />
          <Indicador rotulo="Acima do Ibovespa" valor={formatar.pp(retorno - ibov)} detalhe={`${formatar.pp(retorno - cdi)} acima do CDI`} />
          <Indicador
            rotulo="Volatilidade anual"
            valor={formatar.pct(volatilidade(SERIE, "carteira"))}
            detalhe={`Queda máxima ${formatar.pctSinal(quedaMaxima(SERIE, "carteira"))}`}
          />
        </dl>
      </section>

      <section aria-label="Desempenho" className="mt-6">
        <GraficoDesempenho />
      </section>

      <section aria-labelledby="alocacao" className={cn(cartao, "mt-6 p-4 sm:p-6")}>
        <h2 id="alocacao" className="font-sans text-lg font-medium text-foreground">
          Alocação por setor
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Percentual do patrimônio em cada setor.</p>
        <ul className="mt-5 space-y-2.5">
          {ALOCACAO_SETOR.map((a) => (
            <li
              key={a.setor}
              className="grid grid-cols-[6.75rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[9.5rem_1fr_3.5rem]"
              title={`${a.setor}: ${formatar.reais(a.valor)} (${formatar.pct(a.peso)})`}
            >
              <span className="truncate text-muted-foreground">{a.setor}</span>
              <span className="h-3.5" aria-hidden>
                <span
                  className="block h-full rounded-r-[4px] bg-(--serie-carteira)"
                  style={{ width: `${(a.peso / maiorPeso) * 100}%` }}
                />
              </span>
              <span className="text-right tabular-nums text-foreground">{formatar.pct(a.peso)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="posicoes" className={cn(cartao, "mt-6 p-4 sm:p-6")}>
        <h2 id="posicoes" className="font-sans text-lg font-medium text-foreground">
          Posições
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm tabular-nums">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-4 font-normal">Ativo</th>
                <th scope="col" className="py-2 pr-4 font-normal">Setor</th>
                <th scope="col" className="py-2 pr-4 text-right font-normal">Preço médio</th>
                <th scope="col" className="py-2 pr-4 text-right font-normal">Preço atual</th>
                <th scope="col" className="py-2 pr-4 text-right font-normal">Valor</th>
                <th scope="col" className="py-2 pr-4 text-right font-normal">Peso</th>
                <th scope="col" className="py-2 text-right font-normal">Retorno</th>
              </tr>
            </thead>
            <tbody>
              {POSICOES_CALCULADAS.map((p) => (
                <tr key={p.ticker} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="py-2.5 pr-4 font-normal">
                    <span className="block font-medium text-foreground">{p.ticker}</span>
                    <span className="block text-xs text-muted-foreground">{p.nome}</span>
                  </th>
                  <td className="py-2.5 pr-4 text-muted-foreground">{p.setor}</td>
                  <td className="py-2.5 pr-4 text-right">{formatar.reais(p.precoMedio)}</td>
                  <td className="py-2.5 pr-4 text-right">{formatar.reais(p.precoAtual)}</td>
                  <td className="py-2.5 pr-4 text-right">{formatar.reais(p.valor)}</td>
                  <td className="py-2.5 pr-4 text-right">{formatar.pct(p.peso)}</td>
                  <td className="py-2.5 text-right">
                    <span className="inline-flex items-center gap-1 text-foreground">
                      {p.retorno >= 0 ? (
                        <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden />
                      ) : (
                        <ArrowDownRight className="size-3.5 text-muted-foreground" aria-hidden />
                      )}
                      {formatar.pctSinal(p.retorno)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe: string }) {
  return (
    <div className={cn(cartao, "p-5")}>
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="mt-1 font-serif text-4xl text-foreground tabular-nums">{valor}</dd>
      <dd className="mt-1 text-sm text-muted-foreground">{detalhe}</dd>
    </div>
  );
}
