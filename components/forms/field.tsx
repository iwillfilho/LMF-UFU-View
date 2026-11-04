import type { ReactNode } from "react";

import { HONEYPOT } from "@/lib/actions/form-state";
import { cn } from "@/lib/utils";

/** Rótulo + controle + dica/erro, com os ids de acessibilidade ligados. */
export function Field({
  id,
  label,
  erro,
  dica,
  opcional,
  className,
  children,
}: {
  id: string;
  label: string;
  erro?: string;
  dica?: string;
  opcional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm text-foreground">
        {label}
        {opcional ? <span className="text-muted-foreground"> (opcional)</span> : null}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="text-sm text-destructive">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="text-xs text-muted-foreground">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

/** Props de acessibilidade para o input de um Field. */
export function ariaCampo(id: string, erro?: string, dica?: string) {
  return {
    id,
    name: id,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": erro ? `${id}-erro` : dica ? `${id}-dica` : undefined,
  } as const;
}

export const inputClasse =
  "h-11 rounded-[0.9rem_0.9rem_0.3rem_0.9rem] bg-background px-3.5 text-[0.9375rem] md:text-[0.9375rem] dark:bg-input/20";

/** Campo isca escondido de pessoas e de leitores de tela. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Não preencha este campo
        <input type="text" name={HONEYPOT} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/** Mensagem geral do formulário (sucesso ou erro), anunciada por leitores de tela. */
export function AvisoFormulario({ status, mensagem }: { status: "idle" | "ok" | "erro"; mensagem?: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "text-[0.9375rem]",
        status === "ok" && "text-ink-accent",
        status === "erro" && "text-destructive",
        status === "idle" && "sr-only",
      )}
    >
      {mensagem}
    </p>
  );
}
