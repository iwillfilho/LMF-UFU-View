"use client";

import { FileUp } from "lucide-react";
import { startTransition, useActionState, useRef, useState } from "react";

import { ConfirmarExclusao } from "@/components/area-restrita/excluir";
import { AvisoFormulario, Field, ariaCampo, inputClasse } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  criarDocumento,
  excluirDocumento,
  salvarDocumento,
  salvarDrive,
  trocarArquivoDocumento,
} from "@/lib/actions/documentos";
import { ESTADO_INICIAL, type FormState } from "@/lib/actions/form-state";
import { CATEGORIA_DOCUMENTO } from "@/lib/labels";
import { ehPdf, PDF_MAX, primeirosBytes } from "@/lib/arquivos";
import type { Documento } from "@/lib/restrito";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";


const selectClasse = cn(inputClasse, "w-full border border-input");
const botaoPrimario =
  "pill bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum disabled:opacity-60 dark:hover:bg-lilac dark:hover:text-galaxy";

/** Confere no navegador e envia o PDF direto ao bucket privado (até 20 MB). */
async function enviarPdf(
  pasta: string,
  arquivo: File,
): Promise<{ ok: true; path: string } | { ok: false; erro: string }> {
  if (arquivo.size > PDF_MAX) return { ok: false, erro: "O PDF pode ter no máximo 20 MB." };
  if (!ehPdf(await primeirosBytes(arquivo))) return { ok: false, erro: "Este arquivo não é um PDF." };
  const path = `${pasta}/${crypto.randomUUID()}.pdf`;
  const { error } = await createClient()
    .storage.from("documentos")
    .upload(path, arquivo, { contentType: "application/pdf", upsert: false });
  if (error) return { ok: false, erro: "Não foi possível enviar o PDF. Tente de novo." };
  return { ok: true, path };
}

/** Campos comuns de criar e editar. */
function CamposDocumento({ prefixo, e, v }: { prefixo: string; e: Record<string, string>; v: Partial<Documento> }) {
  const id = (c: string) => `${prefixo}-${c}`;
  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
      <Field id={id("titulo")} label="Título" erro={e.titulo} className="sm:col-span-3">
        <Input
          {...ariaCampo(id("titulo"), e.titulo)}
          name="titulo"
          defaultValue={v.titulo}
          maxLength={160}
          className={inputClasse}
        />
      </Field>
      <Field id={id("categoria")} label="Categoria" erro={e.categoria} className="sm:col-span-2">
        <select
          {...ariaCampo(id("categoria"), e.categoria)}
          name="categoria"
          defaultValue={v.categoria ?? "auxiliar"}
          className={selectClasse}
        >
          {Object.entries(CATEGORIA_DOCUMENTO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </Field>
      <Field id={id("ordem")} label="Ordem" erro={e.ordem}>
        <Input
          {...ariaCampo(id("ordem"), e.ordem)}
          name="ordem"
          type="number"
          min={0}
          max={999}
          defaultValue={v.ordem ?? 0}
          className={inputClasse}
        />
      </Field>
      <Field id={id("descricao")} label="Descrição" opcional erro={e.descricao} className="sm:col-span-3">
        <Textarea
          {...ariaCampo(id("descricao"), e.descricao)}
          name="descricao"
          defaultValue={v.descricao}
          rows={2}
          maxLength={500}
          className={cn(inputClasse, "h-auto py-3")}
        />
      </Field>
    </div>
  );
}

export function NovoDocumento() {
  // Cada sucesso troca a key do formulário, que volta vazio para o próximo documento.
  const [sucessos, setSucessos] = useState(0);
  const [estado, criar, criando] = useActionState(async (anterior: FormState, dados: FormData) => {
    const r = await criarDocumento(anterior, dados);
    if (r.status === "ok") setSucessos((n) => n + 1);
    return r;
  }, ESTADO_INICIAL);
  const [enviando, setEnviando] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const e = estado.erros ?? {};
  const v = estado.valores ?? {};

  return (
    <form
      key={sucessos}
      noValidate
      className="grid gap-5"
      onSubmit={async (ev) => {
        ev.preventDefault();
        const form = ev.currentTarget;
        const arquivo = (form.elements.namedItem("pdf") as HTMLInputElement).files?.[0];
        setErroArquivo(null);
        if (!arquivo) return setErroArquivo("Escolha o PDF do documento.");
        setEnviando(true);
        const id = crypto.randomUUID();
        const envio = await enviarPdf(id, arquivo);
        setEnviando(false);
        if (!envio.ok) return setErroArquivo(envio.erro);
        const dados = new FormData(form);
        dados.set("id", id);
        dados.set("arquivo", envio.path);
        dados.delete("pdf");
        startTransition(() => criar(dados));
      }}
    >
      <CamposDocumento prefixo="novo" e={e} v={v as Partial<Documento>} />
      <Field id="novo-pdf" label="Arquivo PDF" erro={erroArquivo ?? e.arquivo} dica="Até 20 MB.">
        <input
          {...ariaCampo("novo-pdf", erroArquivo ?? e.arquivo, "dica")}
          name="pdf"
          type="file"
          accept="application/pdf"
          className="text-sm file:mr-3 file:rounded-full file:border file:border-border file:bg-transparent file:px-4 file:py-2 file:text-foreground hover:file:bg-secondary"
        />
      </Field>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="submit" disabled={enviando || criando} className={botaoPrimario}>
          {enviando ? "Enviando PDF…" : criando ? "Salvando…" : "Adicionar documento"}
        </button>
        <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
      </div>
    </form>
  );
}

export function GerenciarDocumento({ doc }: { doc: Documento }) {
  const [estado, salvar, salvando] = useActionState(salvarDocumento, ESTADO_INICIAL);
  const e = estado.erros ?? {};
  const v = (estado.valores as Partial<Documento> | undefined) ?? doc;

  const arquivoRef = useRef<HTMLInputElement>(null);
  const [troca, setTroca] = useState<{ etapa: "parado" | "enviando"; aviso?: { ok: boolean; texto: string } }>({
    etapa: "parado",
  });

  async function trocar(arquivo: File) {
    setTroca({ etapa: "enviando" });
    const envio = await enviarPdf(doc.id, arquivo);
    if (!envio.ok) return setTroca({ etapa: "parado", aviso: { ok: false, texto: envio.erro } });
    const r = await trocarArquivoDocumento(doc.id, envio.path);
    setTroca({ etapa: "parado", aviso: { ok: r.ok, texto: r.mensagem } });
  }

  return (
    <details className="group mt-3 rounded-xl border border-border open:bg-secondary/20">
      <summary className="flex min-h-10 cursor-pointer list-none items-center px-4 text-sm text-muted-foreground hover:text-foreground">
        Gerenciar <span className="sr-only">“{doc.titulo}”</span>
      </summary>
      <div className="grid gap-6 border-t border-border p-4">
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(ev) => {
            ev.preventDefault();
            const dados = new FormData(ev.currentTarget);
            startTransition(() => salvar(dados));
          }}
        >
          <input type="hidden" name="id" value={doc.id} />
          <CamposDocumento prefixo={`doc-${doc.id}`} e={e} v={v} />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <button type="submit" disabled={salvando} className={botaoPrimario}>
              {salvando ? "Salvando…" : "Salvar alterações"}
            </button>
            <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => arquivoRef.current?.click()}
            disabled={troca.etapa !== "parado"}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm hover:bg-secondary disabled:opacity-60"
          >
            <FileUp className="size-4" aria-hidden />
            {troca.etapa === "enviando" ? "Enviando…" : "Trocar PDF"}
          </button>
          <input
            ref={arquivoRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              ev.target.value = "";
              if (f) void trocar(f);
            }}
          />
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "text-sm",
              troca.aviso?.ok ? "text-ink-accent" : "text-destructive",
              !troca.aviso && "sr-only",
            )}
          >
            {troca.aviso?.texto}
          </p>
          <div className="ml-auto">
            <ConfirmarExclusao
              id={doc.id}
              titulo="Excluir este documento?"
              descricao={`“${doc.titulo}” e o PDF dele são apagados para todos os membros. Não dá para desfazer.`}
              acao={excluirDocumento}
            />
          </div>
        </div>
      </div>
    </details>
  );
}

export function FormDrive({ atual }: { atual: string | null }) {
  const [estado, salvar, salvando] = useActionState(salvarDrive, ESTADO_INICIAL);
  const e = estado.erros ?? {};

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        const dados = new FormData(ev.currentTarget);
        startTransition(() => salvar(dados));
      }}
    >
      <Field
        id="drive_url"
        label="Link da pasta do Google Drive"
        erro={e.drive_url}
        dica="Só membros logados veem este link. Deixe vazio para esconder o botão."
      >
        <Input
          {...ariaCampo("drive_url", e.drive_url, "dica")}
          type="url"
          inputMode="url"
          defaultValue={estado.valores?.drive_url ?? atual ?? ""}
          placeholder="https://drive.google.com/drive/folders/…"
          className={inputClasse}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          {salvando ? "Salvando…" : "Salvar link"}
        </button>
        <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
      </div>
    </form>
  );
}
