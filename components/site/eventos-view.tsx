import Link from "next/link";

import { PageIntro } from "@/components/site/page-intro";
import { PostCard, PostGrid } from "@/components/site/post-card";
import { SUBPAGINAS_EVENTOS, type SubpaginaEventos } from "@/lib/labels";
import { type Categoria, getEventos } from "@/lib/queries";
import { cn } from "@/lib/utils";

const ABAS: { href: string; label: string; chave: SubpaginaEventos | "todos" }[] = [
  { href: "/eventos", label: "Todos", chave: "todos" },
  ...(Object.entries(SUBPAGINAS_EVENTOS) as [SubpaginaEventos, { titulo: string }][]).map(([chave, s]) => ({
    href: `/eventos/${chave}`,
    label: s.titulo,
    chave,
  })),
];

/** Próximos em destaque e anteriores logo abaixo, sem "ver arquivo completo" (pedido do PDF). */
export async function EventosView({
  titulo,
  descricao,
  categorias,
  ativa,
}: {
  titulo: string;
  descricao: string;
  categorias: Categoria[];
  ativa: SubpaginaEventos | "todos";
}) {
  const { proximos, anteriores } = await getEventos(categorias);

  return (
    <>
      <PageIntro titulo={titulo}>{descricao}</PageIntro>

      <nav aria-label="Tipos de evento" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-10">
        <ul className="flex flex-wrap gap-2">
          {ABAS.map((aba) => (
            <li key={aba.chave}>
              <Link
                href={aba.href}
                aria-current={aba.chave === ativa ? "page" : undefined}
                className={cn(
                  "pill border transition-colors",
                  aba.chave === ativa
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-ink-accent hover:text-foreground",
                )}
              >
                {aba.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="proximos-titulo" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
        <h2 id="proximos-titulo" className="text-4xl">
          Próximos
        </h2>
        <div className="mt-8">
          {proximos.length === 0 ? (
            <p className="max-w-[62ch] rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-dashed border-border p-6 text-muted-foreground">
              Nenhum evento agendado no momento. Novidades saem primeiro no Instagram da liga.
            </p>
          ) : (
            <ul className="grid gap-6">
              {proximos.map((p, i) => (
                <li key={p.slug}>
                  <PostCard post={p} destaque={i === 0} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="anteriores-titulo" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
          <h2 id="anteriores-titulo" className="text-4xl">
            Anteriores
          </h2>
          <div className="mt-8">
            <PostGrid posts={anteriores} vazio="Os eventos já realizados aparecem aqui assim que forem publicados." />
          </div>
        </div>
      </section>
    </>
  );
}
