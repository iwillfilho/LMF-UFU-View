"use client";

import { FileText, FileUp } from "lucide-react";
import { startTransition, useActionState, useRef, useState } from "react";

import { ConfirmarAcao } from "@/components/area-restrita/campos";
import { botaoPrimario, botaoSecundario } from "@/components/area-restrita/estilos";
import { AvisoFormulario, Field, ariaCampo, inputClasse } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { anexarEdital, removerEdital, salvarPs } from "@/lib/actions/conteudo";
import { ESTADO_INICIAL } from "@/lib/actions/form-state";
import { ehPdf, PDF_MAX, primeirosBytes } from "@/lib/arquivos";
import type { PsAdmin } from "@/lib/restrito";
import { publicUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Abre/fecha o PS e guarda o link do Google Forms. */
function FormAbertura({ ps }: { ps: PsAdmin }) {
  const [aberto, setAberto] = useState(ps.aberto);
  const [estado, salvar, salvando] = useActionState(salvarPs, ESTADO_INICIAL);
  const e = estado.erros ?? {};

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        const dados = new FormData(ev.currentTarget);
        startTransition(() => salvar(dados));
      }}
    >
      <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-border p-4 has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-2 has-focus-visible:ring-ring">
        <input
          type="checkbox"
          role="switch"
          name="aberto"
          checked={aberto}
          onChange={(ev) => setAberto(ev.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-7 w-12 shrink-0 rounded-full bg-muted-foreground/50 transition-colors peer-checked:bg-primary after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5 motion-reduce:after:transition-none"
        />
        <span className="grid gap-0.5">
          <span className="text-lg">{aberto ? "Inscrições abertas" : "Inscrições fechadas"}</span>
          <span className="text-sm text-muted-foreground">
            {aberto
              ? "O botão Processo Seletivo aparece no topo do site e leva ao formulário."
              : "O botão Processo Seletivo não aparece no site."}
          </span>
        </span>
      </label>
      <Field
        id="ps-forms"
        label="Link do formulário de inscrição (Google Forms)"
        opcional={!aberto}
        erro={e.forms_url}
        dica="Use o link público (https://docs.google.com/forms/…/viewform) para o formulário aparecer embutido na página do PS; links forms.gle abrem só pelo botão."
      >
        <Input
          {...ariaCampo("ps-forms", e.forms_url, "dica")}
          name="forms_url"
          type="url"
          inputMode="url"
          defaultValue={estado.valores?.forms_url ?? ps.formsUrl}
          className={inputClasse}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
      </div>
    </form>
  );
}

/** Edital em PDF: enviado direto do navegador ao bucket público `site` (até 20 MB) e conferido no servidor. */
function Edital({ path }: { path: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; mensagem: string } | null>(null);
  const url = publicUrl("site", path);

  async function enviar(arquivo: File) {
    setAviso(null);
    if (arquivo.size > PDF_MAX) return setAviso({ ok: false, mensagem: "O PDF pode ter no máximo 20 MB." });
    if (!ehPdf(await primeirosBytes(arquivo))) return setAviso({ ok: false, mensagem: "Este arquivo não é um PDF." });
    setEnviando(true);
    const destino = `ps/${crypto.randomUUID()}.pdf`;
    const { error } = await createClient()
      .storage.from("site")
      .upload(destino, arquivo, { contentType: "application/pdf", upsert: false });
    if (error) {
      setEnviando(false);
      return setAviso({ ok: false, mensagem: "Não foi possível enviar o PDF. Tente de novo." });
    }
    const r = await anexarEdital(destino);
    setEnviando(false);
    setAviso(r);
  }

  return (
    <div className="grid gap-4">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 text-ink-accent underline-offset-4 hover:underline"
        >
          <FileText className="size-4" aria-hidden />
          Ver o edital publicado (PDF)
        </a>
      ) : (
        <p className="text-muted-foreground">Nenhum edital publicado.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className={cn(botaoSecundario, "gap-2")}
        >
          <FileUp className="size-4" aria-hidden />
          {enviando ? "Enviando…" : url ? "Trocar edital" : "Enviar edital"}
        </button>
        {url ? (
          <ConfirmarAcao
            gatilho="Remover edital"
            gatilhoClasse="inline-flex min-h-10 items-center rounded-full px-4 text-sm text-destructive hover:bg-destructive/10"
            titulo="Remover o edital?"
            descricao="O PDF sai do site. Dá para enviar outro depois."
            confirmar="Remover"
            campos={{}}
            acao={removerEdital}
          />
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(ev) => {
          const arquivo = ev.target.files?.[0];
          ev.target.value = "";
          if (arquivo) void enviar(arquivo);
        }}
      />
      <p className="text-xs text-muted-foreground">PDF de até 20 MB. Trocar o edital apaga o anterior.</p>
      <p role="status" aria-live="polite" className={cn("text-[0.9375rem]", aviso?.ok ? "text-ink-accent" : "text-destructive")}>
        {aviso?.mensagem}
      </p>
    </div>
  );
}

export function PainelPs({ ps }: { ps: PsAdmin }) {
  return (
    <div className="grid gap-12">
      <section aria-labelledby="ps-abertura" className="grid gap-5">
        <h2 id="ps-abertura" className="text-3xl">
          Inscrições
        </h2>
        <FormAbertura ps={ps} />
      </section>
      <section aria-labelledby="ps-edital" className="grid gap-5">
        <h2 id="ps-edital" className="text-3xl">
          Edital
        </h2>
        <Edital path={ps.editalPath} />
      </section>
    </div>
  );
}
