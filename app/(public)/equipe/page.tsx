import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { OrgChart } from "@/components/org-chart/org-chart";
import { MemberCard } from "@/components/site/member-card";
import { MemberDialog } from "@/components/site/member-dialog";
import { PageIntro } from "@/components/site/page-intro";
import { descricaoCargo, liderancasPorDiretoria, membrosDaGestao } from "@/lib/equipe";
import { getDiretorias, getEquipe, getNucleos } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Equipe",
  description: "Organograma da LMF UFU e os membros de cada núcleo na gestão atual.",
};

const hrefMembro = (slug: string) => `/equipe?membro=${slug}`;

export default async function Page() {
  const [{ gestaoAtual, membros }, diretorias, nucleos] = await Promise.all([getEquipe(), getDiretorias(), getNucleos()]);

  const daGestao = membrosDaGestao(membros, gestaoAtual);
  const grupos = [
    ...nucleos.map((n) => ({
      id: n.slug,
      titulo: `Núcleo ${n.nome}`,
      subtitulo: n.area,
      membros: daGestao.filter((m) => m.atual?.nucleoSlug === n.slug),
    })),
    {
      id: "presidencia",
      titulo: "Presidência",
      subtitulo: null,
      membros: daGestao.filter((m) => !m.atual?.nucleoSlug),
    },
  ].filter((g) => g.membros.length > 0);

  return (
    <>
      <PageIntro titulo="Nossa equipe">
        {gestaoAtual ? `Gestão ${gestaoAtual}. ` : null}
        Clique em uma pessoa para ver o currículo na liga: cargos, gestões e relatórios publicados.
      </PageIntro>

      <section aria-labelledby="organograma-titulo" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
        <h2 id="organograma-titulo" className="mb-10 text-4xl">
          Organograma
        </h2>
        <OrgChart diretorias={diretorias} liderancas={liderancasPorDiretoria(membros, gestaoAtual)} hrefMembro={hrefMembro} />
      </section>

      <section aria-labelledby="membros-titulo" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
          <h2 id="membros-titulo" className="text-4xl">
            Membros por núcleo
          </h2>
          {grupos.length === 0 ? (
            <p className="mt-6 text-muted-foreground">Os membros da gestão atual ainda não foram cadastrados.</p>
          ) : (
            <div className="mt-12 space-y-16">
              {grupos.map((g) => (
                <section key={g.id} aria-labelledby={`grupo-${g.id}`}>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border pb-3">
                    <h3 id={`grupo-${g.id}`} className="text-3xl">
                      {g.titulo}
                    </h3>
                    {g.subtitulo ? <p className="text-sm text-muted-foreground">{g.subtitulo}</p> : null}
                  </div>
                  <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                    {g.membros.map((m) => (
                      <li key={m.slug}>
                        <MemberCard membro={m} href={hrefMembro(m.slug)} detalhe={descricaoCargo(m)} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="alumni-chamada" className="px-4 pb-20 sm:px-6 lg:px-10 lg:pb-28">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 rounded-[2.5rem_2.5rem_0.75rem_2.5rem] bg-card p-8 sm:p-12">
          <div>
            <h2 id="alumni-chamada" className="text-4xl">
              Quem já passou pela liga
            </h2>
            <p className="mt-3 max-w-[52ch] text-muted-foreground">
              Ex-membros seguem fazendo parte da história da LMF. Veja onde estão e como foi a trajetória de cada um.
            </p>
          </div>
          <Link
            href="/equipe/alumni"
            className="pill bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum dark:hover:bg-lilac dark:hover:text-galaxy"
          >
            Conhecer os alumni
          </Link>
        </div>
      </section>

      <Suspense fallback={null}>
        <MemberDialog membros={membros} />
      </Suspense>
    </>
  );
}
