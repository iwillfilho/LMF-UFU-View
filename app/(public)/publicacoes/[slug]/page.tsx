import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RichText } from "@/components/site/rich-text";
import { formatarData } from "@/lib/format";
import { CATEGORIA_LABEL } from "@/lib/labels";
import { getPost, getSlugsPosts } from "@/lib/queries";
import { siteConfig } from "@/lib/site-config";

import ogPadrao from "../../../opengraph-image.png";

/** Com Cache Components a lista não pode ser vazia; o marcador cai em notFound(). */
const SEM_POSTS = "__sem-publicacoes__";

export async function generateStaticParams() {
  const slugs = await getSlugsPosts();
  return (slugs.length > 0 ? slugs : [SEM_POSTS]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/publicacoes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Publicação não encontrada" };
  return {
    title: post.titulo,
    description: post.resumo ?? undefined,
    // O openGraph da página substitui o do layout inteiro: repete os campos comuns.
    openGraph: {
      type: "article",
      locale: "pt_BR",
      siteName: siteConfig.nomeCompleto,
      url: "./",
      title: post.titulo,
      description: post.resumo ?? undefined,
      // Sem capa, a imagem padrão do app/ não é herdada: precisa vir explícita.
      images: post.capaUrl ? [post.capaUrl] : [{ url: ogPadrao.src, width: ogPadrao.width, height: ogPadrao.height }],
    },
  };
}

const VOLTAR: Record<string, { href: string; label: string }> = {
  competicao: { href: "/competicoes", label: "Competições" },
  smf: { href: "/eventos/smf", label: "SMF" },
  viagem: { href: "/eventos/viagens", label: "Viagens" },
  palestra: { href: "/eventos/palestras", label: "Palestras" },
  evento: { href: "/eventos", label: "Eventos" },
};

export default async function Page({ params }: PageProps<"/publicacoes/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const voltar = VOLTAR[post.categoria];
  const data = post.dataEvento ?? post.publicadoEm;

  return (
    <article className="pb-24">
      <header className="mx-auto max-w-3xl px-4 pt-14 sm:px-6 lg:pt-20">
        <Link href={voltar.href} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-ink-accent">
          <ArrowLeft className="size-4" aria-hidden /> {voltar.label}
        </Link>
        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <span className="pill bg-secondary text-secondary-foreground">{CATEGORIA_LABEL[post.categoria]}</span>
          {data ? <time dateTime={data}>{formatarData(data)}</time> : null}
          {post.local ? <span>{post.local}</span> : null}
        </div>
        <h1 className="text-title mt-5">{post.titulo}</h1>
        {post.resumo ? <p className="mt-6 text-xl leading-relaxed text-muted-foreground">{post.resumo}</p> : null}
        {post.autor ? <p className="mt-4 text-sm text-muted-foreground">Por {post.autor}</p> : null}
      </header>

      {post.capaUrl ? (
        <div className="relative mx-auto mt-12 aspect-[16/9] max-w-5xl overflow-hidden sm:rounded-[2rem_2rem_0.5rem_2rem]">
          <Image src={post.capaUrl} alt="" fill priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
        </div>
      ) : null}

      <div className="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
        <RichText doc={post.corpo} />
      </div>

      {post.galeria.length > 0 ? (
        <section aria-label="Galeria de fotos" className="mx-auto mt-16 max-w-5xl px-4 sm:px-6">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {post.galeria.map((src) => (
              <li key={src} className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem_1.25rem_0.35rem_1.25rem]">
                <Image src={src} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
