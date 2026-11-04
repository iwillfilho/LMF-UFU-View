import { ArrowUpRight, Mail } from "lucide-react";
import Link from "next/link";

import { ContactForm } from "@/components/forms/contact-form";
import { NucleosCarousel } from "@/components/site/nucleos-carousel";
import { PostCard } from "@/components/site/post-card";
import { ReportCard } from "@/components/site/report-card";
import { InstagramIcon as Instagram, LinkedinIcon as Linkedin } from "@/components/site/social-icons";
import { mvv, quemSomos } from "@/lib/content";
import { getNucleos, getUltimasPublicacoes } from "@/lib/queries";
import { siteConfig } from "@/lib/site-config";

const linkExterno = { target: "_blank", rel: "noopener noreferrer" } as const;

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[clamp(2.25rem,1.5rem+2.6vw,3.75rem)] leading-[1.02]">
      {children}
    </h2>
  );
}

export default async function HomePage() {
  const { contato } = siteConfig;
  const [nucleos, publicacoes] = await Promise.all([getNucleos(), getUltimasPublicacoes(3)]);

  return (
    <>
      {/* HERO: slogan da marca + resumo de "Nossa história" + CTA para a equipe */}
      <section aria-labelledby="hero-titulo" className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="galaxy-glow animate-glow-in pointer-events-none absolute inset-x-[-30%] top-[-30%] -z-10 h-[150%] sm:inset-x-[-10%]"
        />
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-24 sm:px-6 sm:pt-24 lg:px-10 lg:pt-28 lg:pb-32">
          <h1 id="hero-titulo" className="text-display tracking-[-0.01em]">
            <span className="animate-rise block">Criada por estudantes,</span>
            <span className="animate-rise block text-ink-accent italic [animation-delay:180ms]">
              reconhecida pelo mercado.
            </span>
          </h1>

          <div className="animate-rise mt-14 grid gap-8 [animation-delay:420ms] md:grid-cols-[minmax(0,34rem)_auto] md:items-end md:gap-16">
            <div>
              <h2 className="font-sans text-sm font-normal text-muted-foreground">Nossa história</h2>
              {/* TODO(diretoria): revisar este resumo quando a página Nossa História tiver o texto oficial. */}
              <p className="mt-3 text-xl leading-relaxed text-foreground/90">
                Estudantes da UFU, de cursos diferentes, que se juntam para estudar o mercado financeiro na
                prática: analisam empresas, montam carteiras, testam modelos quantitativos e publicam o que
                aprendem em relatórios abertos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/equipe"
                className="pill bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum dark:hover:bg-lilac dark:hover:text-galaxy"
              >
                Conheça nossa equipe
              </Link>
              <Link href="/nossa-historia" className="text-[0.9375rem] underline-offset-4 hover:text-ink-accent hover:underline">
                Ler a história completa
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* QUEM SOMOS ("Conheça a LMF") */}
      <section id="conheca-a-lmf" aria-labelledby="quem-somos-titulo" className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 md:grid-cols-[16rem_1fr] lg:px-10 lg:py-28">
          <SectionTitle id="quem-somos-titulo">Quem somos</SectionTitle>
          <p className="max-w-[56ch] text-2xl leading-[1.5] font-light text-foreground/90 md:pt-3">{quemSomos}</p>
        </div>
      </section>

      {/* MISSÃO, VISÃO E VALORES: a Visão é uma frase; vira citação. */}
      <section aria-labelledby="mvv-titulo" className="bg-card">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <h2 id="mvv-titulo" className="sr-only">
            Missão, visão e valores
          </h2>
          <figure>
            <figcaption className="text-sm text-muted-foreground">Visão</figcaption>
            <blockquote className="text-quote mt-4 max-w-[26ch] font-serif italic">{mvv.visao}</blockquote>
          </figure>
          <div className="mt-16 grid gap-12 md:grid-cols-2 md:gap-16">
            <div>
              <h3 className="text-3xl">Missão</h3>
              <p className="mt-4 max-w-[60ch] leading-relaxed text-muted-foreground">{mvv.missao}</p>
            </div>
            <div>
              <h3 className="text-3xl">Valores</h3>
              <p className="mt-4 max-w-[60ch] leading-relaxed text-muted-foreground">{mvv.valores}</p>
            </div>
          </div>
        </div>
      </section>

      {/* NÚCLEOS */}
      <section aria-labelledby="nucleos-titulo">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <SectionTitle id="nucleos-titulo">Nossos núcleos</SectionTitle>
            <Link href="/nucleos" className="text-[0.9375rem] underline-offset-4 hover:text-ink-accent hover:underline">
              Ver todos os núcleos
            </Link>
          </div>
          <NucleosCarousel nucleos={nucleos} />
        </div>
      </section>

      {/* ÚLTIMAS PUBLICAÇÕES: posts e relatórios mais recentes, misturados por data */}
      <section aria-labelledby="posts-titulo" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <SectionTitle id="posts-titulo">Publicações recentes</SectionTitle>
            {publicacoes.length > 0 ? (
              <div className="flex gap-6 text-[0.9375rem]">
                <Link href="/eventos" className="underline-offset-4 hover:text-ink-accent hover:underline">
                  Eventos
                </Link>
                <Link href="/relatorios" className="underline-offset-4 hover:text-ink-accent hover:underline">
                  Relatórios
                </Link>
              </div>
            ) : null}
          </div>
          {publicacoes.length === 0 ? (
            <p className="max-w-[56ch] text-muted-foreground">
              Eventos, palestras, viagens e relatórios aparecem aqui assim que forem publicados. Enquanto isso, acompanhe a
              liga no{" "}
              <a href={contato.instagram} {...linkExterno} className="text-ink-accent underline-offset-4 hover:underline">
                Instagram
              </a>
              .
            </p>
          ) : (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {publicacoes.map((p) => (
                <li key={p.tipo === "post" ? `post-${p.post.slug}` : `rel-${p.relatorio.slug}`}>
                  {p.tipo === "post" ? <PostCard post={p.post} /> : <ReportCard relatorio={p.relatorio} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* CONTATO */}
      <section aria-labelledby="contato-titulo" className="px-4 pb-20 sm:px-6 lg:px-10 lg:pb-28">
        <div className="mx-auto grid max-w-7xl gap-12 rounded-[2.5rem_2.5rem_0.75rem_2.5rem] bg-plum p-8 text-white sm:p-12 lg:grid-cols-[1fr_1.3fr] lg:p-16">
          <div className="flex flex-col">
            <h2 id="contato-titulo" className="text-[clamp(2.25rem,1.5rem+2.6vw,3.75rem)] leading-[1.02]">
              Quer falar com a liga?
            </h2>
            <p className="mt-5 max-w-[44ch] text-lg text-white/80">
              Parcerias, palestras, imprensa ou dúvidas sobre o processo seletivo: respondemos por e-mail.
            </p>
            <ul className="mt-10 space-y-4 text-lg lg:mt-auto lg:pt-10">
            <li>
              <a href={`mailto:${contato.email}`} className="inline-flex items-center gap-3 hover:text-lilac">
                <Mail className="size-5" aria-hidden /> {contato.email}
              </a>
            </li>
            <li>
              <a href={contato.instagram} {...linkExterno} className="inline-flex items-center gap-3 hover:text-lilac">
                <Instagram className="size-5" aria-hidden /> @lmf.ufu
                <ArrowUpRight className="size-4 opacity-60" aria-hidden />
              </a>
            </li>
            <li>
              <a href={contato.linkedin} {...linkExterno} className="inline-flex items-center gap-3 hover:text-lilac">
                <Linkedin className="size-5" aria-hidden /> LinkedIn
                <ArrowUpRight className="size-4 opacity-60" aria-hidden />
              </a>
            </li>
            </ul>
          </div>
          <ContactForm compacto />
        </div>
      </section>
    </>
  );
}
