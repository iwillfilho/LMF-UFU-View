import Link from "next/link";

export function NaoEncontrado() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="galaxy-glow pointer-events-none absolute -top-40 right-[-20%] h-[36rem] w-[60rem] opacity-70" />
      <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-32 sm:px-6 lg:px-10">
        <p className="text-sm text-muted-foreground">Erro 404</p>
        <h1 className="text-title mt-4 max-w-[16ch]">
          Esta página <span className="text-ink-accent italic">não existe.</span>
        </h1>
        <p className="mt-6 max-w-[52ch] text-lg text-muted-foreground">
          O link pode estar errado ou o conteúdo foi removido. Que tal começar pela página inicial?
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link
            href="/"
            className="pill bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum dark:hover:bg-lilac dark:hover:text-galaxy"
          >
            Ir para o início
          </Link>
          <Link href="/contato" className="text-[0.9375rem] underline-offset-4 hover:text-ink-accent hover:underline">
            Avisar a liga sobre o link quebrado
          </Link>
        </div>
      </div>
    </section>
  );
}
