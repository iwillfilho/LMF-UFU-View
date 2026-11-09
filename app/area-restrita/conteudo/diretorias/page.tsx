import type { Metadata } from "next";

import { CabecalhoConteudo } from "@/components/area-restrita/cabecalho-conteudo";
import { Adicionar, FormDiretoria, ItemConteudo } from "@/components/area-restrita/conteudo";
import { exigirPapel } from "@/lib/auth";
import { plural } from "@/lib/format";
import { ADMIN } from "@/lib/papeis";
import { getDiretoriasAdmin } from "@/lib/restrito";

export const metadata: Metadata = { title: "Diretorias" };

export default async function Page() {
  await exigirPapel(ADMIN);
  const diretorias = await getDiretoriasAdmin();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <CabecalhoConteudo titulo="Diretorias">
        As diretorias do organograma, na ordem em que aparecem na página Equipe. Quem ocupa cada uma se define nos cargos de
        cada membro.
      </CabecalhoConteudo>
      <div className="mt-10">
        <Adicionar rotulo="Adicionar diretoria">
          <FormDiretoria />
        </Adicionar>
      </div>
      <ul className="mt-6 divide-y divide-border border-y border-border">
        {diretorias.map((d, i) => (
          <ItemConteudo
            key={d.id}
            tabela="diretorias"
            id={d.id}
            titulo={d.nome}
            subtitulo={plural(d.cargos, "cargo ligado", "cargos ligados")}
            primeiro={i === 0}
            ultimo={i === diretorias.length - 1}
            excluir={{
              digitar: d.nome,
              descricao: `A diretoria sai do organograma e ${plural(d.cargos, "cargo de membro fica", "cargos de membros ficam")} sem diretoria. Não dá para desfazer.`,
            }}
          >
            <FormDiretoria diretoria={d} />
          </ItemConteudo>
        ))}
      </ul>
    </div>
  );
}
