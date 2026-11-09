import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormRelatorio } from "@/components/area-restrita/form-relatorio";
import { Voltar } from "@/components/area-restrita/voltar";
import { exigirPapel } from "@/lib/auth";
import { PUBLICA } from "@/lib/papeis";
import { getMembrosOpcoes, getNucleosOpcoes, getRelatorioEditor } from "@/lib/restrito";

export const metadata: Metadata = { title: "Editar relatório" };

export default async function Page({ params, searchParams }: PageProps<"/area-restrita/publicacoes/relatorios/[id]">) {
  await exigirPapel(PUBLICA);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [relatorio, membros, nucleos] = await Promise.all([
    getRelatorioEditor(id),
    getMembrosOpcoes(),
    getNucleosOpcoes(),
  ]);
  if (!relatorio) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <Voltar />
      <h1 className="text-title mt-6">Editar relatório</h1>
      {sp.erro === "excluir" ? (
        <p role="alert" className="mt-4 text-destructive">
          Não foi possível excluir o relatório. Tente de novo.
        </p>
      ) : null}
      <FormRelatorio relatorio={relatorio} membros={membros} nucleos={nucleos} />
    </div>
  );
}
