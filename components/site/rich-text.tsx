import Image from "next/image";
import type { ReactNode } from "react";

import { publicUrl } from "@/lib/storage";

/**
 * Renderiza o JSON do editor Tiptap (posts.corpo) em React, sem
 * dangerouslySetInnerHTML. Nós desconhecidos são ignorados; links só
 * aceitam http(s) e mailto.
 */

type Mark = { type: string; attrs?: Record<string, unknown> };
type Node = { type?: string; text?: string; marks?: Mark[]; attrs?: Record<string, unknown>; content?: Node[] };

function hrefSeguro(href: unknown) {
  if (typeof href !== "string") return null;
  return /^(https?:\/\/|mailto:)/i.test(href) ? href : null;
}

function aplicarMarcas(texto: ReactNode, marks: Mark[] | undefined, key: string): ReactNode {
  return (marks ?? []).reduce<ReactNode>((acc, mark, i) => {
    const k = `${key}-m${i}`;
    switch (mark.type) {
      case "bold":
        return <strong key={k} className="font-medium">{acc}</strong>;
      case "italic":
        return <em key={k}>{acc}</em>;
      case "underline":
        return <u key={k}>{acc}</u>;
      case "strike":
        return <s key={k}>{acc}</s>;
      case "code":
        return <code key={k} className="rounded bg-secondary px-1 py-0.5 text-[0.9em]">{acc}</code>;
      case "link": {
        const href = hrefSeguro(mark.attrs?.href);
        if (!href) return acc;
        const externo = !href.startsWith("mailto:");
        return (
          <a
            key={k}
            href={href}
            className="text-ink-accent underline underline-offset-4"
            {...(externo ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
          >
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, texto);
}

function filhos(node: Node, key: string) {
  return (node.content ?? []).map((c, i) => renderNode(c, `${key}-${i}`));
}

function renderNode(node: Node, key: string): ReactNode {
  switch (node.type) {
    case "doc":
      return <>{filhos(node, key)}</>;
    case "text":
      return <span key={key}>{aplicarMarcas(node.text ?? "", node.marks, key)}</span>;
    case "paragraph":
      return <p key={key}>{filhos(node, key)}</p>;
    case "heading": {
      // h1 é o título do post; os níveis do corpo começam em h2.
      const nivel = Math.min(Math.max(Number(node.attrs?.level) || 2, 2), 4);
      const Tag = `h${nivel}` as "h2" | "h3" | "h4";
      return <Tag key={key}>{filhos(node, key)}</Tag>;
    }
    case "bulletList":
      return <ul key={key}>{filhos(node, key)}</ul>;
    case "orderedList":
      return <ol key={key}>{filhos(node, key)}</ol>;
    case "listItem":
      return <li key={key}>{filhos(node, key)}</li>;
    case "blockquote":
      return <blockquote key={key}>{filhos(node, key)}</blockquote>;
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} />;
    case "image": {
      // Imagens do corpo ficam no bucket `fotos` (posts/...). URLs externas são ignoradas.
      const path = typeof node.attrs?.src === "string" ? node.attrs.src : null;
      const src = path && !/^https?:/i.test(path) ? publicUrl("fotos", path) : null;
      if (!src) return null;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      return (
        <figure key={key}>
          <Image src={src} alt={alt} width={1200} height={800} sizes="(min-width: 768px) 720px, 100vw" className="h-auto w-full rounded-2xl" />
          {alt ? <figcaption>{alt}</figcaption> : null}
        </figure>
      );
    }
    default:
      return null;
  }
}

export function RichText({ doc }: { doc: unknown }) {
  if (!doc || typeof doc !== "object" || !Array.isArray((doc as Node).content) || (doc as Node).content!.length === 0) {
    return null;
  }
  return (
    <div
      className={[
        "space-y-5 text-lg leading-relaxed text-foreground/90",
        "[&_h2]:pt-4 [&_h2]:text-4xl [&_h3]:pt-2 [&_h3]:text-3xl [&_h4]:text-2xl",
        "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-5 [&_blockquote]:font-serif [&_blockquote]:text-2xl [&_blockquote]:italic",
        "[&_hr]:border-border [&_figcaption]:mt-2 [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground",
      ].join(" ")}
    >
      {renderNode(doc as Node, "rt")}
    </div>
  );
}
