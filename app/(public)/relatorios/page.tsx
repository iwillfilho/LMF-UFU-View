import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { MemberDialog } from "@/components/site/member-dialog";
import { PageIntro } from "@/components/site/page-intro";
import { ReportCard } from "@/components/site/report-card";
import { ReportFilters } from "@/components/site/report-filters";
import { plural } from "@/lib/format";
import { getEquipe, getNucleos, getRelatorios } from "@/lib/queries";
import { aplicarFiltros, hrefRelatorios, lerFiltros } from "@/lib/relatorios-filtros";

export const metadata: Metadata = {
  title: "Relatórios",
  description: "Teses de investimento e relatórios de iniciação produzidos pelos núcleos Asset, Equity e Quant da LMF UFU.",
};

export default function Page({ searchParams }: PageProps<"/relatorios">) {
  return (
    <>
      <PageIntro titulo="Relatórios">
        Teses de investimento dos membros efetivos e relatórios de iniciação dos trainees. Acesso aberto, em PDF.
      </PageIntro>
      {/* Os filtros vêm da URL, então este trecho é renderizado a cada requisição. */}
      <Suspense fallback={<Carregando />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/relatorios">["searchParams"] }) {
  const [sp, relatorios, nucleos, { membros }] = await Promise.all([searchParams, getRelatorios(), getNucleos(), getEquipe()]);
  const filtros = lerFiltros(sp);
  const lista = aplicarFiltros(relatorios, filtros);
  const autorNome = membros.find((m) => m.slug === filtros.autor)?.nome;

  const pessoas = membros.map((m) => ({ slug: m.slug, nome: m.nome, status: m.status, relatorios: m.relatorios }));

  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-10">
      <aside aria-label="Filtros" className="lg:sticky lg:top-24 lg:order-2 lg:self-start">
        <ReportFilters filtros={filtros} nucleos={nucleos.map((n) => ({ slug: n.slug, nome: n.nome }))} pessoas={pessoas} />
      </aside>

      <section aria-labelledby="resultado-titulo" className="lg:order-1">
        <h2 id="resultado-titulo" className="font-sans text-sm font-normal text-muted-foreground" aria-live="polite">
          {plural(lista.length, "relatório", "relatórios")}
          {autorNome ? ` de ${autorNome}` : null}
        </h2>
        {lista.length === 0 ? (
          <p className="mt-6 max-w-[62ch] rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-dashed border-border p-6 text-muted-foreground">
            Nenhum relatório publicado com esses filtros.{" "}
            <Link href="/relatorios" className="text-ink-accent underline-offset-4 hover:underline">
              Ver todos
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {lista.map((r) => (
              <li key={r.slug}>
                <ReportCard relatorio={r} hrefAutor={(slug) => hrefRelatorios(filtros, {}, { membro: slug })} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <MemberDialog membros={membros} />
    </div>
  );
}

function Carregando() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-10" aria-busy="true">
      <p className="sr-only">Carregando relatórios…</p>
      <div className="grid gap-6 md:grid-cols-2 lg:mr-[23rem]">
        {[0, 1].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-[1.75rem_1.75rem_0.5rem_1.75rem] bg-card motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
