"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";

import { enviarImagemPost } from "@/lib/actions/publicacoes";
import { publicUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * Imagem do texto: o JSON guarda o caminho no Storage (posts/<id>/...), como o
 * site público espera (components/site/rich-text.tsx). Só a exibição no
 * editor troca o caminho pela URL pública.
 */
const ImagemDoPost = Image.extend({
  renderHTML({ HTMLAttributes }) {
    const src = typeof HTMLAttributes.src === "string" ? publicUrl("fotos", HTMLAttributes.src) : null;
    return ["img", { ...HTMLAttributes, src: src ?? "" }];
  },
}).configure({ inline: false, allowBase64: false });

const SEM_FORMATACAO = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  h2: false,
  h3: false,
  bullet: false,
  ordered: false,
  quote: false,
  link: false,
  podeDesfazer: false,
  podeRefazer: false,
};

type Props = {
  postId: string;
  inicial: unknown;
  onChange: (json: unknown) => void;
  erro?: string;
};

/** Editor do corpo do post. Só oferece o que o site sabe exibir. */
export function EditorTexto({ postId, inicial, onChange, erro }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ["mailto"],
          isAllowedUri: (url) => /^(https?:\/\/|mailto:)/i.test(url),
        },
      }),
      ImagemDoPost,
    ],
    content: inicial && typeof inicial === "object" && (inicial as { type?: string }).type === "doc" ? inicial : "",
    editorProps: {
      attributes: {
        class:
          "min-h-80 px-5 py-4 outline-none [&_p]:my-3 [&_h2]:mt-6 [&_h2]:font-serif [&_h2]:text-3xl [&_h3]:mt-4 [&_h3]:font-serif [&_h3]:text-2xl [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-ink-accent [&_a]:underline [&_img]:my-4 [&_img]:max-h-96 [&_img]:rounded-xl [&_hr]:my-6 [&_hr]:border-border",
        "aria-label": "Texto do post",
        role: "textbox",
        "aria-multiline": "true",
        ...(erro ? { "aria-invalid": "true", "aria-describedby": "corpo-erro" } : {}),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  const ativo =
    useEditorState({
      editor,
      selector: ({ editor: e }) =>
        e
          ? {
              bold: e.isActive("bold"),
              italic: e.isActive("italic"),
              underline: e.isActive("underline"),
              strike: e.isActive("strike"),
              h2: e.isActive("heading", { level: 2 }),
              h3: e.isActive("heading", { level: 3 }),
              bullet: e.isActive("bulletList"),
              ordered: e.isActive("orderedList"),
              quote: e.isActive("blockquote"),
              link: e.isActive("link"),
              podeDesfazer: e.can().undo(),
              podeRefazer: e.can().redo(),
            }
          : null,
    }) ?? SEM_FORMATACAO;

  const arquivoRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  if (!editor) {
    return <div className="min-h-96 rounded-[1rem_1rem_0.35rem_1rem] border border-border" aria-busy="true" />;
  }

  function editarLink() {
    if (!editor) return;
    const atual = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(
      "Endereço do link (https://… ou mailto:…). Deixe vazio para remover.",
      atual ?? "https://",
    );
    if (url === null) return;
    if (url.trim() === "" || url.trim() === "https://") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^(https?:\/\/|mailto:)/i.test(url.trim())) {
      setAviso("O link precisa começar com https:// ou mailto:.");
      return;
    }
    setAviso(null);
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  async function inserirImagem(arquivo: File) {
    if (!editor) return;
    setEnviando(true);
    setAviso(null);
    const dados = new FormData();
    dados.append("arquivo", arquivo);
    const r = await enviarImagemPost(postId, dados);
    setEnviando(false);
    if (!r.ok) {
      setAviso(r.erro);
      return;
    }
    const alt = window.prompt("Descreva a imagem para quem não pode vê-la (texto alternativo):", "") ?? "";
    editor.chain().focus().setImage({ src: r.path, alt: alt.trim() }).run();
  }

  return (
    <div
      className={cn(
        "rounded-[1rem_1rem_0.35rem_1rem] border bg-background dark:bg-input/20",
        erro ? "border-destructive" : "border-border",
      )}
    >
      <div
        role="toolbar"
        aria-label="Formatação do texto"
        className="flex flex-wrap gap-0.5 border-b border-border p-1.5"
      >
        <Botao rotulo="Desfazer" onClick={() => editor.chain().focus().undo().run()} desativado={!ativo.podeDesfazer}>
          <Undo2 />
        </Botao>
        <Botao rotulo="Refazer" onClick={() => editor.chain().focus().redo().run()} desativado={!ativo.podeRefazer}>
          <Redo2 />
        </Botao>
        <Separador />
        <Botao
          rotulo="Subtítulo"
          ativo={ativo.h2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 />
        </Botao>
        <Botao
          rotulo="Subtítulo menor"
          ativo={ativo.h3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 />
        </Botao>
        <Separador />
        <Botao rotulo="Negrito" ativo={ativo.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold />
        </Botao>
        <Botao rotulo="Itálico" ativo={ativo.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic />
        </Botao>
        <Botao
          rotulo="Sublinhado"
          ativo={ativo.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline />
        </Botao>
        <Botao rotulo="Tachado" ativo={ativo.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough />
        </Botao>
        <Botao rotulo="Link" ativo={ativo.link} onClick={editarLink}>
          <Link2 />
        </Botao>
        <Separador />
        <Botao rotulo="Lista" ativo={ativo.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List />
        </Botao>
        <Botao
          rotulo="Lista numerada"
          ativo={ativo.ordered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </Botao>
        <Botao rotulo="Citação" ativo={ativo.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote />
        </Botao>
        <Botao rotulo="Linha divisória" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus />
        </Botao>
        <Botao
          rotulo={enviando ? "Enviando imagem…" : "Inserir imagem"}
          desativado={enviando}
          onClick={() => arquivoRef.current?.click()}
        >
          <ImagePlus />
        </Botao>
        <input
          ref={arquivoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void inserirImagem(f);
          }}
        />
      </div>
      <EditorContent editor={editor} />
      <p role="status" aria-live="polite" className={cn("px-5 pb-3 text-sm text-destructive", !aviso && "sr-only")}>
        {aviso}
      </p>
    </div>
  );
}

function Botao({
  rotulo,
  ativo,
  desativado,
  onClick,
  children,
}: {
  rotulo: string;
  ativo?: boolean;
  desativado?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      aria-pressed={ativo === undefined ? undefined : ativo}
      disabled={desativado}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40 [&_svg]:size-4",
        ativo && "bg-secondary text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Separador() {
  return <span aria-hidden className="mx-1 my-1.5 w-px bg-border" />;
}
