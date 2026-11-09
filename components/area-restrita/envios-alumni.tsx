"use client";

import NextImage from "next/image";
import { useActionState, useState } from "react";

import { ConfirmarAcao, OpcoesMembro, enviar } from "@/components/area-restrita/campos";
import { botaoPrimario, selectClasse } from "@/components/area-restrita/estilos";
import { AvisoFormulario, Field } from "@/components/forms/field";
import { ESTADO_INICIAL } from "@/lib/actions/form-state";
import { aprovarEnvio, rejeitarEnvio } from "@/lib/actions/membros";
import { formatarData } from "@/lib/format";
import type { EnvioAlumni, MembroRH } from "@/lib/restrito";
import { gerarSlug } from "@/lib/slug";
import { FOTO_PADRAO } from "@/lib/storage";

function Dado({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  if (!valor) return null;
  return (
    <div className="grid gap-0.5">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="break-words whitespace-pre-line">{valor}</dd>
    </div>
  );
}

/** Um cadastro pendente: os dados enviados e as ações Aprovar (novo ou mesclar) e Rejeitar. */
export function EnvioPendente({ envio, membros }: { envio: EnvioAlumni; membros: MembroRH[] }) {
  // Sugere mesclar quando já existe alguém com o mesmo nome (sem acentos, maiúsculas etc.).
  const chave = gerarSlug(envio.nome);
  const parecido = membros.find((m) => gerarSlug(m.nome) === chave);
  const [modo, setModo] = useState<"novo" | "mesclar">(parecido ? "mesclar" : "novo");
  const [estado, aprovar, aprovando] = useActionState(aprovarEnvio, ESTADO_INICIAL);
  const prefixo = `envio-${envio.id}`;

  return (
    <li className="grid gap-6 py-8 md:grid-cols-[8rem_minmax(0,1fr)]">
      <NextImage
        src={envio.fotoUrl ?? FOTO_PADRAO}
        alt={envio.fotoUrl ? `Foto enviada por ${envio.nome}` : "Sem foto enviada"}
        width={128}
        height={128}
        unoptimized={Boolean(envio.fotoUrl)}
        className="size-32 rounded-2xl border border-border object-cover"
      />
      <div className="grid gap-6">
        <div>
          <h3 className="text-2xl">{envio.nome}</h3>
          <p className="text-sm text-muted-foreground">Enviado em {formatarData(envio.criadoEm, "curta")}</p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Dado rotulo="E-mail" valor={envio.email} />
          <Dado rotulo="Curso" valor={envio.curso} />
          <Dado rotulo="Entrou como trainee em" valor={envio.gestaoTrainee} />
          <Dado
            rotulo="LinkedIn"
            valor={
              envio.linkedin ? (
                <a
                  href={envio.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-accent underline-offset-4 hover:underline"
                >
                  {envio.linkedin}
                </a>
              ) : null
            }
          />
          <Dado rotulo="Gestões" valor={envio.gestoes} />
          <Dado rotulo="Cargos" valor={envio.cargos} />
          <div className="sm:col-span-2">
            <Dado rotulo="Mensagem" valor={envio.mensagem} />
          </div>
        </dl>

        <form className="grid gap-4 rounded-xl border border-border p-4" onSubmit={enviar(aprovar)}>
          <input type="hidden" name="id" value={envio.id} />
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm text-foreground">Ao aprovar</legend>
            {(
              [
                ["novo", "Criar um cadastro novo de alumni"],
                ["mesclar", "Juntar com um membro que já está no site"],
              ] as const
            ).map(([valor, rotulo]) => (
              <label key={valor} className="flex min-h-10 cursor-pointer items-center gap-3 text-[0.9375rem]">
                <input
                  type="radio"
                  name="modo"
                  value={valor}
                  checked={modo === valor}
                  onChange={() => setModo(valor)}
                  className="size-4 accent-primary"
                />
                {rotulo}
              </label>
            ))}
          </fieldset>
          {modo === "mesclar" ? (
            <Field
              id={`${prefixo}-membro`}
              label="Membro"
              erro={estado.erros?.membro}
              dica={
                parecido
                  ? `Sugestão: ${parecido.nome} tem o mesmo nome. Os dados enviados substituem os do cadastro, e a pessoa passa a alumni.`
                  : "Os dados enviados substituem os do cadastro, e a pessoa passa a alumni."
              }
            >
              <select
                id={`${prefixo}-membro`}
                name="membro"
                defaultValue={parecido?.id ?? ""}
                aria-describedby={estado.erros?.membro ? `${prefixo}-membro-erro` : `${prefixo}-membro-dica`}
                className={selectClasse}
              >
                <OpcoesMembro membros={membros} vazio="Escolha o membro" />
              </select>
            </Field>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Depois de aprovar, abre a ficha do membro para cadastrar os cargos de cada gestão.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <button type="submit" disabled={aprovando} className={botaoPrimario}>
              {aprovando ? "Aprovando…" : "Aprovar"}
            </button>
            <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
          </div>
        </form>
        <div className="-mt-3">
          <ConfirmarAcao
            gatilho="Rejeitar"
            gatilhoClasse="inline-flex min-h-10 items-center rounded-full px-4 text-sm text-destructive hover:bg-destructive/10"
            titulo={`Rejeitar o cadastro de ${envio.nome}?`}
            descricao="O cadastro não vai para o site e a foto enviada é apagada."
            confirmar="Rejeitar"
            pendente="Rejeitando…"
            campos={{ id: envio.id }}
            acao={rejeitarEnvio}
          />
        </div>
      </div>
    </li>
  );
}
