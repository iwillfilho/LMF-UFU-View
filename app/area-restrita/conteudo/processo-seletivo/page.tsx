import type { Metadata } from "next";

import { CabecalhoConteudo } from "@/components/area-restrita/cabecalho-conteudo";
import { Adicionar, FormEtapa, ItemConteudo } from "@/components/area-restrita/conteudo";
import { exigirPapel } from "@/lib/auth";
import { ADMIN } from "@/lib/papeis";
import { getEtapasAdmin } from "@/lib/restrito";

export const metadata: Metadata = { title: "Etapas do Processo Seletivo" };

export default async function Page() {
  await exigirPapel(ADMIN);
  const etapas = await getEtapasAdmin();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <CabecalhoConteudo titulo="Etapas do Processo Seletivo">
        As etapas do carrossel da página do Processo Seletivo, em ordem. Abrir ou fechar o PS, o edital e o link do
        formulário ficam em outra tela.
      </CabecalhoConteudo>
      <div className="mt-10">
        <Adicionar rotulo="Adicionar etapa">
          <FormEtapa />
        </Adicionar>
      </div>
      {etapas.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Nenhuma etapa cadastrada.</p>
      ) : (
        <ol className="mt-6 divide-y divide-border border-y border-border">
          {etapas.map((e, i) => (
            <ItemConteudo
              key={e.id}
              tabela="ps_steps"
              id={e.id}
              titulo={`${i + 1}. ${e.titulo}`}
              subtitulo={e.descricao || undefined}
              primeiro={i === 0}
              ultimo={i === etapas.length - 1}
              excluir={{ descricao: "A etapa sai do carrossel do Processo Seletivo." }}
            >
              <FormEtapa etapa={e} />
            </ItemConteudo>
          ))}
        </ol>
      )}
    </div>
  );
}
