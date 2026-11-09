import type { Metadata } from "next";

import { AutoCarousel } from "@/components/site/auto-carousel";
import { EditalPdf } from "@/components/site/edital-pdf";
import { PageIntro } from "@/components/site/page-intro";
import { type EtapaPS, getEtapasPS, getSiteSettings } from "@/lib/queries";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Processo Seletivo",
  description: "Etapas, edital e inscrição do Processo Seletivo da LMF UFU.",
};

const ctaPrimario =
  "pill bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum dark:hover:bg-lilac dark:hover:text-galaxy";
const ctaSecundario = "pill border border-border px-6 py-3 text-base transition-colors hover:bg-secondary";
const cartao = "rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-border";

/**
 * Só o link público do formulário (…/viewform) pode ser embutido. Links curtos
 * (forms.gle) e links de edição abrem apenas pelo botão.
 */
function formsEmbutido(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname !== "docs.google.com" || !/^\/forms\/.+\/viewform$/.test(u.pathname)) return null;
    u.searchParams.set("embedded", "true");
    return u.toString();
  } catch {
    return null;
  }
}

export default async function Page() {
  const [{ psAberto, editalUrl, formsUrl }, etapas] = await Promise.all([getSiteSettings(), getEtapasPS()]);
  const embed = formsEmbutido(formsUrl);

  return (
    <>
      <PageIntro titulo="Processo Seletivo">
        {psAberto
          ? "As inscrições estão abertas. Conheça as etapas, leia o edital e inscreva-se pelo formulário."
          : "As inscrições estão encerradas no momento. Conheça as etapas para se preparar para o próximo processo."}
      </PageIntro>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10 lg:pb-28">
        {!psAberto ? (
          <section aria-labelledby="ps-encerrado" className={`${cartao} p-6 sm:p-8`}>
            <h2 id="ps-encerrado" className="text-3xl">
              Inscrições encerradas
            </h2>
            <p className="mt-3 max-w-[62ch] text-muted-foreground">
              O próximo Processo Seletivo é divulgado no Instagram e no Linktree da liga. Acompanhe para não perder a
              abertura das inscrições.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={siteConfig.contato.instagram} target="_blank" rel="noopener noreferrer" className={ctaPrimario}>
                Instagram<span className="sr-only"> (abre em nova aba)</span>
              </a>
              <a href={siteConfig.contato.linktree} target="_blank" rel="noopener noreferrer" className={ctaSecundario}>
                Linktree<span className="sr-only"> (abre em nova aba)</span>
              </a>
            </div>
          </section>
        ) : null}

        <Etapas etapas={etapas} />

        {psAberto ? (
          <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-10">
            <section aria-labelledby="edital">
              <h2 id="edital" className="text-4xl">
                Edital
              </h2>
              {editalUrl ? (
                <>
                  <div className="mt-6">
                    <EditalPdf url={editalUrl} />
                  </div>
                  <a href={editalUrl} download className={`${ctaSecundario} mt-6 inline-flex`}>
                    Baixar edital (PDF)
                  </a>
                </>
              ) : (
                <p className={`${cartao} mt-6 border-dashed p-6 text-muted-foreground`}>
                  O edital será publicado aqui em breve.
                </p>
              )}
            </section>

            <section aria-labelledby="inscricao">
              <h2 id="inscricao" className="text-4xl">
                Inscrição
              </h2>
              {formsUrl ? (
                <>
                  {embed ? (
                    <iframe
                      src={embed}
                      title="Formulário de inscrição do Processo Seletivo"
                      loading="lazy"
                      className={`${cartao} mt-6 h-[60rem] w-full bg-white`}
                    />
                  ) : null}
                  <a
                    href={formsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${embed ? ctaSecundario : ctaPrimario} mt-6 inline-flex`}
                  >
                    Abrir formulário em nova aba
                  </a>
                </>
              ) : (
                <p className={`${cartao} mt-6 border-dashed p-6 text-muted-foreground`}>
                  O formulário de inscrição será publicado aqui em breve.
                </p>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </>
  );
}

function Etapas({ etapas }: { etapas: EtapaPS[] }) {
  return (
    <section aria-labelledby="etapas" className="mt-16 first:mt-0">
      <h2 id="etapas" className="text-4xl">
        Etapas
      </h2>
      {etapas.length === 0 ? (
        <p className={`${cartao} mt-6 border-dashed p-6 text-muted-foreground`}>
          As etapas do processo serão publicadas aqui em breve.
        </p>
      ) : (
        <div className="mt-6">
          <AutoCarousel rotulo="Etapas do Processo Seletivo">
            {etapas.map((etapa, i) => (
              <article key={etapa.id} className={`${cartao} h-full p-6`}>
                <p className="font-serif text-5xl text-ink-accent italic" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 text-2xl">
                  <span className="sr-only">Etapa {i + 1}: </span>
                  {etapa.titulo}
                </h3>
                {etapa.descricao ? (
                  <p className="mt-3 leading-relaxed whitespace-pre-line text-muted-foreground">{etapa.descricao}</p>
                ) : null}
              </article>
            ))}
          </AutoCarousel>
        </div>
      )}
    </section>
  );
}
