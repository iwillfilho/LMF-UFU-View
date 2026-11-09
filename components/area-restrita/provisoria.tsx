import type { ReactNode } from "react";

/** Cabeçalho das abas da Área Restrita + aviso enquanto a aba não está pronta. */
export function PaginaProvisoria({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <h1 className="text-title">{titulo}</h1>
      <p className="mt-8 max-w-[62ch] rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-dashed border-border p-6 text-muted-foreground">
        {children}
      </p>
    </div>
  );
}
