"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { EditorTexto } from "@/components/area-restrita/editor-texto";
import { ConfirmarExclusao } from "@/components/area-restrita/excluir";
import { ImagensPost } from "@/components/area-restrita/imagens-post";
import { AvisoFormulario, Field, ariaCampo, inputClasse } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ESTADO_INICIAL, type FormState } from "@/lib/actions/form-state";
import { excluirPost, salvarPost } from "@/lib/actions/publicacoes";
import { paraInputDataHora } from "@/lib/data-hora";
import { CATEGORIA_LABEL } from "@/lib/labels";
import type { PostEditor } from "@/lib/restrito";
import { cn } from "@/lib/utils";

const selectClasse = cn(inputClasse, "w-full border border-input");

export function FormPost({ post }: { post: PostEditor }) {
  const formRef = useRef<HTMLFormElement>(null);

  const [campos, setCampos] = useState({
    titulo: post.titulo,
    resumo: post.resumo,
    categoria: post.categoria,
    data_evento: paraInputDataHora(post.dataEvento),
    local: post.local,
  });
  // Post novo tem corpo {} (padrão do banco): começa como documento vazio.
  const [corpo, setCorpo] = useState<unknown>(
    post.corpo && typeof post.corpo === "object" && (post.corpo as { type?: string }).type === "doc"
      ? post.corpo
      : { type: "doc" },
  );
  const [capa, setCapa] = useState<string[]>(post.capaPath ? [post.capaPath] : []);
  const [galeria, setGaleria] = useState<string[]>(post.galeria);
  const [publicado, setPublicado] = useState(post.publicado);
  const [publicadoSalvo, setPublicadoSalvo] = useState(post.publicado);

  const [estado, salvar, salvando] = useActionState(async (anterior: FormState, dados: FormData) => {
    const r = await salvarPost(anterior, dados);
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
        {publicadoSalvo ? (
          <Link
            href={`/publicacoes/${post.slug}`}
            target="_blank"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Ver no site <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only"> (abre em nova aba)</span>
          </Link>
        ) : null}
        <div className="ml-auto">
          <ConfirmarExclusao
            id={post.id}
            titulo="Excluir este post?"
            descricao="O post sai do site e as imagens dele são apagadas. Não dá para desfazer. Para só tirar do ar, desmarque “Publicado no site” e salve."
            acao={excluirPost}
          />
        </div>
      </div>
      <form
        ref={formRef}
        noValidate
        className="mt-8 grid gap-8"
        onSubmit={(ev) => {
          // Envio manual: com a prop action o React 19 reinicia o formulário
          // depois de salvar, e selects/checkboxes voltariam ao valor inicial.
          ev.preventDefault();
          const dados = new FormData(ev.currentTarget);
          startTransition(() => salvar(dados));
        }}
      >
        <input type="hidden" name="id" value={post.id} />
        <input type="hidden" name="corpo" value={JSON.stringify(corpo ?? { type: "doc" })} />
        <input type="hidden" name="capa" value={capa[0] ?? ""} />
        <input type="hidden" name="galeria" value={JSON.stringify(galeria)} />

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
          <Field id="categoria" label="Categoria" erro={e.categoria}>
            <select
              {...ariaCampo("categoria", e.categoria)}
              value={campos.categoria}
              onChange={mudar("categoria")}
              className={selectClasse}
            >
              {Object.entries(CATEGORIA_LABEL).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="data_evento"
            label="Data e hora do evento"
            opcional
            erro={e.data_evento}
            dica="Horário de Brasília. Define se aparece em Próximos ou Anteriores."
          >
            <Input
              {...ariaCampo("data_evento", e.data_evento, "dica")}
              type="datetime-local"
              value={campos.data_evento}
              onChange={mudar("data_evento")}
              className={inputClasse}
            />
          </Field>
          <Field id="local" label="Local" opcional erro={e.local} className="sm:col-span-2">
            <Input
              {...ariaCampo("local", e.local)}
              value={campos.local}
              onChange={mudar("local")}
              maxLength={160}
              className={inputClasse}
            />
          </Field>
          <Field
            id="resumo"
            label="Resumo"
            opcional
            erro={e.resumo}
            dica="Aparece nos cartões das listas. Até 500 caracteres."
            className="sm:col-span-2"
          >
            <Textarea
              {...ariaCampo("resumo", e.resumo, "dica")}
              value={campos.resumo}
              onChange={mudar("resumo")}
              rows={3}
              maxLength={500}
              className={cn(inputClasse, "h-auto py-3")}
            />
          </Field>
        </div>

        <ImagensPost postId={post.id} rotulo="Capa" valor={capa} onChange={setCapa} erro={e.capa} />

        <div className="grid gap-2">
          <p className="text-sm text-foreground">Texto</p>
          <EditorTexto postId={post.id} inicial={post.corpo} onChange={setCorpo} erro={e.corpo} />
          {e.corpo ? (
            <p id="corpo-erro" className="text-sm text-destructive">
              {e.corpo}
            </p>
          ) : null}
        </div>

        <ImagensPost
          postId={post.id}
          rotulo="Galeria de fotos"
          multiplas
          valor={galeria}
          onChange={setGaleria}
          erro={e.galeria}
        />

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
