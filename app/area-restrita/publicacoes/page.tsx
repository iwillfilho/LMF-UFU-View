import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPapel } from "@/lib/auth";
import { CATEGORIA_LABEL, TIPO_RELATORIO_LABEL } from "@/lib/labels";
import { PUBLICA } from "@/lib/papeis";
import { getPostsEditor, getRelatoriosEditor } from "@/lib/restrito";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Publicações" };

const dataCurta = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const AVISOS: Record<string, string> = { post: "Post excluído.", relatorio: "Relatório excluído." };

export default async function Page({ searchParams }: PageProps<"/area-restrita/publicacoes">) {
  await exigirPapel(PUBLICA);
  const [posts, relatorios, params] = await Promise.all([getPostsEditor(), getRelatoriosEditor(), searchParams]);
  const aviso = typeof params.excluido === "string" ? AVISOS[params.excluido] : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <h1 className="text-title">Publicações</h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Posts aparecem em Eventos, Competições e na página inicial. Relatórios aparecem em Relatórios e no currículo dos
        autores.
      </p>
      {aviso ? (
        <p role="status" className="mt-6 text-ink-accent">
          {aviso}
        </p>
      ) : null}

      <Secao
        titulo="Posts"
        novo="/area-restrita/publicacoes/posts/novo"
        rotuloNovo="Novo post"
        vazio="Nenhum post ainda."
      >
        {posts.map((p) => (
          <Linha
            key={p.id}
            href={`/area-restrita/publicacoes/posts/${p.id}`}
            titulo={p.titulo}
            publicado={p.publicado}
            detalhes={[
              CATEGORIA_LABEL[p.categoria],
              p.dataEvento ? `evento em ${dataCurta.format(new Date(p.dataEvento))}` : null,
            ]}
          />
        ))}
      </Secao>

      <Secao
        titulo="Relatórios"
        novo="/area-restrita/publicacoes/relatorios/novo"
        rotuloNovo="Novo relatório"
        vazio="Nenhum relatório ainda."
      >
        {relatorios.map((r) => (
          <Linha
            key={r.id}
            href={`/area-restrita/publicacoes/relatorios/${r.id}`}
            titulo={r.titulo}
            publicado={r.publicado}
            detalhes={[TIPO_RELATORIO_LABEL[r.tipo], r.nucleo, r.temPdf ? null : "sem PDF"]}
          />
        ))}
      </Secao>
    </div>
  );
}

function Secao({
  titulo,
  novo,
  rotuloNovo,
  vazio,
  children,
}: {
  titulo: string;
  novo: string;
  rotuloNovo: string;
  vazio: string;
  children: React.ReactNode[];
}) {
  return (
    <section aria-labelledby={`secao-${titulo}`} className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id={`secao-${titulo}`} className="text-3xl">
          {titulo}
        </h2>
        <Link
          href={novo}
          className="pill bg-primary px-5 py-2.5 text-[0.9375rem] text-primary-foreground transition-colors hover:bg-plum dark:hover:bg-lilac dark:hover:text-galaxy"
        >
          <Plus className="size-4" aria-hidden />
          {rotuloNovo}
        </Link>
      </div>
      {children.length > 0 ? (
        <ul className="mt-5 divide-y divide-border border-y border-border">{children}</ul>
      ) : (
        <p className="mt-5 text-muted-foreground">{vazio}</p>
      )}
    </section>
  );
}

function Linha({
  href,
  titulo,
  publicado,
  detalhes,
}: {
  href: string;
  titulo: string;
  publicado: boolean;
  detalhes: (string | null)[];
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-4 transition-colors hover:bg-secondary/50"
      >
        <span className="min-w-0 flex-1 basis-64 text-[0.9375rem] text-foreground">{titulo}</span>
        <span className="text-sm text-muted-foreground">{detalhes.filter(Boolean).join(" · ")}</span>
        <span
          className={cn("pill", publicado ? "bg-primary/15 text-ink-accent" : "bg-secondary text-muted-foreground")}
        >
          {publicado ? "Publicado" : "Rascunho"}
        </span>
      </Link>
    </li>
  );
}
