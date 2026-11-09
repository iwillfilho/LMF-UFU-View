"use client";

import { X } from "lucide-react";
import { useActionState, useRef } from "react";

import { ConfirmarAcao, OpcoesMembro, enviar } from "@/components/area-restrita/campos";
import { botaoPrimario, botaoSecundario, selectClasse } from "@/components/area-restrita/estilos";
import { AvisoFormulario, Field, ariaCampo, inputClasse } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { concederAcesso, revogarPapel, revogarTudo, vincularMembro } from "@/lib/actions/acessos";
import { ESTADO_INICIAL, type FormState } from "@/lib/actions/form-state";
import { DESCRICAO_PAPEL, PAPEIS, type Papel, ROTULO_PAPEL } from "@/lib/papeis";
import type { MembroRH, PessoaComAcesso } from "@/lib/restrito";
import { cn } from "@/lib/utils";

/** Liberar acesso para um e-mail novo (ou somar um papel a um e-mail que já tem acesso). */
export function FormConceder({ membros }: { membros: MembroRH[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, conceder, concedendo] = useActionState(async (anterior: FormState, dados: FormData) => {
    const r = await concederAcesso(anterior, dados);
    if (r.status === "ok") formRef.current?.reset();
    return r;
  }, ESTADO_INICIAL);
  const e = estado.erros ?? {};
  const v = estado.status === "erro" ? (estado.valores ?? {}) : {};

  return (
    <form ref={formRef} noValidate className="grid gap-5" onSubmit={enviar(conceder)}>
      <Field
        id="acesso-email"
        label="E-mail da conta Google"
        erro={e.email}
        dica="O mesmo e-mail que a pessoa vai usar no botão “Entrar com Google”."
      >
        <Input
          {...ariaCampo("acesso-email", e.email, "dica")}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          spellCheck={false}
          maxLength={254}
          defaultValue={v.email}
          className={inputClasse}
        />
      </Field>

      <fieldset className="grid gap-2" aria-describedby={e.papel ? "acesso-papel-erro" : undefined}>
        <legend className="mb-1.5 text-sm text-foreground">Papel</legend>
        {PAPEIS.map((papel) => (
          <label
            key={papel}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3 has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <input
              type="radio"
              name="papel"
              value={papel}
              defaultChecked={(v.papel || "membro") === papel}
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <span className="grid gap-0.5">
              <span className="text-[0.9375rem]">{ROTULO_PAPEL[papel]}</span>
              <span className="text-sm text-muted-foreground">{DESCRICAO_PAPEL[papel]}</span>
            </span>
          </label>
        ))}
        {e.papel ? (
          <p id="acesso-papel-erro" className="text-sm text-destructive">
            {e.papel}
          </p>
        ) : null}
      </fieldset>

      <Field
        id="acesso-membro"
        label="Cadastro de membro"
        opcional
        erro={e.membro}
        dica="Liga a conta ao cadastro, para a pessoa ver os próprios pontos. Se o e-mail já tem acesso, fica o vínculo atual."
      >
        <select
          {...ariaCampo("acesso-membro", e.membro, "dica")}
          name="membro"
          defaultValue={v.membro ?? ""}
          className={selectClasse}
        >
          <OpcoesMembro membros={membros} vazio="Sem vínculo" />
        </select>
      </Field>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="submit" disabled={concedendo} className={botaoPrimario}>
          {concedendo ? "Liberando…" : "Liberar acesso"}
        </button>
        <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
      </div>
    </form>
  );
}

function AdicionarPapel({ email, faltam }: { email: string; faltam: Papel[] }) {
  const [estado, conceder, concedendo] = useActionState(concederAcesso, ESTADO_INICIAL);
  const id = `add-${email}`;
  return (
    <form noValidate className="grid gap-3" onSubmit={enviar(conceder)}>
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="membro" value="" />
      <div className="flex flex-wrap items-end gap-2">
        <Field id={id} label="Adicionar papel" className="min-w-48 flex-1">
          <select id={id} name="papel" defaultValue={faltam[0]} className={selectClasse}>
            {faltam.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PAPEL[p]}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" disabled={concedendo} className={botaoSecundario}>
          {concedendo ? "Adicionando…" : "Adicionar"}
        </button>
      </div>
      <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
    </form>
  );
}

function TrocarVinculo({ pessoa, membros }: { pessoa: PessoaComAcesso; membros: MembroRH[] }) {
  const [estado, vincular, vinculando] = useActionState(vincularMembro, ESTADO_INICIAL);
  const id = `vinc-${pessoa.email}`;
  return (
    <form noValidate className="grid gap-3" onSubmit={enviar(vincular)}>
      <input type="hidden" name="email" value={pessoa.email} />
      <div className="flex flex-wrap items-end gap-2">
        <Field id={id} label="Cadastro de membro" className="min-w-48 flex-1">
          <select
            id={id}
            name="membro"
            defaultValue={estado.valores?.membro ?? pessoa.membroId ?? ""}
            className={selectClasse}
          >
            <OpcoesMembro membros={membros} vazio="Sem vínculo" />
          </select>
        </Field>
        <button type="submit" disabled={vinculando} className={botaoSecundario}>
          {vinculando ? "Salvando…" : "Salvar vínculo"}
        </button>
      </div>
      <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
    </form>
  );
}

/** Uma pessoa com acesso: papéis (cada um removível), situação do login e gestão do vínculo. */
export function PessoaAcesso({
  pessoa,
  membros,
  voce,
}: {
  pessoa: PessoaComAcesso;
  membros: MembroRH[];
  voce: boolean;
}) {
  const faltam = PAPEIS.filter((p) => !pessoa.papeis.some((x) => x.papel === p));
  const aviso = voce ? " Como é o seu próprio acesso, você sai desta página em seguida." : "";

  return (
    <li className="grid gap-3 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="text-lg">
            {pessoa.membro ?? pessoa.email}
            {voce ? <span className="ml-2 text-sm text-ink-accent">Você</span> : null}
          </p>
          {pessoa.membro ? <p className="text-sm break-all text-muted-foreground">{pessoa.email}</p> : null}
        </div>
        <p className={cn("text-sm", pessoa.entrou ? "text-muted-foreground" : "text-ink-accent")}>
          {pessoa.entrou ? "Já entrou" : "Ainda não entrou"}
        </p>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label={`Papéis de ${pessoa.membro ?? pessoa.email}`}>
        {pessoa.papeis.map(({ grantId, papel }) => (
          <li
            key={grantId}
            className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border py-0.5 pr-0.5 pl-3.5 text-sm"
          >
            {ROTULO_PAPEL[papel]}
            <ConfirmarAcao
              gatilho={<X className="size-4" aria-hidden />}
              gatilhoRotulo={`Remover o papel ${ROTULO_PAPEL[papel]} de ${pessoa.email}`}
              gatilhoClasse="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              titulo={`Remover o papel ${ROTULO_PAPEL[papel]}?`}
              descricao={
                (pessoa.papeis.length === 1
                  ? `É o único papel de ${pessoa.email}: a pessoa perde o acesso à Área Restrita.`
                  : `${pessoa.email} mantém os outros papéis.`) + aviso
              }
              confirmar="Remover papel"
              campos={{ id: grantId }}
              acao={revogarPapel}
            />
          </li>
        ))}
      </ul>

      <details className="rounded-xl border border-border open:bg-secondary/20">
        <summary className="flex min-h-10 cursor-pointer list-none items-center px-4 text-sm text-muted-foreground hover:text-foreground">
          Gerenciar <span className="sr-only">o acesso de {pessoa.email}</span>
        </summary>
        <div className="grid gap-6 border-t border-border p-4">
          {faltam.length > 0 ? <AdicionarPapel email={pessoa.email} faltam={faltam} /> : null}
          <TrocarVinculo pessoa={pessoa} membros={membros} />
          <div className="flex justify-end border-t border-border pt-4">
            <ConfirmarAcao
              gatilho="Remover todo o acesso"
              gatilhoClasse="inline-flex min-h-10 items-center rounded-full px-4 text-sm text-destructive hover:bg-destructive/10"
              titulo="Remover todo o acesso?"
              descricao={`${pessoa.email} perde todos os papéis e sai da Área Restrita na próxima página. Dá para liberar de novo depois.${aviso}`}
              confirmar="Remover acesso"
              campos={{ email: pessoa.email }}
              acao={revogarTudo}
            />
          </div>
        </div>
      </details>
    </li>
  );
}
