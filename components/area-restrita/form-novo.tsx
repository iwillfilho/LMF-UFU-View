"use client";

import { useActionState } from "react";

import { AvisoFormulario, Field, ariaCampo, inputClasse } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/actions/form-state";
import { ESTADO_INICIAL } from "@/lib/actions/form-state";
import { cn } from "@/lib/utils";

/** Primeiro passo de um post ou relatório: título + tipo. Cria o rascunho e abre o editor. */
export function FormNovo({
  acao,
  campoTipo,
  rotuloTipo,
  opcoes,
}: {
  acao: (anterior: FormState, formData: FormData) => Promise<FormState>;
  campoTipo: "categoria" | "tipo";
  rotuloTipo: string;
  opcoes: Record<string, string>;
}) {
  const [estado, criar, criando] = useActionState(acao, ESTADO_INICIAL);
  const e = estado.erros ?? {};
  const v = estado.valores ?? {};

  return (
    <form key={JSON.stringify(estado)} action={criar} noValidate className="mt-10 grid max-w-xl gap-5">
      <Field id="titulo" label="Título" erro={e.titulo}>
        <Input
          {...ariaCampo("titulo", e.titulo)}
          defaultValue={v.titulo}
          maxLength={160}
          autoFocus
          className={inputClasse}
        />
      </Field>
      <Field id={campoTipo} label={rotuloTipo} erro={e[campoTipo]}>
        <select
          {...ariaCampo(campoTipo, e[campoTipo])}
          defaultValue={v[campoTipo] ?? Object.keys(opcoes)[0]}
          className={cn(inputClasse, "w-full border border-input")}
        >
          {Object.entries(opcoes).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </Field>
      <p className="text-sm text-muted-foreground">Ele começa como rascunho e não aparece no site até você publicar.</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="submit"
          disabled={criando}
          className="pill bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum disabled:opacity-60 dark:hover:bg-lilac dark:hover:text-galaxy"
        >
          {criando ? "Criando…" : "Criar rascunho"}
        </button>
        <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
      </div>
    </form>
  );
}
