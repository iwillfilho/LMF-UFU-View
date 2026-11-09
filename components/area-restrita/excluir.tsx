"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Botão "Excluir" que só age depois de a pessoa confirmar digitando EXCLUIR. */
export function ConfirmarExclusao({
  id,
  titulo,
  descricao,
  acao,
}: {
  id: string;
  titulo: string;
  descricao: string;
  acao: (formData: FormData) => Promise<void>;
}) {
  const [texto, setTexto] = useState("");

  return (
    <Dialog onOpenChange={() => setTexto("")}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" aria-hidden />
          Excluir
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogTitle className="font-serif text-2xl font-normal">{titulo}</DialogTitle>
        <DialogDescription>{descricao}</DialogDescription>
        <form action={acao} className="mt-2 grid gap-4">
          <input type="hidden" name="id" value={id} />
          <label className="grid gap-1.5 text-sm">
            Digite EXCLUIR para confirmar
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoComplete="off"
              className="h-11 rounded-[0.9rem_0.9rem_0.3rem_0.9rem] border border-input bg-background px-3.5 dark:bg-input/20"
            />
          </label>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <button type="button" className="min-h-10 rounded-full px-4 text-sm hover:bg-secondary">
                Cancelar
              </button>
            </DialogClose>
            <BotaoExcluir liberado={texto.trim().toUpperCase() === "EXCLUIR"} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BotaoExcluir({ liberado }: { liberado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!liberado || pending}
      className="min-h-10 rounded-full bg-destructive px-5 text-sm text-white disabled:opacity-50"
    >
      {pending ? "Excluindo…" : "Excluir de vez"}
    </button>
  );
}
