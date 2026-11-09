import type { Metadata } from "next";
import Link from "next/link";

import { CabecalhoConteudo } from "@/components/area-restrita/cabecalho-conteudo";
import { Adicionar, FormNucleo, ItemConteudo } from "@/components/area-restrita/conteudo";
import { exigirPapel } from "@/lib/auth";
import { plural } from "@/lib/format";
import { ADMIN } from "@/lib/papeis";
import { getNucleosAdmin, getParceirosAdmin } from "@/lib/restrito";

export const metadata: Metadata = { title: "Núcleos" };

export default async function Page() {
  await exigirPapel(ADMIN);
  const [nucleos, parceiros] = await Promise.all([getNucleosAdmin(), getParceirosAdmin()]);
  const nomeParceiro = new Map(parceiros.map((p) => [p.id, p.nome]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <CabecalhoConteudo titulo="Núcleos">
        Nome, área, descrição e banner de cada núcleo, na ordem em que aparecem no site. Os parceiros de cada núcleo se
        escolhem em <Link href="/area-restrita/conteudo/parceiros" className="text-ink-accent underline-offset-4 hover:underline">Parceiros</Link>.
      </CabecalhoConteudo>
      <div className="mt-10">
        <Adicionar rotulo="Adicionar núcleo">
          <FormNucleo />
        </Adicionar>
      </div>
      <ul className="mt-6 divide-y divide-border border-y border-border">
        {nucleos.map((n, i) => {
          const parceirosNomes = n.parceiros.map((id) => nomeParceiro.get(id)).filter(Boolean);
          return (
            <ItemConteudo
              key={n.id}
              tabela="nucleos"
              id={n.id}
              titulo={n.nome}
              subtitulo={
                <>
                  {n.area || "Sem área"} · endereço /nucleos#{n.slug}
                  <br />
                  Parceiros: {parceirosNomes.length > 0 ? parceirosNomes.join(", ") : "nenhum (o carrossel mostra a equipe)"}
                </>
              }
              primeiro={i === 0}
              ultimo={i === nucleos.length - 1}
              excluir={{
                digitar: n.nome,
                descricao: `O núcleo sai do site. ${plural(n.relatorios, "relatório fica", "relatórios ficam")} sem núcleo e ${plural(n.cargos, "cargo de membro perde", "cargos de membros perdem")} o núcleo. Não dá para desfazer.`,
              }}
            >
              <FormNucleo nucleo={n} />
            </ItemConteudo>
          );
        })}
      </ul>
    </div>
  );
}
