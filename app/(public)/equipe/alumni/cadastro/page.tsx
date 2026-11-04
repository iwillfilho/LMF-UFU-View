import type { Metadata } from "next";

import { AlumniForm } from "@/components/forms/alumni-form";
import { PageIntro } from "@/components/site/page-intro";

export const metadata: Metadata = {
  title: "Cadastro de alumni",
  description: "Ex-membro da LMF UFU? Envie suas gestões, cargos, foto e contato para aparecer na página de Alumni.",
};

export default function Page() {
  return (
    <>
      <PageIntro titulo="Cadastro de alumni">
        Fez parte da liga? Conte quando e como. A diretoria revisa os dados antes de publicar, e eles também ajudam a manter a
        Rede Alumni atualizada.
      </PageIntro>
      <section aria-label="Formulário de cadastro" className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-10">
        <AlumniForm />
      </section>
    </>
  );
}
