"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type FiltrosRelatorios, hrefRelatorios } from "@/lib/relatorios-filtros";
import { cn } from "@/lib/utils";

type Pessoa = { slug: string; nome: string; status: "ativo" | "alumni"; relatorios: number };
type Grupo = "todos" | "ativo" | "alumni";

const GRUPOS: { valor: Grupo; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "ativo", label: "Ativos" },
  { valor: "alumni", label: "Alumni" },
];

function Opcao({ href, ativo, children }: { href: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={ativo ? "true" : undefined}
      className={cn(
        "pill border transition-colors",
        ativo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-ink-accent hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Filtros da coluna direita (no lugar de "Publicações recentes" do site antigo):
 * núcleo, tipo e pessoa. A pessoa é um combobox com busca por nome e
 * alternância Todos / Ativos / Alumni, como pedido no PDF.
 */
export function ReportFilters({
  filtros,
  nucleos,
  pessoas,
}: {
  filtros: FiltrosRelatorios;
  nucleos: { slug: string; nome: string }[];
  pessoas: Pessoa[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [grupo, setGrupo] = useState<Grupo>("todos");

  const selecionada = pessoas.find((p) => p.slug === filtros.autor);
  const visiveis = pessoas.filter((p) => grupo === "todos" || p.status === grupo);
  const temFiltro = Boolean(filtros.nucleo || filtros.tipo || filtros.autor);

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-3xl">Filtrar</h2>
        {temFiltro ? (
          <Link href="/relatorios" scroll={false} className="text-sm text-muted-foreground underline-offset-4 hover:text-ink-accent hover:underline">
            Limpar filtros
          </Link>
        ) : null}
      </div>

      <fieldset>
        <legend className="text-sm text-muted-foreground">Núcleo</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          <Opcao href={hrefRelatorios(filtros, { nucleo: null })} ativo={!filtros.nucleo}>
            Todos
          </Opcao>
          {nucleos.map((n) => (
            <Opcao key={n.slug} href={hrefRelatorios(filtros, { nucleo: n.slug })} ativo={filtros.nucleo === n.slug}>
              {n.nome}
            </Opcao>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm text-muted-foreground">Tipo</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          <Opcao href={hrefRelatorios(filtros, { tipo: null })} ativo={!filtros.tipo}>
            Todos
          </Opcao>
          <Opcao href={hrefRelatorios(filtros, { tipo: "tese" })} ativo={filtros.tipo === "tese"}>
            Teses
          </Opcao>
          <Opcao href={hrefRelatorios(filtros, { tipo: "iniciacao" })} ativo={filtros.tipo === "iniciacao"}>
            Iniciação
          </Opcao>
        </div>
      </fieldset>

      <div>
        <p id="pessoa-rotulo" className="text-sm text-muted-foreground">
          Pessoa
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Popover open={aberto} onOpenChange={setAberto}>
            <PopoverTrigger asChild>
              <button
                type="button"
                role="combobox"
                aria-expanded={aberto}
                aria-controls="lista-pessoas"
                aria-labelledby="pessoa-rotulo"
                className="flex h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-[0.9rem_0.9rem_0.3rem_0.9rem] border border-input bg-background px-3.5 text-left text-[0.9375rem] dark:bg-input/20"
              >
                <span className={cn("truncate", !selecionada && "text-muted-foreground")}>
                  {selecionada?.nome ?? "Todas as pessoas"}
                </span>
                <ChevronsUpDown className="size-4 shrink-0 opacity-60" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
              <div role="group" aria-label="Mostrar" className="flex gap-1 border-b border-border p-2">
                {GRUPOS.map((g) => (
                  <button
                    key={g.valor}
                    type="button"
                    aria-pressed={grupo === g.valor}
                    onClick={() => setGrupo(g.valor)}
                    className={cn(
                      "pill flex-1 justify-center transition-colors",
                      grupo === g.valor ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <Command>
                <CommandInput placeholder="Buscar por nome…" />
                <CommandList id="lista-pessoas">
                  <CommandEmpty>Ninguém com esse nome.</CommandEmpty>
                  <CommandGroup>
                    {visiveis.map((p) => (
                      <CommandItem
                        key={p.slug}
                        value={`${p.nome} ${p.slug}`}
                        onSelect={() => {
                          setAberto(false);
                          router.push(hrefRelatorios(filtros, { autor: p.slug }), { scroll: false });
                        }}
                      >
                        <Check className={cn("size-4", filtros.autor === p.slug ? "opacity-100" : "opacity-0")} aria-hidden />
                        <span className="flex-1 truncate">{p.nome}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{p.relatorios}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selecionada ? (
            <Link
              href={hrefRelatorios(filtros, { autor: null })}
              scroll={false}
              aria-label={`Remover filtro: ${selecionada.nome}`}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border hover:bg-secondary"
            >
              <X className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
