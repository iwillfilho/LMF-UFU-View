import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { formatarData } from "@/lib/format";
import { TIPO_RELATORIO_LABEL } from "@/lib/labels";
import type { Relatorio } from "@/lib/queries";

export function ReportCard({
  relatorio: r,
  hrefAutor,
  nivelTitulo = 3,
}: {
  relatorio: Relatorio;
  /** Link do nome do autor (abre o pop-up de currículo). Sem ele, o nome é só texto. */
  hrefAutor?: (slug: string) => string;
  nivelTitulo?: 2 | 3;
}) {
  const Titulo = nivelTitulo === 2 ? "h2" : "h3";
  const meta = [r.nucleo?.nome, r.setor].filter(Boolean).join(" · ");

  return (
    <article className="flex h-full flex-col rounded-[1.75rem_1.75rem_0.5rem_1.75rem] border border-border bg-card p-6 sm:p-7">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="pill bg-secondary text-secondary-foreground">{TIPO_RELATORIO_LABEL[r.tipo]}</span>
        {meta ? <span>{meta}</span> : null}
      </div>
      <Titulo className="mt-5 text-3xl leading-tight">{r.titulo}</Titulo>
      {r.resumo ? <p className="mt-3 text-muted-foreground">{r.resumo}</p> : null}

      <div className="mt-auto pt-6 text-sm">
        {r.autores.length > 0 ? (
          <p className="text-muted-foreground">
            Por{" "}
            {r.autores.map((a, i) => (
              <span key={a.slug}>
                {i > 0 ? (i === r.autores.length - 1 ? " e " : ", ") : null}
                {hrefAutor && !a.anonimo ? (
                  <Link href={hrefAutor(a.slug)} scroll={false} className="text-foreground underline-offset-4 hover:text-ink-accent hover:underline">
                    {a.nome}
                  </Link>
                ) : (
                  <span className="text-foreground">{a.nome}</span>
                )}
              </span>
            ))}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {r.publicadoEm ? (
            <time dateTime={r.publicadoEm} className="text-muted-foreground">
              {formatarData(r.publicadoEm, "curta")}
            </time>
          ) : (
            <span />
          )}
          {r.pdfUrl ? (
            <a
              href={r.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[0.9375rem] text-ink-accent underline-offset-4 hover:underline"
            >
              Ler relatório <span className="sr-only">{r.titulo} (PDF, abre em nova aba)</span>
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
