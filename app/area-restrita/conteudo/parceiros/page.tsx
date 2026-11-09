import type { Metadata } from "next";

import { CabecalhoConteudo } from "@/components/area-restrita/cabecalho-conteudo";
import { Adicionar, FormParceiro, ItemConteudo } from "@/components/area-restrita/conteudo";
import { exigirPapel } from "@/lib/auth";
import { ADMIN } from "@/lib/papeis";
import { getNucleosOpcoes, getParceirosAdmin } from "@/lib/restrito";

export const metadata: Metadata = { title: "Parceiros" };

export default async function Page() {
  await exigirPapel(ADMIN);
  const [parceiros, nucleos] = await Promise.all([getParceirosAdmin(), getNucleosOpcoes()]);
  const nomeNucleo = new Map(nucleos.map((n) => [n.id, n.nome]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <CabecalhoConteudo titulo="Parceiros">
        Parceiros institucionais aparecem no rodapé; os de núcleo, no carrossel da seção do núcleo. A ordem desta lista vale
        para os dois lugares.
      </CabecalhoConteudo>
      <div className="mt-10">
        <Adicionar rotulo="Adicionar parceiro">
          <FormParceiro nucleos={nucleos} />
        </Adicionar>
      </div>
      <ul className="mt-6 divide-y divide-border border-y border-border">
        {parceiros.map((p, i) => {
          const onde = [p.institucional ? "Rodapé" : null, ...p.nucleos.map((id) => nomeNucleo.get(id))].filter(Boolean);
          return (
            <ItemConteudo
              key={p.id}
              tabela="partners"
              id={p.id}
              titulo={p.nome}
              subtitulo={onde.length > 0 ? `Aparece em: ${onde.join(", ")}` : "Não aparece no site"}
              primeiro={i === 0}
              ultimo={i === parceiros.length - 1}
              excluir={{ descricao: "O parceiro sai do rodapé e dos núcleos, e o logo é apagado." }}
            >
              <FormParceiro parceiro={p} nucleos={nucleos} />
            </ItemConteudo>
          );
        })}
      </ul>
    </div>
  );
}
