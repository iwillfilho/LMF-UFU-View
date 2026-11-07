import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteSettings } from "@/lib/queries";
import { siteConfig } from "@/lib/site-config";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { psAberto, formsUrl } = await getSiteSettings();

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader psAberto={psAberto} psUrl={formsUrl ?? siteConfig.contato.linktree} />
      {/* tabIndex=-1: o skip link precisa conseguir passar o foco para cá. */}
      <main id="conteudo" tabIndex={-1} className="flex-1 pt-18 outline-none">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
