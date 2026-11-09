import type { Metadata } from "next";

import { FormNovo } from "@/components/area-restrita/form-novo";
import { Voltar } from "@/components/area-restrita/voltar";
import { criarRelatorio } from "@/lib/actions/publicacoes";
import { exigirPapel } from "@/lib/auth";
import { TIPO_RELATORIO_LABEL } from "@/lib/labels";
import { PUBLICA } from "@/lib/papeis";

export const metadata: Metadata = { title: "Novo relatório" };

export default async function Page() {
  await exigirPapel(PUBLICA);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <Voltar />
      <h1 className="text-title mt-6">Novo relatório</h1>
      <FormNovo acao={criarRelatorio} campoTipo="tipo" rotuloTipo="Tipo" opcoes={TIPO_RELATORIO_LABEL} />
    </div>
  );
}
