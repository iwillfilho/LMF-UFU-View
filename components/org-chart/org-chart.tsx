import Link from "next/link";
import type { CSSProperties } from "react";

import type { Diretoria, Membro } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Organograma provisório (CSS + linhas simples), até o design final vir do Figma.
 * Pedidos do PDF: Assembleia Geral acima da Presidência; Conselho como bloco
 * à parte, sem linhas e sem membros listados.
 */

type Props = {
  diretorias: Diretoria[];
  /** Pessoas com cargo de liderança na gestão atual, por slug de diretoria. */
  liderancas: Map<string, Membro[]>;
  /** Monta o link que abre o pop-up de currículo. */
  hrefMembro: (slug: string) => string;
};

const PRESIDENCIA = "presidencia";
const VICE = "vice-presidencia";

function Caixa({
  titulo,
  pessoas,
  hrefMembro,
  destaque,
  className,
}: {
  titulo: string;
  pessoas?: Membro[];
  hrefMembro: Props["hrefMembro"];
  destaque?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border px-5 py-4 text-center",
        destaque ? "border-primary/50 bg-primary/10" : "border-border bg-card",
        className,
      )}
    >
      <p className="font-serif text-xl leading-tight">{titulo}</p>
      {pessoas && pessoas.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5 text-sm">
          {pessoas.map((p) => (
            <li key={p.slug}>
              <Link href={hrefMembro(p.slug)} scroll={false} className="text-muted-foreground hover:text-ink-accent">
                {p.nome}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Linha() {
  return <div aria-hidden className="mx-auto h-8 w-px bg-border" />;
}

export function OrgChart({ diretorias, liderancas, hrefMembro }: Props) {
  const presidencia = diretorias.find((d) => d.slug === PRESIDENCIA);
  const vice = diretorias.find((d) => d.slug === VICE);
  const demais = diretorias.filter((d) => d.slug !== PRESIDENCIA && d.slug !== VICE);

  return (
    <figure aria-label="Organograma da LMF UFU" className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-start">
      <div className="mx-auto w-full max-w-5xl">
        <Caixa titulo="Assembleia Geral" hrefMembro={hrefMembro} destaque className="mx-auto max-w-xs" />
        {presidencia ? (
          <>
            <Linha />
            <Caixa
              titulo={presidencia.nome}
              pessoas={liderancas.get(presidencia.slug)}
              hrefMembro={hrefMembro}
              className="mx-auto max-w-xs"
            />
          </>
        ) : null}
        {vice ? (
          <>
            <Linha />
            <Caixa titulo={vice.nome} pessoas={liderancas.get(vice.slug)} hrefMembro={hrefMembro} className="mx-auto max-w-xs" />
          </>
        ) : null}

        {demais.length > 0 ? (
          <>
            <Linha />
            {/* Celular: lista empilhada. Desktop: uma linha horizontal ligando as diretorias. */}
            <ul
              style={{ "--n": demais.length } as CSSProperties}
              className={cn(
                "relative mx-auto grid max-w-xs gap-3 lg:max-w-none",
                "lg:grid-cols-[repeat(var(--n),minmax(0,1fr))] lg:gap-4 lg:pt-6",
                "lg:before:absolute lg:before:top-0 lg:before:h-px lg:before:bg-border",
                "lg:before:right-[calc(100%/(var(--n)*2))] lg:before:left-[calc(100%/(var(--n)*2))]",
              )}
            >
              {demais.map((d) => (
                <li
                  key={d.slug}
                  className="relative lg:before:absolute lg:before:-top-6 lg:before:left-1/2 lg:before:h-6 lg:before:w-px lg:before:bg-border"
                >
                  <Caixa titulo={d.nome} pessoas={liderancas.get(d.slug)} hrefMembro={hrefMembro} className="h-full" />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {/* Conselho: bloco à parte, sem conexões e sem membros. */}
      <aside aria-label="Conselho" className="mx-auto w-full max-w-xs lg:mt-0">
        <Caixa titulo="Conselho" hrefMembro={hrefMembro} className="border-dashed" />
      </aside>
      <figcaption className="sr-only">
        Assembleia Geral no topo, seguida da Presidência, da Vice-Presidência e das diretorias. O Conselho fica à parte.
      </figcaption>
    </figure>
  );
}
