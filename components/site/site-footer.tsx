import Link from "next/link";

import { getParceirosInstitucionais } from "@/lib/queries";
import { mainNav, siteConfig } from "@/lib/site-config";

import { Logo } from "./logo";

const linkExterno = { target: "_blank", rel: "noopener noreferrer" } as const;

export async function SiteFooter() {
  const { contato } = siteConfig;
  const parceiros = await getParceirosInstitucionais();

  return (
    <footer className="mt-auto border-t border-border">
      {parceiros.length > 0 ? (
        <section aria-labelledby="parceiros-titulo" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
          <h2 id="parceiros-titulo" className="font-sans text-sm font-normal text-muted-foreground">
            Parceiros institucionais
          </h2>
          <ul className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
            {parceiros.map((p) => (
              <li key={p.id}>
                {p.url ? (
                  <a
                    href={p.url}
                    {...linkExterno}
                    className="font-serif text-2xl text-foreground/80 transition-colors hover:text-ink-accent"
                  >
                    {p.nome}
                  </a>
                ) : (
                  <span className="font-serif text-2xl text-foreground/80">{p.nome}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="bg-card">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
          <div className="max-w-sm">
            <Logo variante="completa" className="h-auto w-full max-w-[22rem] text-foreground" />
            <p className="mt-6 text-sm text-muted-foreground">{contato.endereco}</p>
          </div>

          <nav aria-label="Rodapé">
            <h2 className="font-sans text-sm font-normal text-muted-foreground">Páginas</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[0.9375rem]">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-ink-accent">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="font-sans text-sm font-normal text-muted-foreground">Fale com a liga</h2>
            <ul className="mt-4 space-y-2 text-[0.9375rem]">
              <li>
                <a href={`mailto:${contato.email}`} className="hover:text-ink-accent">
                  {contato.email}
                </a>
              </li>
              <li>
                <a href={contato.instagram} {...linkExterno} className="hover:text-ink-accent">
                  Instagram
                </a>
              </li>
              <li>
                <a href={contato.linkedin} {...linkExterno} className="hover:text-ink-accent">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-8 text-xs text-muted-foreground sm:px-6 lg:px-10">
          © {siteConfig.nomeCompleto}
        </div>
      </div>
    </footer>
  );
}
