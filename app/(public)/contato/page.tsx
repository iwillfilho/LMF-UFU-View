import { ArrowUpRight, Mail, MapPin } from "lucide-react";
import type { Metadata } from "next";

import { ContactForm } from "@/components/forms/contact-form";
import { PageIntro } from "@/components/site/page-intro";
import { InstagramIcon, LinkedinIcon } from "@/components/site/social-icons";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a LMF UFU: parcerias, palestras, imprensa e dúvidas sobre o processo seletivo.",
};

const linkExterno = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function Page() {
  const { contato } = siteConfig;
  const mapa = `https://www.google.com/maps?q=${encodeURIComponent(contato.endereco)}&output=embed`;

  return (
    <>
      <PageIntro titulo="Contato">
        Parcerias, palestras, imprensa ou dúvidas sobre o processo seletivo. Respondemos pelo e-mail que você informar.
      </PageIntro>

      <div className="mx-auto grid max-w-7xl gap-14 px-4 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:px-10 lg:pb-28">
        <section aria-labelledby="form-titulo">
          <h2 id="form-titulo" className="sr-only">
            Enviar mensagem
          </h2>
          <ContactForm />
        </section>

        <aside aria-label="Outros canais" className="space-y-10">
          <ul className="space-y-4 text-lg">
            <li>
              <a href={`mailto:${contato.email}`} className="inline-flex items-center gap-3 hover:text-ink-accent">
                <Mail className="size-5 text-ink-accent" aria-hidden /> {contato.email}
              </a>
            </li>
            <li>
              <a href={contato.instagram} {...linkExterno} className="inline-flex items-center gap-3 hover:text-ink-accent">
                <InstagramIcon className="size-5 text-ink-accent" aria-hidden /> @lmf.ufu
                <ArrowUpRight className="size-4 opacity-60" aria-hidden />
              </a>
            </li>
            <li>
              <a href={contato.linkedin} {...linkExterno} className="inline-flex items-center gap-3 hover:text-ink-accent">
                <LinkedinIcon className="size-5 text-ink-accent" aria-hidden /> LinkedIn
                <ArrowUpRight className="size-4 opacity-60" aria-hidden />
              </a>
            </li>
          </ul>

          <div>
            <p className="flex items-start gap-3 text-[0.9375rem] text-muted-foreground">
              <MapPin className="mt-0.5 size-5 shrink-0 text-ink-accent" aria-hidden />
              <span>{contato.endereco}</span>
            </p>
            <div className="mt-4 overflow-hidden rounded-[1.5rem_1.5rem_0.4rem_1.5rem] border border-border">
              <iframe
                src={mapa}
                title="Mapa: localização da LMF UFU no Campus Santa Mônica"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="aspect-[4/3] w-full grayscale-[35%] dark:opacity-85 dark:invert-[0.9] dark:hue-rotate-180"
              />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
