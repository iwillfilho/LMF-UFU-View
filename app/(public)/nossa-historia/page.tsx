import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageIntro } from "@/components/site/page-intro";
import { getHistoria } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Nossa História",
  description: "A trajetória da LMF UFU contada por períodos, com fotos e conquistas de cada fase.",
};

export default async function Page() {
  const secoes = await getHistoria();

  return (
    <>
      <PageIntro titulo="Nossa história">Uma trajetória feita por estudantes, contada por períodos, com fotos e conquistas de cada fase.</PageIntro>

      {secoes.length === 0 ? (
        <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
          <p className="max-w-[62ch] rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-dashed border-border p-6 text-muted-foreground">
            A diretoria está reunindo fotos e registros de cada período da liga. As seções aparecem aqui assim que forem publicadas.
          </p>
        </div>
      ) : (
        <ol className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-10">
          {secoes.map((s) => (
            <li key={s.id} className="grid gap-8 border-t border-border py-16 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
              <p className="font-serif text-5xl text-ink-accent italic">{s.periodo}</p>
              <section aria-labelledby={`historia-${s.id}`}>
                <h2 id={`historia-${s.id}`} className="text-4xl">
                  {s.titulo}
                </h2>
                {s.texto ? <p className="mt-5 max-w-[64ch] text-lg leading-relaxed whitespace-pre-line text-foreground/90">{s.texto}</p> : null}

                {s.conquistas.length > 0 ? (
                  <div className="mt-8">
                    <h3 className="font-sans text-sm font-normal text-muted-foreground">Conquistas</h3>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {s.conquistas.map((c) => (
                        <li key={c} className="pill bg-secondary text-secondary-foreground">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {s.fotos.length > 0 ? (
                  <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {s.fotos.map((src) => (
                      <li key={src} className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem_1.25rem_0.35rem_1.25rem]">
                        <Image src={src} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover" />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            </li>
          ))}
        </ol>
      )}

      {/* "Uma trajetória feita por estudantes": frase sobre ex-membros + botão para Alumni (pedido do PDF). */}
      <section aria-labelledby="trajetoria-titulo" className="px-4 pb-20 sm:px-6 lg:px-10 lg:pb-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem_2.5rem_0.75rem_2.5rem] bg-plum p-8 text-white sm:p-12 lg:p-16">
          <div aria-hidden className="galaxy-glow pointer-events-none absolute -right-40 -bottom-40 h-[28rem] w-[40rem] opacity-60" />
          <div className="relative">
            <h2 id="trajetoria-titulo" className="text-[clamp(2.25rem,1.5rem+2.6vw,3.75rem)] leading-[1.02]">
              Uma trajetória feita por estudantes
            </h2>
            {/* TODO(diretoria): revisar o texto. */}
            <p className="mt-5 max-w-[52ch] text-lg text-white/85">
              Cada gestão deixa algo para a próxima. Muitos ex-membros seguem por perto, trocando experiências do mercado com quem
              está chegando, e a rede de alumni é parte do que faz a liga continuar.
            </p>
            <Link
              href="/equipe/alumni"
              className="pill mt-8 bg-white px-6 py-3 text-base text-plum transition-colors hover:bg-lilac hover:text-galaxy"
            >
              Conhecer os alumni
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
