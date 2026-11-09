import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMembro, SituacaoMembro } from "@/components/area-restrita/membros";
import { Voltar } from "@/components/area-restrita/voltar";
import { exigirPapel } from "@/lib/auth";
import { ADMIN, ROTULO_PAPEL } from "@/lib/papeis";
import {
  getCargosUsados,
  getDiretoriasOpcoes,
  getGestaoAtual,
  getMembroAdmin,
  getNucleosOpcoes,
} from "@/lib/restrito";

export const metadata: Metadata = { title: "Ficha do membro" };

const AVISOS: Record<string, { texto: string; erro?: boolean }> = {
  criado: { texto: "Membro cadastrado." },
  aprovado: { texto: "Cadastro de alumni aprovado. Confira os dados e cadastre os cargos de cada gestão." },
  parcial: { texto: "O cadastro foi criado, mas parte dos dados não foi salva. Confira abaixo e salve de novo.", erro: true },
  acesso: {
    texto: "O cadastro foi criado, mas o acesso não foi liberado (o e-mail já pode estar ligado a outra pessoa). Ajuste em Acessos.",
    erro: true,
  },
  foto: { texto: "A foto enviada no formulário não era uma imagem válida e foi descartada.", erro: true },
};

export default async function Page({ params, searchParams }: PageProps<"/area-restrita/membros/[id]">) {
  await exigirPapel(ADMIN);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [membro, diretorias, nucleos, sugestoes, gestao] = await Promise.all([
    getMembroAdmin(id),
    getDiretoriasOpcoes(),
    getNucleosOpcoes(),
    getCargosUsados(),
    getGestaoAtual(),
  ]);
  if (!membro) notFound();

  const avisos = [
    sp.criado ? (sp.erro ? AVISOS.parcial : sp.acesso ? AVISOS.acesso : AVISOS.criado) : null,
    sp.aprovado ? AVISOS.aprovado : null,
    sp.foto === "recusada" ? AVISOS.foto : null,
  ].filter((a) => a !== null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <Voltar href="/area-restrita/membros" label="Membros" />
      <h1 className="text-title mt-6">{membro.nome}</h1>
      <p className="mt-2 text-muted-foreground">
        {membro.anonimizado ? "Anonimizado" : membro.status === "ativo" ? "Membro ativo" : "Alumni"}
        {membro.status === "ativo" || !membro.anonimizado ? (
          <>
            {" · "}
            <Link
              href={`/${membro.status === "ativo" ? "equipe" : "equipe/alumni"}?membro=${membro.slug}`}
              className="text-ink-accent underline-offset-4 hover:underline"
            >
              ver no site
            </Link>
          </>
        ) : null}
      </p>
      {avisos.map((a) => (
        <p key={a.texto} role={a.erro ? "alert" : "status"} className={a.erro ? "mt-4 text-destructive" : "mt-4 text-ink-accent"}>
          {a.texto}
        </p>
      ))}

      {membro.anonimizado ? (
        <p className="mt-10 max-w-[62ch] text-muted-foreground">
          Os dados pessoais deste cadastro foram apagados a pedido (LGPD). Ele continua só como autor de{" "}
          {membro.relatorios === 1 ? "um relatório" : `${membro.relatorios} relatórios`} e não pode ser editado.
        </p>
      ) : (
        <>
          <div className="mt-10">
            <FormMembro
              key={membro.id}
              membro={membro}
              diretorias={diretorias}
              nucleos={nucleos}
              sugestoesCargo={sugestoes}
              gestaoPadrao={gestao}
            />
          </div>

          <section aria-labelledby="acesso" className="mt-16">
            <h2 id="acesso" className="text-3xl">
              Acesso à Área Restrita
            </h2>
            <p className="mt-4 text-muted-foreground">
              {membro.papeis.length > 0 ? (
                <>
                  {membro.papeis.map((p) => ROTULO_PAPEL[p]).join(", ")} pelo e-mail {membro.acessoEmail}
                  {membro.temConta ? "." : ", que ainda não entrou."}
                </>
              ) : (
                "Sem acesso."
              )}{" "}
              <Link href="/area-restrita/acessos" className="text-ink-accent underline-offset-4 hover:underline">
                Gerenciar em Acessos
              </Link>
            </p>
          </section>

          <section aria-labelledby="situacao" className="mt-16">
            <h2 id="situacao" className="text-3xl">
              Situação
            </h2>
            <div className="mt-6">
              <SituacaoMembro membro={membro} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
