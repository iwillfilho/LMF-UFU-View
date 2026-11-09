import type { Metadata } from "next";
import { Suspense } from "react";

import { MenuAreaRestrita } from "@/components/area-restrita/menu";
import { exigirPapel } from "@/lib/auth";
import { ABAS, ROTULO_PAPEL, TODOS, temPapel } from "@/lib/papeis";

export const metadata: Metadata = {
  title: { default: "Área Restrita", template: "%s | Área Restrita" },
  robots: { index: false, follow: false },
};

export default function AreaRestritaLayout({ children }: LayoutProps<"/area-restrita">) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      {/* A sessão é lida a cada requisição, então tudo fica atrás do Suspense. */}
      <Suspense fallback={<p className="p-8 text-muted-foreground">Carregando a Área Restrita…</p>}>
        <Painel>{children}</Painel>
      </Suspense>
    </>
  );
}

async function Painel({ children }: { children: React.ReactNode }) {
  const sessao = await exigirPapel(TODOS);
  const abas = ABAS.filter((aba) => temPapel(sessao.papeis, aba.papeis)).map(({ href, label }) => ({ href, label }));
  const papel = sessao.papeis.map((p) => ROTULO_PAPEL[p]).join(" · ");

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <MenuAreaRestrita abas={abas} email={sessao.email} papel={papel} />
      <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        {children}
      </main>
    </div>
  );
}
