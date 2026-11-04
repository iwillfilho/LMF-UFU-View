import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { MemberCard } from "@/components/site/member-card";
import { MemberDialog } from "@/components/site/member-dialog";
import { PageIntro } from "@/components/site/page-intro";
import { getEquipe } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Alumni",
  description: "Ex-membros da LMF UFU: gestões, cargos e relatórios de quem já passou pela liga.",
};

const hrefMembro = (slug: string) => `/equipe/alumni?membro=${slug}`;

export default async function Page() {
  const { membros } = await getEquipe();
  const alumni = membros.filter((m) => m.status === "alumni");

  return (
    <>
      <PageIntro titulo="Alumni">
        Quem já passou pela LMF. Clique em uma pessoa para ver as gestões, os cargos e os relatórios dela na liga.
      </PageIntro>

      <section aria-label="Lista de alumni" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-10">
        {alumni.length === 0 ? (
          <p className="max-w-[62ch] rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-dashed border-border p-6 text-muted-foreground">
            A lista de alumni está sendo montada. Se você já fez parte da liga, envie seus dados pelo formulário abaixo.
          </p>
        ) : (
          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {alumni.map((m) => (
              <li key={m.slug}>
                <MemberCard membro={m} href={hrefMembro(m.slug)} detalhe={m.gestoesEfetivo ? `Gestões ${m.gestoesEfetivo}` : null} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="cadastro-chamada" className="px-4 pb-20 sm:px-6 lg:px-10 lg:pb-28">
        <div className="mx-auto grid max-w-7xl gap-6 rounded-[2.5rem_2.5rem_0.75rem_2.5rem] bg-plum p-8 text-white sm:p-12 md:grid-cols-[1.4fr_auto] md:items-end">
          <div>
            <h2 id="cadastro-chamada" className="text-4xl">
              Você é ex-membro?
            </h2>
            <p className="mt-3 max-w-[52ch] text-white/80">
              Conte em quais gestões participou, os cargos que teve e deixe um contato. A diretoria revisa e adiciona você
              aqui.
            </p>
          </div>
          <Link
            href="/equipe/alumni/cadastro"
            className="pill justify-self-start bg-white px-6 py-3 text-base text-plum transition-colors hover:bg-lilac hover:text-galaxy"
          >
            Enviar meus dados
          </Link>
        </div>
      </section>

      <Suspense fallback={null}>
        <MemberDialog membros={membros} />
      </Suspense>
    </>
  );
}
