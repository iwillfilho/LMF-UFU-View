import type { Metadata } from "next";
import Link from "next/link";

import { HistoricoRH, totais } from "@/components/area-restrita/historico-rh";
import { FormLancamento } from "@/components/area-restrita/rh";
import { exigirPapel } from "@/lib/auth";
import { compararGestao, gestaoDe } from "@/lib/format";
import { ADMIN, RH, temPapel } from "@/lib/papeis";
import { getMembrosRH, getRegistrosRH } from "@/lib/restrito";

export const metadata: Metadata = { title: "RH" };

const botaoSecundario = "inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm hover:bg-secondary";

export default async function Page({ searchParams }: PageProps<"/area-restrita/rh">) {
  const sessao = await exigirPapel(RH);
  const admin = temPapel(sessao.papeis, ADMIN);
  const [registros, membros, params] = await Promise.all([getRegistrosRH(), getMembrosRH(), searchParams]);

  const atual = gestaoDe(new Date());
  const gestoes = [...new Set([atual, ...registros.map((r) => r.gestao)])].sort(compararGestao).reverse();
  const gestao = typeof params.gestao === "string" && gestoes.includes(params.gestao) ? params.gestao : atual;
  const selecionado = typeof params.membro === "string" ? membros.find((m) => m.id === params.membro) : undefined;

  // Resumo: ativos sempre aparecem; alumni só se tiverem lançamento na gestão.
  const daGestao = registros.filter((r) => r.gestao === gestao);
  const linhas = membros
    .filter((m) => !m.alumni || daGestao.some((r) => r.membroId === m.id))
    .map((m) => ({ ...m, ...totais(daGestao.filter((r) => r.membroId === m.id)) }));
  const doSelecionado = selecionado ? registros.filter((r) => r.membroId === selecionado.id) : [];
  const link = (membro?: string) =>
    `/area-restrita/rh?${new URLSearchParams({ gestao, ...(membro ? { membro } : {}) })}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <h1 className="text-title">RH</h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Pontos e strikes dos membros. Cada membro vê os próprios em Meus pontos, com o motivo.
        {admin ? " Correções e exclusões ficam no histórico de cada membro." : null}
      </p>

      <section aria-labelledby="lancar" className="mt-12 max-w-2xl">
        <h2 id="lancar" className="text-3xl">
          Lançar
        </h2>
        <div className="mt-6">
          {membros.length === 0 ? (
            <p className="text-muted-foreground">Nenhum membro cadastrado ainda.</p>
          ) : (
            <FormLancamento
              key={selecionado?.id ?? "nenhum"}
              membros={membros}
              gestaoPadrao={atual}
              membroPadrao={selecionado?.id}
            />
          )}
        </div>
      </section>

      <section aria-labelledby="resumo" className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="resumo" className="text-3xl">
            Resumo da gestão {gestao}
          </h2>
          {/* Formulário GET: funciona sem JavaScript e deixa a gestão na URL. */}
          <form action="/area-restrita/rh" className="flex items-end gap-2">
            {selecionado ? <input type="hidden" name="membro" value={selecionado.id} /> : null}
            <label className="grid gap-1.5 text-sm">
              Gestão
              <select
                name="gestao"
                defaultValue={gestao}
                className="h-11 rounded-[0.9rem_0.9rem_0.3rem_0.9rem] border border-input bg-background px-3.5 dark:bg-input/20"
              >
                {gestoes.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={botaoSecundario}>
              Ver
            </button>
          </form>
        </div>
        {linhas.length === 0 ? (
          <p className="mt-6 text-muted-foreground">Nenhum membro ativo nesta gestão.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[22rem] text-left text-[0.9375rem]">
              <caption className="sr-only">Pontos e strikes por membro na gestão {gestao}</caption>
              <thead className="border-b border-border text-sm text-muted-foreground">
                <tr>
                  <th scope="col" className="py-3 pr-4 font-normal">
                    Membro
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-normal">
                    Pontos
                  </th>
                  <th scope="col" className="py-3 pl-4 text-right font-normal">
                    Strikes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {linhas.map((m) => (
                  <tr key={m.id} className={m.id === selecionado?.id ? "bg-secondary/40" : undefined}>
                    <th scope="row" className="py-2 pr-4 font-normal">
                      <Link
                        href={`${link(m.id)}#historico`}
                        aria-current={m.id === selecionado?.id ? "true" : undefined}
                        className="inline-flex min-h-10 items-center underline-offset-4 hover:underline"
                      >
                        {m.nome}
                        {m.alumni ? <span className="ml-2 text-sm text-muted-foreground">Alumni</span> : null}
                      </Link>
                    </th>
                    <td className="px-4 py-2 text-right tabular-nums">{m.pontos}</td>
                    <td className="py-2 pl-4 text-right tabular-nums">{m.strikes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selecionado ? (
        <section id="historico" aria-labelledby="historico-titulo" className="mt-16 scroll-mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="historico-titulo" className="text-3xl">
              Histórico de {selecionado.nome}
            </h2>
            <Link href={link()} className={botaoSecundario}>
              Fechar histórico
            </Link>
          </div>
          <div className="mt-6">
            {doSelecionado.length === 0 ? (
              <p className="text-muted-foreground">Nenhum lançamento para este membro.</p>
            ) : (
              <HistoricoRH registros={doSelecionado} mostrarAutor admin={admin} />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
