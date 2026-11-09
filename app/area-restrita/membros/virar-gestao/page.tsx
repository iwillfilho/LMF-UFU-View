import type { Metadata } from "next";

import { FormVirarGestao } from "@/components/area-restrita/virar-gestao";
import { Voltar } from "@/components/area-restrita/voltar";
import { exigirPapel } from "@/lib/auth";
import { compararGestao, gestaoDe, proximaGestao } from "@/lib/format";
import { ADMIN } from "@/lib/papeis";
import { getMembrosAdmin } from "@/lib/restrito";

export const metadata: Metadata = { title: "Virar gestão" };

export default async function Page() {
  await exigirPapel(ADMIN);
  const membros = await getMembrosAdmin();
  const ativos = membros.filter((m) => m.status === "ativo");
  const maisRecente = ativos.flatMap((m) => m.cargos.map((c) => c.gestao)).sort(compararGestao).at(-1);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <Voltar href="/area-restrita/membros" label="Membros" />
      <h1 className="text-title mt-6">Virar gestão</h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Abre a gestão seguinte de uma vez: quem sai vira alumni e quem continua leva o cargo atual.
        {maisRecente ? ` A gestão mais recente no site é ${maisRecente}.` : null}
      </p>
      <div className="mt-10">
        {ativos.length === 0 ? (
          <p className="text-muted-foreground">Nenhum membro ativo.</p>
        ) : (
          <FormVirarGestao
            gestaoPadrao={proximaGestao(maisRecente ?? gestaoDe(new Date()))}
            ativos={ativos.map((m) => ({
              id: m.id,
              nome: m.nome,
              cargo: m.atual?.cargo ?? null,
              gestao: m.atual?.gestao ?? null,
              papeis: m.papeis,
            }))}
          />
        )}
      </div>
    </div>
  );
}
