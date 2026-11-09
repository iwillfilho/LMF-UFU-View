/**
 * Valida e limpa o JSON do editor Tiptap antes de gravar em posts.corpo.
 * Reconstrói o documento só com os nós, marcas e atributos que
 * components/site/rich-text.tsx sabe renderizar; o resto é recusado.
 */

type No = { type?: unknown; text?: unknown; marks?: unknown; attrs?: unknown; content?: unknown };
type Limpo = {
  type: string;
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
  content?: Limpo[];
};

const NOS_COM_FILHOS = new Set(["doc", "paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote"]);
const NOS_FOLHA = new Set(["text", "hardBreak", "horizontalRule", "image"]);
const MARCAS_SIMPLES = new Set(["bold", "italic", "underline", "strike", "code"]);

const MAX_NOS = 5000;
const MAX_PROFUNDIDADE = 20;
const MAX_TEXTO = 100_000;

/** Caminhos de imagem citados num documento já salvo (para limpar arquivos que saíram do texto). */
export function imagensDoDoc(doc: unknown): string[] {
  const achadas: string[] = [];
  const visitar = (no: unknown, profundidade: number) => {
    if (!no || typeof no !== "object" || profundidade > MAX_PROFUNDIDADE) return;
    const n = no as No;
    const src = (n.attrs as Record<string, unknown> | undefined)?.src;
    if (n.type === "image" && typeof src === "string") achadas.push(src);
    if (Array.isArray(n.content)) n.content.forEach((f) => visitar(f, profundidade + 1));
  };
  visitar(doc, 0);
  return achadas;
}

export type ResultadoCorpo = { ok: true; doc: Limpo; imagens: string[] } | { ok: false; motivo: string };

class CorpoInvalido extends Error {}

function hrefPermitido(href: unknown): href is string {
  return typeof href === "string" && href.length <= 2000 && /^(https?:\/\/|mailto:)/i.test(href);
}

/**
 * @param bruto o JSON recebido do formulário
 * @param prefixoImagens pasta permitida para imagens do corpo, ex. "posts/<id>/"
 */
export function validarCorpo(bruto: unknown, prefixoImagens: string): ResultadoCorpo {
  let nos = 0;
  let texto = 0;
  const imagens: string[] = [];
  const imagemValida = new RegExp(
    `^${prefixoImagens.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[0-9a-f-]{36}\\.(jpg|png|webp)$`,
  );

  function limpar(no: No, profundidade: number): Limpo {
    if (++nos > MAX_NOS || profundidade > MAX_PROFUNDIDADE) throw new CorpoInvalido("O texto está grande demais.");
    if (!no || typeof no !== "object" || typeof no.type !== "string")
      throw new CorpoInvalido("Formato do texto inválido.");
    const tipo = no.type;
    const attrs = (no.attrs && typeof no.attrs === "object" ? no.attrs : {}) as Record<string, unknown>;

    if (!NOS_COM_FILHOS.has(tipo) && !NOS_FOLHA.has(tipo))
      throw new CorpoInvalido(`Elemento não permitido no texto: ${tipo}.`);

    if (tipo === "text") {
      if (typeof no.text !== "string" || no.text.length === 0) throw new CorpoInvalido("Formato do texto inválido.");
      texto += no.text.length;
      if (texto > MAX_TEXTO) throw new CorpoInvalido("O texto passou de 100 mil caracteres.");
      const marks = Array.isArray(no.marks)
        ? no.marks.map((m: { type?: unknown; attrs?: Record<string, unknown> }) => {
            if (typeof m?.type === "string" && MARCAS_SIMPLES.has(m.type)) return { type: m.type };
            if (m?.type === "link" && hrefPermitido(m.attrs?.href))
              return { type: "link", attrs: { href: m.attrs.href } };
            throw new CorpoInvalido(
              "Formatação ou link não permitido. Links precisam começar com https:// ou mailto:.",
            );
          })
        : undefined;
      return marks?.length ? { type: "text", text: no.text, marks } : { type: "text", text: no.text };
    }

    if (tipo === "image") {
      const src = attrs.src;
      if (typeof src !== "string" || !imagemValida.test(src))
        throw new CorpoInvalido("Imagem fora da pasta deste post.");
      imagens.push(src);
      const alt = typeof attrs.alt === "string" ? attrs.alt.slice(0, 300) : "";
      return { type: "image", attrs: { src, alt } };
    }

    if (tipo === "hardBreak" || tipo === "horizontalRule") return { type: tipo };

    const limpo: Limpo = { type: tipo };
    if (tipo === "heading") {
      const nivel = Number(attrs.level);
      limpo.attrs = { level: nivel >= 2 && nivel <= 4 ? nivel : 2 };
    }
    if (tipo === "orderedList" && Number.isInteger(attrs.start) && (attrs.start as number) > 1) {
      limpo.attrs = { start: attrs.start };
    }
    if (Array.isArray(no.content) && no.content.length > 0) {
      limpo.content = no.content.map((filho: No) => limpar(filho, profundidade + 1));
    }
    return limpo;
  }

  try {
    const doc = limpar(bruto as No, 0);
    if (doc.type !== "doc") return { ok: false, motivo: "Formato do texto inválido." };
    return { ok: true, doc, imagens };
  } catch (e) {
    if (e instanceof CorpoInvalido) return { ok: false, motivo: e.message };
    throw e;
  }
}
