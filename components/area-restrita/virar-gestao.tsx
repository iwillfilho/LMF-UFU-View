"use client";

import { startTransition, useActionState, useState } from "react";

import { botaoPrimario, botaoSecundario } from "@/components/area-restrita/estilos";
import { AvisoFormulario, Field, ariaCampo, inputClasse } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { ESTADO_INICIAL, type FormState } from "@/lib/actions/form-state";
import { virarGestao } from "@/lib/actions/membros";
import { plural } from "@/lib/format";
import { ROTULO_PAPEL, type Papel } from "@/lib/papeis";

export type AtivoVirada = { id: string; nome: string; cargo: string | null; gestao: string | null; papeis: Papel[] };

/**
 * Marca quem sai; quem não for marcado continua. Antes de gravar, mostra um
 * resumo para conferir, porque a ação mexe em muita gente de uma vez.
 */
export function FormVirarGestao({ ativos, gestaoPadrao }: { ativos: AtivoVirada[]; gestaoPadrao: string }) {
  const [gestao, setGestao] = useState(gestaoPadrao);
  const [saem, setSaem] = useState<Set<string>>(new Set());
  const [revisando, setRevisando] = useState(false);
  const [estado, executar, executando] = useActionState(async (anterior: FormState, dados: FormData) => {
    const r = await virarGestao(anterior, dados);
    setRevisando(false);
    if (r.status === "ok") setSaem(new Set());
    return r;
  }, ESTADO_INICIAL);
  const e = estado.erros ?? {};

  const alternar = (id: string, marcado: boolean) =>
    setSaem((atual) => {
      const novo = new Set(atual);
      if (marcado) novo.add(id);
      else novo.delete(id);
      return novo;
    });
  const comAcesso = ativos.filter((a) => saem.has(a.id) && a.papeis.length > 0);

  return (
    <form
      noValidate
      className="grid gap-8"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!revisando) {
          setRevisando(true);
          return;
        }
        const dados = new FormData(ev.currentTarget);
        startTransition(() => executar(dados));
      }}
    >
      <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
        <Field id="vg-gestao" label="Nova gestão" erro={e.gestao} dica="Semestre, no formato 2027.1.">
          <Input
            {...ariaCampo("vg-gestao", e.gestao, "dica")}
            name="gestao"
            inputMode="decimal"
            maxLength={6}
            value={gestao}
            onChange={(ev) => {
              setGestao(ev.target.value);
              setRevisando(false);
            }}
            className={inputClasse}
          />
        </Field>
        <label className="flex items-start gap-3 self-center text-[0.9375rem]">
          <input
            type="checkbox"
            name="copiar"
            defaultChecked
            onChange={() => setRevisando(false)}
            className="mt-1 size-4 shrink-0 accent-primary"
          />
          <span>
            Quem continua leva o cargo atual para a nova gestão
            <span className="block text-sm text-muted-foreground">Promoções se ajustam depois, na ficha de cada um.</span>
          </span>
        </label>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm text-foreground">Quem sai e vira alumni</legend>
        <p className="text-sm text-muted-foreground">
          Marque só quem deixa a liga. Quem sai perde o acesso à Área Restrita; cargos e relatórios continuam no
          currículo.
        </p>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {ativos.map((a) => (
            <li key={a.id} className="border-b border-border">
              <label className="flex min-h-14 cursor-pointer items-center gap-3 py-2">
                <input
                  type="checkbox"
                  name="sai"
                  value={a.id}
                  checked={saem.has(a.id)}
                  onChange={(ev) => {
                    alternar(a.id, ev.target.checked);
                    setRevisando(false);
                  }}
                  className="size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block">{a.nome}</span>
                  <span className="block text-sm text-muted-foreground">
                    {a.cargo ? `${a.cargo} · ${a.gestao}` : "Sem cargo cadastrado"}
                    {a.papeis.length > 0 ? ` · acesso: ${a.papeis.map((p) => ROTULO_PAPEL[p]).join(", ")}` : null}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {revisando ? (
        <div role="status" className="grid gap-3 rounded-xl border border-primary/50 bg-primary/5 p-4 text-[0.9375rem]">
          <p className="font-medium">Confira antes de abrir a gestão {gestao.trim() || "nova"}:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>{plural(saem.size, "membro vira", "membros viram")} alumni.</li>
            <li>{plural(ativos.length - saem.size, "membro continua", "membros continuam")} ativos.</li>
            {comAcesso.length > 0 ? (
              <li>Perdem o acesso à Área Restrita: {comAcesso.map((a) => a.nome).join(", ")}.</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button type="submit" disabled={executando} className={botaoPrimario}>
          {executando ? "Abrindo…" : revisando ? "Confirmar e abrir a gestão" : "Revisar"}
        </button>
        {revisando ? (
          <button type="button" onClick={() => setRevisando(false)} className={botaoSecundario}>
            Voltar
          </button>
        ) : null}
        <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
      </div>
    </form>
  );
}
