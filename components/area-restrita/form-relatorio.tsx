"use client";

import { ArrowDown, ArrowUp, Check, ChevronsUpDown, ExternalLink, FileUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { ConfirmarExclusao } from "@/components/area-restrita/excluir";
import { AvisoFormulario, Field, ariaCampo, inputClasse } from "@/components/forms/field";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ESTADO_INICIAL, type FormState } from "@/lib/actions/form-state";
import { anexarPdfRelatorio, excluirRelatorio, salvarRelatorio } from "@/lib/actions/publicacoes";
import { ehPdf, PDF_MAX, primeirosBytes } from "@/lib/arquivos";
import { TIPO_RELATORIO_LABEL } from "@/lib/labels";
import type { Opcao, RelatorioEditor } from "@/lib/restrito";
import { publicUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const selectClasse = cn(inputClasse, "w-full border border-input");

export function FormRelatorio({
  relatorio,
  membros,
  nucleos,
}: {
  relatorio: RelatorioEditor;
  membros: Opcao[];
  nucleos: Opcao[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [campos, setCampos] = useState({
    titulo: relatorio.titulo,
    resumo: relatorio.resumo,
    tipo: relatorio.tipo,
    nucleo_id: relatorio.nucleoId ?? "",
    setor: relatorio.setor,
    ticker: relatorio.ticker,
  });
  const [autores, setAutores] = useState<string[]>(relatorio.autores);
  const [publicado, setPublicado] = useState(relatorio.publicado);
  const [publicadoSalvo, setPublicadoSalvo] = useState(relatorio.publicado);

  const [estado, salvar, salvando] = useActionState(async (anterior: FormState, dados: FormData) => {
    const r = await salvarRelatorio(anterior, dados);
    if (r.status === "ok") setPublicadoSalvo(dados.get("publicado") === "on");
    return r;
  }, ESTADO_INICIAL);
  const e = estado.erros ?? {};

  useEffect(() => {
    if (estado.status === "erro") formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [estado]);

  const mudar = (campo: keyof typeof campos) => (ev: { target: { value: string } }) =>
    setCampos((c) => ({ ...c, [campo]: ev.target.value }));

  return (
    <>
      {/* Fora do <form> de edição: o diálogo de exclusão tem o próprio <form>. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "pill",
            publicadoSalvo ? "bg-primary/15 text-ink-accent" : "bg-secondary text-muted-foreground",
          )}
        >
          {publicadoSalvo ? "Publicado" : "Rascunho"}
        </span>
        <div className="ml-auto">
          <ConfirmarExclusao
            id={relatorio.id}
            titulo="Excluir este relatório?"
            descricao="O relatório e o PDF são apagados e somem da contagem dos autores. Não dá para desfazer. Para só tirar do ar, desmarque “Publicado no site” e salve."
            acao={excluirRelatorio}
          />
        </div>
      </div>

      <PdfRelatorio reportId={relatorio.id} pdfPath={relatorio.pdfPath} />

      <form
        ref={formRef}
        noValidate
        className="mt-10 grid gap-8"
        onSubmit={(ev) => {
          // Envio manual: com a prop action o React 19 reinicia o formulário
          // depois de salvar, e selects/checkboxes voltariam ao valor inicial.
          ev.preventDefault();
          const dados = new FormData(ev.currentTarget);
          startTransition(() => salvar(dados));
        }}
      >
        <input type="hidden" name="id" value={relatorio.id} />
        <input type="hidden" name="autores" value={JSON.stringify(autores)} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="titulo" label="Título" erro={e.titulo} className="sm:col-span-2">
            <Input
              {...ariaCampo("titulo", e.titulo)}
              value={campos.titulo}
              onChange={mudar("titulo")}
              maxLength={160}
              className={inputClasse}
            />
          </Field>
          <Field id="tipo" label="Tipo" erro={e.tipo}>
            <select
              {...ariaCampo("tipo", e.tipo)}
              value={campos.tipo}
              onChange={mudar("tipo")}
              className={selectClasse}
            >
              {Object.entries(TIPO_RELATORIO_LABEL).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Field>
          <Field id="nucleo_id" label="Núcleo" opcional erro={e.nucleo_id}>
            <select
              {...ariaCampo("nucleo_id", e.nucleo_id)}
              value={campos.nucleo_id}
              onChange={mudar("nucleo_id")}
              className={selectClasse}
            >
              <option value="">Sem núcleo</option>
              {nucleos.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field id="setor" label="Setor" opcional erro={e.setor}>
            <Input
              {...ariaCampo("setor", e.setor)}
              value={campos.setor}
              onChange={mudar("setor")}
              maxLength={60}
              className={inputClasse}
            />
          </Field>
          <Field id="ticker" label="Ticker" opcional erro={e.ticker} dica="Ex.: PETR4">
            <Input
              {...ariaCampo("ticker", e.ticker, "dica")}
              value={campos.ticker}
              onChange={(ev) => setCampos((c) => ({ ...c, ticker: ev.target.value.toUpperCase() }))}
              maxLength={6}
              className={cn(inputClasse, "uppercase")}
            />
          </Field>
          <Field id="resumo" label="Resumo" opcional erro={e.resumo} className="sm:col-span-2">
            <Textarea
              {...ariaCampo("resumo", e.resumo)}
              value={campos.resumo}
              onChange={mudar("resumo")}
              rows={4}
              maxLength={1000}
              className={cn(inputClasse, "h-auto py-3")}
            />
          </Field>
        </div>

        <Autores membros={membros} valor={autores} onChange={setAutores} erro={e.autores} />

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-[0.9375rem]">
            <input
              type="checkbox"
              name="publicado"
              checked={publicado}
              onChange={(ev) => setPublicado(ev.target.checked)}
              className="size-4 accent-primary"
            />
            Publicado no site
          </label>
          <button
            type="submit"
            disabled={salvando}
            className="pill bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum disabled:opacity-60 dark:hover:bg-lilac dark:hover:text-galaxy"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
        </div>
      </form>
    </>
  );
}

/** Autores em ordem, escolhidos entre membros ativos e alumni. */
function Autores({
  membros,
  valor,
  onChange,
  erro,
}: {
  membros: Opcao[];
  valor: string[];
  onChange: (v: string[]) => void;
  erro?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const porId = new Map(membros.map((m) => [m.id, m]));
  const mover = (i: number, d: -1 | 1) => {
    const novo = [...valor];
    [novo[i], novo[i + d]] = [novo[i + d], novo[i]];
    onChange(novo);
  };

  return (
    <div className="grid gap-2">
      <p id="autores-rotulo" className="text-sm text-foreground">
        Autores
      </p>
      {valor.length > 0 ? (
        <ol aria-labelledby="autores-rotulo" className="grid gap-1.5">
          {valor.map((id, i) => (
            <li key={id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-1.5">
              <span className="w-5 text-sm text-muted-foreground tabular-nums">{i + 1}.</span>
              <span className="flex-1 truncate text-[0.9375rem]">{porId.get(id)?.nome ?? "Membro removido"}</span>
              <button
                type="button"
                onClick={() => mover(i, -1)}
                disabled={i === 0}
                aria-label={`Subir ${porId.get(id)?.nome}`}
                className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-secondary disabled:opacity-30"
              >
                <ArrowUp className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => mover(i, 1)}
                disabled={i === valor.length - 1}
                aria-label={`Descer ${porId.get(id)?.nome}`}
                className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-secondary disabled:opacity-30"
              >
                <ArrowDown className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onChange(valor.filter((x) => x !== id))}
                aria-label={`Remover ${porId.get(id)?.nome}`}
                className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-secondary"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      ) : null}
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={aberto}
            aria-controls="lista-autores"
            aria-label="Adicionar autor"
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "autores-erro" : undefined}
            className={cn(
              selectClasse,
              "flex items-center justify-between gap-2 text-left text-muted-foreground sm:max-w-sm",
            )}
          >
            Adicionar autor…
            <ChevronsUpDown className="size-4 shrink-0 opacity-60" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput placeholder="Buscar por nome…" />
            <CommandList id="lista-autores">
              <CommandEmpty>Ninguém com esse nome.</CommandEmpty>
              <CommandGroup>
                {membros.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`${m.nome} ${m.id}`}
                    onSelect={() => {
                      if (!valor.includes(m.id) && valor.length < 20) onChange([...valor, m.id]);
                      setAberto(false);
                    }}
                  >
                    <Check className={cn("size-4", valor.includes(m.id) ? "opacity-100" : "opacity-0")} aria-hidden />
                    <span className="flex-1 truncate">{m.nome}</span>
                    {m.detalhe ? <span className="text-xs text-muted-foreground">{m.detalhe}</span> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {erro ? (
        <p id="autores-erro" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

/**
 * O PDF vai do navegador direto ao Storage (até 20 MB, acima do limite das
 * Server Actions). Depois, anexarPdfRelatorio confere o arquivo no servidor.
 */
function PdfRelatorio({ reportId, pdfPath }: { reportId: string; pdfPath: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<"parado" | "enviando" | "conferindo">("parado");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  async function enviar(arquivo: File) {
    setAviso(null);
    if (arquivo.size > PDF_MAX) return setAviso({ ok: false, texto: "O PDF pode ter no máximo 20 MB." });
    if (!ehPdf(await primeirosBytes(arquivo))) return setAviso({ ok: false, texto: "Este arquivo não é um PDF." });

    setEtapa("enviando");
    const path = `${reportId}/${crypto.randomUUID()}.pdf`;
    const { error } = await createClient()
      .storage.from("relatorios")
      .upload(path, arquivo, { contentType: "application/pdf", upsert: false });
    if (error) {
      setEtapa("parado");
      return setAviso({ ok: false, texto: "Não foi possível enviar o PDF. Tente de novo." });
    }
    setEtapa("conferindo");
    const r = await anexarPdfRelatorio(reportId, path);
    setEtapa("parado");
    setAviso({ ok: r.ok, texto: r.mensagem });
    if (r.ok) router.refresh();
  }

  const url = publicUrl("relatorios", pdfPath);
  return (
    <section aria-labelledby="pdf-titulo" className="mt-8 rounded-2xl border border-border p-5">
      <h2 id="pdf-titulo" className="font-sans text-base font-normal">
        PDF do relatório
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {url
          ? "Um PDF está anexado. Enviar outro substitui o atual."
          : "Nenhum PDF ainda. Ele é obrigatório para publicar."}{" "}
        Até 20 MB.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={etapa !== "parado"}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm hover:bg-secondary disabled:opacity-60"
        >
          <FileUp className="size-4" aria-hidden />
          {etapa === "enviando"
            ? "Enviando…"
            : etapa === "conferindo"
              ? "Conferindo…"
              : url
                ? "Trocar PDF"
                : "Enviar PDF"}
        </button>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-ink-accent hover:underline"
          >
            Abrir PDF atual <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            ev.target.value = "";
            if (f) void enviar(f);
          }}
        />
      </div>
      <p
        role="status"
        aria-live="polite"
        className={cn("mt-3 text-sm", aviso?.ok ? "text-ink-accent" : "text-destructive", !aviso && "sr-only")}
      >
        {aviso?.texto}
      </p>
    </section>
  );
}
