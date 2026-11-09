import type { Metadata } from "next";

import { FormMembro } from "@/components/area-restrita/membros";
import { Voltar } from "@/components/area-restrita/voltar";
import { exigirPapel } from "@/lib/auth";
import { ADMIN } from "@/lib/papeis";
import { getCargosUsados, getDiretoriasOpcoes, getGestaoAtual, getNucleosOpcoes } from "@/lib/restrito";

export const metadata: Metadata = { title: "Novo membro" };

export default async function Page() {
  await exigirPapel(ADMIN);
  const [diretorias, nucleos, sugestoes, gestao] = await Promise.all([
    getDiretoriasOpcoes(),
    getNucleosOpcoes(),
    getCargosUsados(),
    getGestaoAtual(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <Voltar href="/area-restrita/membros" label="Membros" />
      <h1 className="text-title mt-6">Novo membro</h1>
      <div className="mt-10">
        <FormMembro diretorias={diretorias} nucleos={nucleos} sugestoesCargo={sugestoes} gestaoPadrao={gestao} />
      </div>
    </div>
  );
}
