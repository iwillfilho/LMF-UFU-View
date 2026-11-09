import type { Metadata } from "next";

import { CabecalhoConteudo } from "@/components/area-restrita/cabecalho-conteudo";
import { Adicionar, FormEtapa, ItemConteudo } from "@/components/area-restrita/conteudo";
import { PainelPs } from "@/components/area-restrita/processo-seletivo";
import { exigirPapel } from "@/lib/auth";
import { ADMIN } from "@/lib/papeis";
import { getEtapasAdmin, getPsAdmin } from "@/lib/restrito";

export const metadata: Metadata = { title: "Processo Seletivo" };

export default async function Page() {
  await exigirPapel(ADMIN);
  const [ps, etapas] = await Promise.all([getPsAdmin(), getEtapasAdmin()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <CabecalhoConteudo titulo="Processo Seletivo">
        Abra ou feche as inscrições, publique o edital e organize as etapas que aparecem no carrossel do Processo Seletivo.
      </CabecalhoConteudo>
      <div className="mt-10">
        <PainelPs ps={ps} />
      </div>

      <section aria-labelledby="ps-etapas" className="mt-12">
        <h2 id="ps-etapas" className="text-3xl">
          Etapas
        </h2>
        <div className="mt-5">
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
      </section>
    </div>
  );
}
