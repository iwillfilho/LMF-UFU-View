"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { formatar, type PontoSerie, SERIE, SERIES, type SerieId } from "@/lib/carteira-demo";
import { cn } from "@/lib/utils";

const PERIODOS = [
  { id: "3M", rotulo: "3 meses", semanas: 13 },
  { id: "6M", rotulo: "6 meses", semanas: 26 },
  { id: "12M", rotulo: "12 meses", semanas: 52 },
] as const;
type PeriodoId = (typeof PERIODOS)[number]["id"];

const cor = (id: SerieId) => `var(--serie-${id})`;

/** Passo "redondo" (1, 2, 2,5 ou 5 × 10^k) para ~4 linhas de grade. */
function passoRedondo(amplitude: number) {
  const bruto = amplitude / 4;
  const base = 10 ** Math.floor(Math.log10(bruto));
  return ([1, 2, 2.5, 5, 10].find((m) => m * base >= bruto) ?? 10) * base;
}

/** Afasta rótulos que se sobrepõem, mantendo a ordem vertical. */
function separar(ys: number[], minimo: number, topo: number, base: number) {
  const ordem = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ordem.length; k++) ordem[k].y = Math.max(ordem[k].y, ordem[k - 1].y + minimo);
  const excesso = ordem.at(-1)!.y - base;
  if (excesso > 0) for (const o of ordem) o.y -= excesso;
  for (let k = ordem.length - 2; k >= 0; k--) ordem[k].y = Math.min(ordem[k].y, ordem[k + 1].y - minimo);
  if (ordem[0].y < topo) {
    const d = topo - ordem[0].y;
    for (const o of ordem) o.y += d;
  }
  const saida = [...ys];
  for (const o of ordem) saida[o.i] = o.y;
  return saida;
}

export function GraficoDesempenho() {
  const [periodo, setPeriodo] = useState<PeriodoId>("12M");
  const [indice, setIndice] = useState<number | null>(null);
  const [largura, setLargura] = useState(720);
  const caixaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = caixaRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setLargura(Math.round(e.contentRect.width)));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const semanas = PERIODOS.find((p) => p.id === periodo)!.semanas;
  const pontos = useMemo(() => SERIE.slice(-(semanas + 1)), [semanas]);
  // Rentabilidade acumulada no período, em fração (rebase no primeiro ponto).
  const acumulado = useMemo(
    () =>
      pontos.map((p) => ({
        data: p.data,
        carteira: p.carteira / pontos[0].carteira - 1,
        ibovespa: p.ibovespa / pontos[0].ibovespa - 1,
        cdi: p.cdi / pontos[0].cdi - 1,
      })),
    [pontos],
  );

  const estreito = largura < 520;
  const altura = estreito ? 240 : 300;
  const m = { topo: 12, base: 28, esq: 48, dir: estreito ? 78 : 118 };
  const larguraUtil = Math.max(largura - m.esq - m.dir, 10);
  const alturaUtil = altura - m.topo - m.base;

  const valores = acumulado.flatMap((p) => SERIES.map((s) => p[s.id]));
  const passo = passoRedondo(Math.max(...valores, 0) - Math.min(...valores, 0) || 0.1);
  const yMin = Math.floor(Math.min(...valores, 0) / passo) * passo;
  const yMax = Math.ceil(Math.max(...valores, 0) / passo) * passo;
  const ticksY: number[] = [];
  for (let v = yMin; v <= yMax + passo / 2; v += passo) ticksY.push(Number(v.toFixed(6)));

  const x = (i: number) => m.esq + (i / (acumulado.length - 1)) * larguraUtil;
  const y = (v: number) => m.topo + (1 - (v - yMin) / (yMax - yMin)) * alturaUtil;

  // Rótulos do eixo X: primeira semana de cada mês, espaçados para caber.
  const ticksX = acumulado
    .map((p, i) => ({ i, mes: p.data.slice(0, 7) }))
    .filter((t, k, arr) => k === 0 || t.mes !== arr[k - 1].mes);
  const salto = Math.max(1, Math.ceil((ticksX.length * 46) / larguraUtil));
  const ticksXVisiveis = ticksX.filter((_, k) => k % salto === 0);

  const ultimo = acumulado.at(-1)!;
  const yRotulos = separar(
    SERIES.map((s) => y(ultimo[s.id])),
    estreito ? 30 : 18,
    m.topo + 6,
    m.topo + alturaUtil,
  );

  const ativo = indice !== null ? acumulado[Math.min(indice, acumulado.length - 1)] : null;
  const xAtivo = indice !== null ? x(Math.min(indice, acumulado.length - 1)) : 0;

  function moverPara(clientX: number) {
    const caixa = caixaRef.current?.getBoundingClientRect();
    if (!caixa) return;
    const rel = (clientX - caixa.left - m.esq) / larguraUtil;
    setIndice(Math.max(0, Math.min(acumulado.length - 1, Math.round(rel * (acumulado.length - 1)))));
  }

  function teclado(e: React.KeyboardEvent) {
    const ultimoIndice = acumulado.length - 1;
    const atual = indice ?? ultimoIndice;
    const proximo =
      e.key === "ArrowLeft" ? atual - 1
      : e.key === "ArrowRight" ? atual + 1
      : e.key === "Home" ? 0
      : e.key === "End" ? ultimoIndice
      : null;
    if (e.key === "Escape") setIndice(null);
    if (proximo === null) return;
    e.preventDefault();
    setIndice(Math.max(0, Math.min(ultimoIndice, proximo)));
  }

  const resumo = SERIES.map((s) => `${s.nome} ${formatar.pctSinal(ultimo[s.id])}`).join(", ");

  return (
    <figure className="rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <figcaption>
          <h2 className="font-sans text-lg font-medium text-foreground">Rentabilidade acumulada</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatar.dataLonga(pontos[0].data)} a {formatar.dataLonga(ultimo.data)}
          </p>
        </figcaption>
        <div role="group" aria-label="Período" className="flex rounded-full border border-border p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={periodo === p.id}
              aria-label={p.rotulo}
              onClick={() => {
                setPeriodo(p.id);
                setIndice(null);
              }}
              className={cn(
                "min-h-9 min-w-12 rounded-full px-3 text-sm transition-colors",
                periodo === p.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.id}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground" aria-label="Legenda">
        {SERIES.map((s) => (
          <li key={s.id} className="inline-flex items-center gap-2">
            <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: cor(s.id) }} />
            {s.nome}
          </li>
        ))}
      </ul>

      <div
        ref={caixaRef}
        className="relative mt-3 touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={0}
        aria-label={`Gráfico interativo. Use as setas para percorrer as semanas. ${resumo}.`}
        onKeyDown={teclado}
        onFocus={() => setIndice((i) => i ?? acumulado.length - 1)}
        onBlur={() => setIndice(null)}
        onPointerMove={(e) => moverPara(e.clientX)}
        onPointerDown={(e) => moverPara(e.clientX)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setIndice(null)}
      >
        <svg width={largura} height={altura} role="img" aria-label={`Rentabilidade acumulada no período: ${resumo}`} className="block overflow-visible">
          {/* Grade horizontal recessiva; o zero é a linha de base. */}
          {ticksY.map((v) => (
            <g key={v}>
              <line
                x1={m.esq}
                x2={m.esq + larguraUtil}
                y1={y(v)}
                y2={y(v)}
                className={v === 0 ? "stroke-muted-foreground/50" : "stroke-border"}
                strokeWidth={1}
              />
              <text x={m.esq - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                {formatar.pctSinal(v).replace(",0%", "%")}
              </text>
            </g>
          ))}
          {ticksXVisiveis.map((t) => (
            <text key={t.i} x={x(t.i)} y={altura - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
              {formatar.mesAno(acumulado[t.i].data)}
            </text>
          ))}

          {/* Séries: CDI e Ibovespa atrás, a carteira por cima. */}
          {[...SERIES].reverse().map((s) => (
            <path
              key={s.id}
              d={acumulado.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[s.id]).toFixed(1)}`).join("")}
              fill="none"
              stroke={cor(s.id)}
              strokeWidth={s.id === "carteira" ? 2.5 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Rótulos diretos no fim de cada linha (identidade sem depender só da cor). */}
          {SERIES.map((s, k) => (
            <g key={s.id}>
              <line
                x1={x(acumulado.length - 1) + 4}
                x2={x(acumulado.length - 1) + 12}
                y1={y(ultimo[s.id])}
                y2={yRotulos[k]}
                stroke={cor(s.id)}
                strokeWidth={1.5}
              />
              <text x={x(acumulado.length - 1) + 16} y={yRotulos[k]} dy="0.32em" className="fill-foreground text-[12px]">
                {estreito ? (
                  <>
                    <tspan x={x(acumulado.length - 1) + 16} dy="-0.35em" className="fill-muted-foreground">
                      {s.curto}
                    </tspan>
                    <tspan x={x(acumulado.length - 1) + 16} dy="1.2em" className="font-medium tabular-nums">
                      {formatar.pctSinal(ultimo[s.id])}
                    </tspan>
                  </>
                ) : (
                  <>
                    <tspan className="fill-muted-foreground">{s.curto} </tspan>
                    <tspan className="font-medium tabular-nums">{formatar.pctSinal(ultimo[s.id])}</tspan>
                  </>
                )}
              </text>
            </g>
          ))}

          {/* Camada de hover: linha vertical + pontos com anel da cor da superfície. */}
          {ativo ? (
            <g pointerEvents="none">
              <line x1={xAtivo} x2={xAtivo} y1={m.topo} y2={m.topo + alturaUtil} className="stroke-muted-foreground/60" strokeWidth={1} />
              {SERIES.map((s) => (
                <circle key={s.id} cx={xAtivo} cy={y(ativo[s.id])} r={4.5} fill={cor(s.id)} className="stroke-card" strokeWidth={2} />
              ))}
            </g>
          ) : null}
        </svg>

        {ativo ? (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 min-w-44 rounded-xl border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg"
            style={
              xAtivo > largura / 2
                ? { right: Math.max(largura - xAtivo + 12, 0) }
                : { left: Math.min(xAtivo + 12, largura - 180) }
            }
          >
            <p className="text-xs text-muted-foreground">Semana de {formatar.dataCurta(ativo.data)}</p>
            <dl className="mt-1.5 space-y-1">
              {SERIES.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4">
                  <dt className="inline-flex items-center gap-2 text-muted-foreground">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: cor(s.id) }} />
                    {s.nome}
                  </dt>
                  <dd className="font-medium tabular-nums">{formatar.pctSinal(ativo[s.id])}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>

      <TabelaDados acumulado={acumulado} />
    </figure>
  );
}

/** Mesmos dados em tabela (fim de cada mês), para leitor de tela e para conferir números. */
function TabelaDados({ acumulado }: { acumulado: (Pick<PontoSerie, "data"> & Record<SerieId, number>)[] }) {
  const fimDeMes = acumulado.filter((p, i, arr) => i === arr.length - 1 || arr[i + 1].data.slice(0, 7) !== p.data.slice(0, 7));
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver dados em tabela</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[22rem] text-left tabular-nums">
          <caption className="sr-only">Rentabilidade acumulada no fim de cada mês</caption>
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-4 font-normal">Data</th>
              {SERIES.map((s) => (
                <th key={s.id} scope="col" className="py-2 pr-4 text-right font-normal">
                  {s.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fimDeMes.map((p) => (
              <tr key={p.data} className="border-b border-border/60 last:border-0">
                <th scope="row" className="py-1.5 pr-4 font-normal text-muted-foreground">
                  {formatar.dataCurta(p.data)}
                </th>
                {SERIES.map((s) => (
                  <td key={s.id} className="py-1.5 pr-4 text-right">
                    {formatar.pctSinal(p[s.id])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
