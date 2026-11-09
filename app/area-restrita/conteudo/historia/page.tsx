import type { Metadata } from "next";

import { CabecalhoConteudo } from "@/components/area-restrita/cabecalho-conteudo";
import { Adicionar, FormSecaoHistoria, ItemConteudo } from "@/components/area-restrita/conteudo";
import { exigirPapel } from "@/lib/auth";
import { plural } from "@/lib/format";
import { ADMIN } from "@/lib/papeis";
import { getHistoriaAdmin } from "@/lib/restrito";

export const metadata: Metadata = { title: "Nossa História" };

export default async function Page() {
  await exigirPapel(ADMIN);
  const secoes = await getHistoriaAdmin();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <CabecalhoConteudo titulo="Nossa História">
        Uma seção por período da liga, com texto, conquistas e fotos, na ordem em que aparecem na página Nossa História.
      </CabecalhoConteudo>
      <div className="mt-10">
        <Adicionar rotulo="Adicionar seção">
          <FormSecaoHistoria />
        </Adicionar>
      </div>
      {secoes.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Nenhuma seção ainda. Enquanto isso, a página mostra um aviso de que está em construção.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {secoes.map((s, i) => (
            <ItemConteudo
              key={s.id}
              tabela="history_sections"
              id={s.id}
              titulo={`${s.periodo} · ${s.titulo}`}
              subtitulo={`${plural(s.fotos.length, "foto", "fotos")}, ${plural(s.conquistas.length, "conquista", "conquistas")}`}
              primeiro={i === 0}
              ultimo={i === secoes.length - 1}
              excluir={{ descricao: "A seção sai da página Nossa História e as fotos dela são apagadas." }}
            >
              <FormSecaoHistoria secao={s} />
            </ItemConteudo>
          ))}
        </ul>
      )}
    </div>
  );
}
