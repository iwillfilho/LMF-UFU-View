import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AutoCarousel } from "@/components/site/auto-carousel";
import { PageIntro } from "@/components/site/page-intro";
import { membrosDaGestao } from "@/lib/equipe";
import { plural } from "@/lib/format";
import { type Membro, type Nucleo, type Parceiro, getEquipe, getNucleos, getRelatorios } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Núcleos",
  description: "Asset Management, Equity Research e Análise Quantitativa: os núcleos de estudo da LMF UFU.",
};

function CartaoParceiro({ parceiro }: { parceiro: Parceiro }) {
  const conteudo = (
    <span className="flex h-28 items-center justify-center rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-border bg-background px-4 text-center font-serif text-2xl">
      {parceiro.logoUrl ? (
        <Image src={parceiro.logoUrl} alt={parceiro.nome} width={160} height={64} className="max-h-16 w-auto object-contain" />
      ) : (
        parceiro.nome
      )}
    </span>
  );
  return parceiro.url ? (
    <a href={parceiro.url} target="_blank" rel="noopener noreferrer" className="block hover:text-ink-accent">
      {conteudo}
    </a>
  ) : (
    conteudo
  );
}

function CartaoMembro({ membro }: { membro: Membro }) {
  return (
    <Link href={`/equipe?membro=${membro.slug}`} className="group block">
      <Image
        src={membro.fotoUrl}
        alt=""
        width={240}
        height={240}
        className="aspect-square w-full rounded-[1.25rem_1.25rem_0.35rem_1.25rem] object-cover"
      />
      <span className="mt-2 block truncate text-[0.9375rem] group-hover:text-ink-accent">{membro.nome}</span>
      <span className="block truncate text-xs text-muted-foreground">{membro.curso ?? "Curso não informado"}</span>
    </Link>
  );
}

function SecaoNucleo({ nucleo, equipe, relatorios, primeira }: { nucleo: Nucleo; equipe: Membro[]; relatorios: number; primeira: boolean }) {
  const usarParceiros = nucleo.parceiros.length > 0;

  return (
    <section id={nucleo.slug} aria-labelledby={`${nucleo.slug}-titulo`} className="scroll-mt-24 border-t border-border">
      {/* Faixa com imagem no topo da seção */}
      <div className="relative h-48 overflow-hidden sm:h-64 lg:h-72">
        <Image
          src={nucleo.bannerUrl}
          alt=""
          fill
          priority={primeira}
          sizes="100vw"
          className="object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-plum/30" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-10">
          {nucleo.area ? <span className="pill bg-background/80 text-foreground backdrop-blur">{nucleo.area}</span> : null}
          <h2 id={`${nucleo.slug}-titulo`} className="mt-3 text-[clamp(3rem,2rem+4vw,5.5rem)] leading-[0.95]">
            {nucleo.nome}
          </h2>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-10 lg:py-20">
        <div>
          {nucleo.descricao ? <p className="max-w-[52ch] text-xl leading-relaxed text-foreground/90">{nucleo.descricao}</p> : null}
          <p className="mt-6 text-sm text-muted-foreground">
            {plural(equipe.length, "membro", "membros")} na gestão atual · {plural(relatorios, "relatório publicado", "relatórios publicados")}
          </p>
          <Link
            href={`/relatorios?nucleo=${nucleo.slug}`}
            className="pill mt-8 bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum dark:hover:bg-lilac dark:hover:text-galaxy"
          >
            Ver relatórios do núcleo
          </Link>
        </div>

        <div>
          <h3 className="mb-5 font-sans text-sm font-normal text-muted-foreground">
            {usarParceiros ? "Parceiros do núcleo" : "Quem faz parte"}
          </h3>
          {usarParceiros ? (
            <AutoCarousel rotulo={`Parceiros do núcleo ${nucleo.nome}`}>
              {nucleo.parceiros.map((p) => (
                <CartaoParceiro key={p.id} parceiro={p} />
              ))}
            </AutoCarousel>
          ) : equipe.length > 0 ? (
            <AutoCarousel rotulo={`Equipe do núcleo ${nucleo.nome}`}>
              {equipe.map((m) => (
                <CartaoMembro key={m.slug} membro={m} />
              ))}
            </AutoCarousel>
          ) : (
            <p className="text-muted-foreground">
              A equipe deste núcleo aparece aqui assim que for cadastrada.{" "}
              <Link href="/equipe" className="inline-flex items-center gap-1 text-ink-accent underline-offset-4 hover:underline">
                Ver a equipe <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default async function Page() {
  const [nucleos, { gestaoAtual, membros }, relatorios] = await Promise.all([getNucleos(), getEquipe(), getRelatorios()]);
  const daGestao = membrosDaGestao(membros, gestaoAtual);

  return (
    <>
      <PageIntro titulo="Núcleos">
        Os campos de estudo da liga. Cada membro efetivo faz parte de um núcleo e publica relatórios na área dele.
      </PageIntro>
      <nav aria-label="Núcleos" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-10">
        <ul className="flex flex-wrap gap-2">
          {nucleos.map((n) => (
            <li key={n.slug}>
              <a href={`#${n.slug}`} className="pill border border-border text-muted-foreground hover:border-ink-accent hover:text-foreground">
                {n.nome}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {nucleos.map((n, i) => (
        <SecaoNucleo
          key={n.slug}
          nucleo={n}
          primeira={i === 0}
          equipe={daGestao.filter((m) => m.atual?.nucleoSlug === n.slug)}
          relatorios={relatorios.filter((r) => r.nucleo?.slug === n.slug).length}
        />
      ))}
    </>
  );
}
