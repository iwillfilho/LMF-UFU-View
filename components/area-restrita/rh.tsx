"use client";

import { startTransition, useActionState, useRef } from "react";

import { ConfirmarExclusao } from "@/components/area-restrita/excluir";
import { AvisoFormulario, Field, ariaCampo, inputClasse } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ESTADO_INICIAL, type FormState } from "@/lib/actions/form-state";
import { corrigirRegistro, excluirRegistro, lancarRegistro } from "@/lib/actions/rh";
import type { MembroRH, RegistroRH } from "@/lib/restrito";
import { cn } from "@/lib/utils";

const selectClasse = cn(inputClasse, "w-full border border-input");
const botaoPrimario =
  "pill bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum disabled:opacity-60 dark:hover:bg-lilac dark:hover:text-galaxy";

type Valores = { tipo: string; valor: string; gestao: string; motivo: string };

/** Tipo, quantidade, gestão e motivo: comuns a lançar e corrigir. */
function CamposRegistro({
  prefixo,
  e,
  v,
  motivoRef,
}: {
  prefixo: string;
  e: Record<string, string>;
  v: Valores;
  motivoRef?: React.Ref<HTMLTextAreaElement>;
}) {
  const id = (c: string) => `${prefixo}-${c}`;
  return (
    <>
      <fieldset className="grid gap-1.5" aria-describedby={e.tipo ? id("tipo-erro") : undefined}>
        <legend className="mb-1.5 text-sm text-foreground">Tipo</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ponto", "Ponto"],
              ["strike", "Strike"],
            ] as const
          ).map(([valor, rotulo]) => (
            <label
              key={valor}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-[0.9375rem] has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="tipo"
                value={valor}
                defaultChecked={v.tipo === valor}
                className="size-4 accent-primary"
              />
              {rotulo}
            </label>
          ))}
        </div>
        {e.tipo ? (
          <p id={id("tipo-erro")} className="text-sm text-destructive">
            {e.tipo}
          </p>
        ) : null}
      </fieldset>
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <Field id={id("valor")} label="Quantidade" erro={e.valor}>
          <Input
            {...ariaCampo(id("valor"), e.valor)}
            name="valor"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            defaultValue={v.valor}
            className={inputClasse}
          />
        </Field>
        <Field id={id("gestao")} label="Gestão" erro={e.gestao} dica="Semestre, no formato 2026.2.">
          <Input
            {...ariaCampo(id("gestao"), e.gestao, "dica")}
            name="gestao"
            inputMode="decimal"
            maxLength={6}
            defaultValue={v.gestao}
            className={inputClasse}
          />
        </Field>
      </div>
      <Field id={id("motivo")} label="Motivo" erro={e.motivo} dica="O membro vê este texto em Meus pontos.">
        <Textarea
          {...ariaCampo(id("motivo"), e.motivo, "dica")}
          ref={motivoRef}
          name="motivo"
          rows={3}
          maxLength={500}
          defaultValue={v.motivo}
          className={cn(inputClasse, "h-auto py-3")}
        />
      </Field>
    </>
  );
}

/** Lançar ponto ou strike. Depois de salvar, só o motivo limpa: dá para lançar vários seguidos. */
export function FormLancamento({
  membros,
  gestaoPadrao,
  membroPadrao,
}: {
  membros: MembroRH[];
  gestaoPadrao: string;
  membroPadrao?: string;
}) {
  const motivoRef = useRef<HTMLTextAreaElement>(null);
  const [estado, lancar, lancando] = useActionState(async (anterior: FormState, dados: FormData) => {
    const r = await lancarRegistro(anterior, dados);
    if (r.status === "ok" && motivoRef.current) motivoRef.current.value = "";
    return r;
  }, ESTADO_INICIAL);
  const e = estado.erros ?? {};
  const ativos = membros.filter((m) => !m.alumni);
  const alumni = membros.filter((m) => m.alumni);

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        const dados = new FormData(ev.currentTarget);
        startTransition(() => lancar(dados));
      }}
    >
      <Field id="lanc-membro" label="Membro" erro={e.membro}>
        <select
          {...ariaCampo("lanc-membro", e.membro)}
          name="membro"
          defaultValue={membroPadrao ?? ""}
          className={selectClasse}
        >
          <option value="" disabled>
            Escolha o membro
          </option>
          <optgroup label="Ativos">
            {ativos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </optgroup>
          {alumni.length > 0 ? (
            <optgroup label="Alumni">
              {alumni.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </Field>
      <CamposRegistro
        prefixo="lanc"
        e={e}
        v={{ tipo: "ponto", valor: "1", gestao: gestaoPadrao, motivo: "" }}
        motivoRef={motivoRef}
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="submit" disabled={lancando} className={botaoPrimario}>
          {lancando ? "Lançando…" : "Lançar"}
        </button>
        <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
      </div>
    </form>
  );
}

/** Corrigir ou excluir um lançamento (só Presidente e Diretor de RH). */
export function GerenciarRegistro({ registro }: { registro: RegistroRH }) {
  const [estado, corrigir, corrigindo] = useActionState(corrigirRegistro, ESTADO_INICIAL);
  const e = estado.erros ?? {};
  const v: Valores = {
    tipo: estado.valores?.tipo ?? registro.tipo,
    valor: estado.valores?.valor ?? String(registro.valor),
    gestao: estado.valores?.gestao ?? registro.gestao,
    motivo: estado.valores?.motivo ?? registro.motivo,
  };

  return (
    <details className="mt-3 rounded-xl border border-border open:bg-secondary/20">
      <summary className="flex min-h-10 cursor-pointer list-none items-center px-4 text-sm text-muted-foreground hover:text-foreground">
        Corrigir <span className="sr-only">este lançamento</span>
      </summary>
      <div className="grid gap-5 border-t border-border p-4">
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(ev) => {
            ev.preventDefault();
            const dados = new FormData(ev.currentTarget);
            startTransition(() => corrigir(dados));
          }}
        >
          <input type="hidden" name="id" value={registro.id} />
          <CamposRegistro prefixo={`reg-${registro.id}`} e={e} v={v} />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <button type="submit" disabled={corrigindo} className={botaoPrimario}>
              {corrigindo ? "Salvando…" : "Salvar correção"}
            </button>
            <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
          </div>
        </form>
        <div className="flex justify-end border-t border-border pt-4">
          <ConfirmarExclusao
            id={registro.id}
            titulo="Excluir este lançamento?"
            descricao="Ele some do histórico do membro e do resumo da gestão. Não dá para desfazer."
            acao={excluirRegistro}
          />
        </div>
      </div>
    </details>
  );
}
