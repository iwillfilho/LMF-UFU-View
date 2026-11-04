import Image from "next/image";
import Link from "next/link";

import { formatarData } from "@/lib/format";
import { CATEGORIA_LABEL } from "@/lib/labels";
import type { PostResumo } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function PostCard({ post, destaque = false }: { post: PostResumo; destaque?: boolean }) {
  const data = post.dataEvento ?? post.publicadoEm;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.75rem_1.75rem_0.5rem_1.75rem] border border-border bg-card",
        destaque && "md:flex-row",
      )}
    >
      <div className={cn("relative aspect-[16/10] shrink-0 overflow-hidden bg-secondary", destaque && "md:aspect-auto md:w-1/2")}>
        {post.capaUrl ? (
          <Image
            src={post.capaUrl}
            alt=""
            fill
            sizes={destaque ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <div aria-hidden className="galaxy-glow absolute inset-0 opacity-80" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <span className="pill bg-secondary text-secondary-foreground">{CATEGORIA_LABEL[post.categoria]}</span>
          {data ? <time dateTime={data}>{formatarData(data)}</time> : null}
        </div>
        <h3 className={cn("mt-4 leading-tight", destaque ? "text-4xl" : "text-2xl")}>
          {/* O link cobre o cartão inteiro, mas o texto do link é só o título. */}
          <Link href={`/publicacoes/${post.slug}`} className="after:absolute after:inset-0 group-hover:text-ink-accent">
            {post.titulo}
          </Link>
        </h3>
        {post.local ? <p className="mt-2 text-sm text-muted-foreground">{post.local}</p> : null}
        {post.resumo ? <p className="mt-3 text-muted-foreground">{post.resumo}</p> : null}
      </div>
    </article>
  );
}

/** Grade de posts com mensagem quando ainda não há nada publicado. */
export function PostGrid({ posts, vazio }: { posts: PostResumo[]; vazio: string }) {
  if (posts.length === 0) {
    return (
      <p className="max-w-[62ch] rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-dashed border-border p-6 text-muted-foreground">
        {vazio}
      </p>
    );
  }
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <li key={p.slug}>
          <PostCard post={p} />
        </li>
      ))}
    </ul>
  );
}
