"use client";

import { startTransition, useActionState, useState } from "react";

import { inputClasse } from "@/components/forms/field";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ESTADO_INICIAL, type FormState } from "@/lib/actions/form-state";
import type { MembroRH } from "@/lib/restrito";
import { cn } from "@/lib/utils";

/** Peças comuns aos formulários da Área Restrita (as classes ficam em estilos.ts). */

export type Acao = (anterior: FormState, dados: FormData) => Promise<FormState>;

/** Envia com startTransition (e não pelo prop action) para o React não resetar o formulário. */
export function enviar(acao: (dados: FormData) => void) {
  return (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const dados = new FormData(ev.currentTarget);
    startTransition(() => acao(dados));
  };
}

export function OpcoesMembro({ membros, vazio }: { membros: MembroRH[]; vazio: string }) {
  const ativos = membros.filter((m) => !m.alumni);
  const alumni = membros.filter((m) => m.alumni);
  return (
    <>
      <option value="">{vazio}</option>
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
    </>
  );
}

/** Diálogo de confirmação que mostra o erro do servidor (ex.: último Presidente/Diretor de RH). */
export function ConfirmarAcao({
  gatilho,
  gatilhoClasse,
  gatilhoRotulo,
  titulo,
  descricao,
  confirmar,
  pendente = "Removendo…",
  campos,
  acao,
  digitar,
  destrutivo = true,
}: {
  gatilho: React.ReactNode;
  gatilhoClasse: string;
  gatilhoRotulo?: string;
  titulo: string;
  descricao: string;
  confirmar: string;
  /** Texto do botão enquanto a ação roda. */
  pendente?: string;
  campos: Record<string, string>;
  acao: Acao;
  /** Exige digitar este texto (ex.: o nome do membro) antes de liberar o botão. Vai no campo "confirmacao". */
  digitar?: string;
  /** Botão de confirmar em cor de destaque (padrão) ou neutra, para ações que não apagam nada. */
  destrutivo?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const liberado = !digitar || texto.trim().toLowerCase() === digitar.trim().toLowerCase();
  const [estado, executar, executando] = useActionState(async (anterior: FormState, dados: FormData) => {
    const r = await acao(anterior, dados);
    if (r.status === "ok") setAberto(false);
    return r;
  }, ESTADO_INICIAL);

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        setTexto("");
      }}
    >
      <DialogTrigger asChild>
        <button type="button" aria-label={gatilhoRotulo} className={gatilhoClasse}>
          {gatilho}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogTitle className="font-serif text-2xl font-normal">{titulo}</DialogTitle>
        <DialogDescription>{descricao}</DialogDescription>
        <form className="mt-2 grid gap-4" onSubmit={enviar(executar)}>
          {Object.entries(campos).map(([nome, valor]) => (
            <input key={nome} type="hidden" name={nome} value={valor} />
          ))}
          {digitar ? (
            <label className="grid gap-1.5 text-sm">
              <span>
                Digite <strong className="font-medium">{digitar}</strong> para confirmar
              </span>
              <input
                name="confirmacao"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                autoComplete="off"
                className={cn(inputClasse, "border border-input")}
              />
            </label>
          ) : null}
          {estado.status === "erro" ? (
            <p role="alert" className="text-sm text-destructive">
              {estado.mensagem}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <button type="button" className="min-h-10 rounded-full px-4 text-sm hover:bg-secondary">
                Cancelar
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={executando || !liberado}
              className={cn(
                "min-h-10 rounded-full px-5 text-sm disabled:opacity-50",
                destrutivo ? "bg-destructive text-white" : "bg-primary text-primary-foreground",
              )}
            >
              {executando ? pendente : confirmar}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
