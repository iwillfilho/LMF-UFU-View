import type { ReactNode } from "react";

/** Cabeçalho padrão das páginas internas: título serifado grande + texto de apoio. */
export function PageIntro({ titulo, children }: { titulo: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="galaxy-glow pointer-events-none absolute -top-40 right-[-20%] h-[36rem] w-[60rem] opacity-70" />
      <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-12 sm:px-6 lg:px-10 lg:pt-28">
        <h1 className="text-title max-w-[18ch]">{titulo}</h1>
        {children ? <div className="mt-6 max-w-[62ch] text-lg text-muted-foreground">{children}</div> : null}
      </div>
    </section>
  );
}

/** Aviso temporário para páginas que ainda serão construídas nas próximas fases. */
export function EmConstrucao({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-10">
      <p className="max-w-[62ch] rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-dashed border-border p-6 text-muted-foreground">
        {children}
      </p>
    </div>
  );
}
