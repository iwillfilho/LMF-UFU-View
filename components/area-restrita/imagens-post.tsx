"use client";

import { ImagePlus, X } from "lucide-react";
import NextImage from "next/image";
import { useRef, useState } from "react";

import { enviarImagemPost } from "@/lib/actions/publicacoes";
import { publicUrl } from "@/lib/storage";

async function enviar(postId: string, arquivo: File) {
  const dados = new FormData();
  dados.append("arquivo", arquivo);
  return enviarImagemPost(postId, dados);
}

/**
 * Capa (uma imagem) ou galeria (várias). Envia na hora para posts/<id>/;
 * o que não for salvo no post é apagado depois pela própria ação de salvar.
 */
export function ImagensPost({
  postId,
  rotulo,
  multiplas,
  valor,
  onChange,
  erro,
}: {
  postId: string;
  rotulo: string;
  multiplas?: boolean;
  valor: string[];
  onChange: (paths: string[]) => void;
  erro?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const id = multiplas ? "galeria" : "capa";

  async function escolher(arquivos: FileList) {
    setEnviando(true);
    setAviso(null);
    const novos: string[] = [];
    for (const arquivo of Array.from(arquivos).slice(0, multiplas ? 30 : 1)) {
      const r = await enviar(postId, arquivo);
      if (r.ok) novos.push(r.path);
      else setAviso(`${arquivo.name}: ${r.erro}`);
    }
    setEnviando(false);
    if (novos.length) onChange(multiplas ? [...valor, ...novos].slice(0, 30) : novos);
  }

  return (
    <div className="grid gap-2">
      <p id={`${id}-rotulo`} className="text-sm text-foreground">
        {rotulo} <span className="text-muted-foreground">(opcional)</span>
      </p>
      <ul aria-labelledby={`${id}-rotulo`} className="flex flex-wrap gap-3">
        {valor.map((path, i) => (
          <li key={path} className="relative">
            <NextImage
              src={publicUrl("fotos", path) ?? ""}
              alt={multiplas ? `Foto ${i + 1} da galeria` : "Capa atual"}
              width={160}
              height={110}
              className="h-28 w-40 rounded-xl border border-border object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(valor.filter((p) => p !== path))}
              aria-label={multiplas ? `Remover foto ${i + 1}` : "Remover capa"}
              className="absolute -top-2 -right-2 inline-flex size-8 items-center justify-center rounded-full border border-border bg-background shadow hover:bg-secondary"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="inline-flex h-28 w-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground disabled:opacity-60"
          >
            <ImagePlus className="size-5" aria-hidden />
            {enviando ? "Enviando…" : multiplas ? "Adicionar fotos" : valor.length ? "Trocar capa" : "Escolher capa"}
          </button>
        </li>
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiplas}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files?.length) void escolher(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">JPG, PNG ou WebP, até 5 MB cada.</p>
      {erro || aviso ? (
        <p role="alert" className="text-sm text-destructive">
          {erro ?? aviso}
        </p>
      ) : null}
    </div>
  );
}
