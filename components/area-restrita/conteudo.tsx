"use client";

import { ArrowDown, ArrowUp, ImagePlus, X } from "lucide-react";
import NextImage from "next/image";
import { startTransition, useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { ConfirmarAcao } from "@/components/area-restrita/campos";
import { botaoPrimario, botaoSecundario } from "@/components/area-restrita/estilos";
import { AvisoFormulario, Field, ariaCampo, inputClasse } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  excluirItem,
  moverItem,
  salvarCalendario,
  salvarDiretoria,
  salvarEtapa,
  salvarNucleo,
  salvarParceiro,
  salvarSecaoHistoria,
} from "@/lib/actions/conteudo";
import { ESTADO_INICIAL, type FormState } from "@/lib/actions/form-state";
import { imagemReduzida } from "@/lib/imagem-navegador";
import type {
  Calendario,
  DiretoriaAdmin,
  EtapaPS,
  NucleoAdmin,
  Opcao,
  ParceiroAdmin,
  SecaoHistoriaAdmin,
} from "@/lib/restrito";
import { publicUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Tabela = "nucleos" | "diretorias" | "partners" | "history_sections" | "ps_steps" | "calendars";
type Acao = (anterior: FormState, dados: FormData) => Promise<FormState>;
type ImagemNova = { blob: Blob; url: string };

const textareaClasse = cn(inputClasse, "h-auto py-3");
const ERRO_LEITURA = "Não foi possível ler esta imagem. Use JPG, PNG ou WebP.";

// =============================================================================
// Estrutura da lista: ordem, edição, exclusão
// =============================================================================
function BotaoOrdem({ direcao, rotulo, desativado }: { direcao: "cima" | "baixo"; rotulo: string; desativado: boolean }) {
  const { pending } = useFormStatus();
  const Icone = direcao === "cima" ? ArrowUp : ArrowDown;
  return (
    <button
      type="submit"
      name="direcao"
      value={direcao}
      disabled={desativado || pending}
      aria-label={rotulo}
      className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
    >
      <Icone className="size-4" aria-hidden />
    </button>
  );
}

/**
 * Um item de conteúdo: título, botões de ordem e "Editar" (o formulário vem
 * como filho). A exclusão fica fora do formulário de edição, num diálogo próprio.
 */
export function ItemConteudo({
  tabela,
  id,
  titulo,
  subtitulo,
  primeiro,
  ultimo,
  excluir,
  children,
}: {
  tabela: Tabela;
  id: string;
  titulo: string;
  subtitulo?: React.ReactNode;
  primeiro: boolean;
  ultimo: boolean;
  excluir: { descricao: string; digitar?: string };
  children: React.ReactNode;
}) {
  return (
    <li className="py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg">{titulo}</p>
          {subtitulo ? <div className="mt-0.5 text-sm text-muted-foreground">{subtitulo}</div> : null}
        </div>
        <form action={moverItem} className="flex shrink-0">
          <input type="hidden" name="tabela" value={tabela} />
          <input type="hidden" name="id" value={id} />
          <BotaoOrdem direcao="cima" rotulo={`Mover ${titulo} para cima`} desativado={primeiro} />
          <BotaoOrdem direcao="baixo" rotulo={`Mover ${titulo} para baixo`} desativado={ultimo} />
        </form>
      </div>
      <details className="mt-3 rounded-xl border border-border open:bg-secondary/20">
        <summary className="flex min-h-10 cursor-pointer list-none items-center px-4 text-sm text-muted-foreground hover:text-foreground">
          Editar <span className="sr-only">{titulo}</span>
        </summary>
        <div className="grid gap-5 border-t border-border p-4">
          {children}
          <div className="flex justify-end border-t border-border pt-4">
            <ConfirmarAcao
              gatilho="Excluir"
              gatilhoClasse="inline-flex min-h-10 items-center rounded-full px-4 text-sm text-destructive hover:bg-destructive/10"
              titulo={`Excluir ${titulo}?`}
              descricao={excluir.descricao}
              confirmar="Excluir"
              pendente="Excluindo…"
              digitar={excluir.digitar}
              campos={{ tabela, id }}
              acao={excluirItem}
            />
          </div>
        </div>
      </details>
    </li>
  );
}

/** "Adicionar …": formulário de criação recolhido, para a lista ficar em primeiro plano. */
export function Adicionar({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <details className="rounded-xl border border-border open:bg-secondary/20">
      <summary className={cn(botaoSecundario, "m-3 w-fit cursor-pointer list-none")}>{rotulo}</summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  );
}

/**
 * Envia com startTransition (o React não reseta o formulário) e, num formulário
 * de criação que deu certo, limpa os campos para o próximo cadastro.
 */
function useFormConteudo(acao: Acao, novo: boolean, montar: (dados: FormData) => void, aoSalvar: () => void) {
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, executar, pendente] = useActionState(async (anterior: FormState, dados: FormData) => {
    const r = await acao(anterior, dados);
    if (r.status === "ok") {
      if (novo) formRef.current?.reset();
      aoSalvar();
    }
    return r;
  }, ESTADO_INICIAL);
  const onSubmit = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const dados = new FormData(ev.currentTarget);
    montar(dados);
    startTransition(() => executar(dados));
  };
  return { formRef, estado, pendente, onSubmit, e: estado.erros ?? {} };
}

function Rodape({ pendente, novo, estado, rotuloNovo }: { pendente: boolean; novo: boolean; estado: FormState; rotuloNovo: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <button type="submit" disabled={pendente} className={botaoPrimario}>
        {pendente ? "Salvando…" : novo ? rotuloNovo : "Salvar alterações"}
      </button>
      <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
    </div>
  );
}

// =============================================================================
// Imagens
// =============================================================================
/** Uma imagem (banner, logo): prévia, trocar e remover. Reduzida no navegador antes de enviar. */
function useImagemUnica(maxLado: number) {
  const [nova, setNova] = useState<ImagemNova | null>(null);
  const [removida, setRemovida] = useState(false);
  const [erro, setErro] = useState<string>();
  const limpar = () => {
    setNova((n) => {
      if (n) URL.revokeObjectURL(n.url);
      return null;
    });
    setRemovida(false);
  };
  return {
    nova,
    removida,
    erro,
    limpar,
    async escolher(arquivo: File) {
      setErro(undefined);
      try {
        const blob = await imagemReduzida(arquivo, maxLado);
        setNova((n) => {
          if (n) URL.revokeObjectURL(n.url);
          return { blob, url: URL.createObjectURL(blob) };
        });
        setRemovida(false);
      } catch {
        setErro(ERRO_LEITURA);
      }
    },
    remover() {
      limpar();
      setRemovida(true);
    },
    anexar(dados: FormData) {
      if (nova) dados.set("imagem", nova.blob, "imagem.webp");
      if (removida) dados.set("remover_imagem", "1");
    },
  };
}

function CampoImagem({
  id,
  rotulo,
  dica,
  atualUrl,
  imagem,
  erro,
  formato,
}: {
  id: string;
  rotulo: string;
  dica: string;
  atualUrl: string | null;
  imagem: ReturnType<typeof useImagemUnica>;
  erro?: string;
  formato: "banner" | "logo";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const src = imagem.nova?.url ?? (imagem.removida ? null : atualUrl);
  const mensagem = imagem.erro ?? erro;

  return (
    <div className="grid gap-2">
      <p id={`${id}-rotulo`} className="text-sm text-foreground">
        {rotulo} <span className="text-muted-foreground">(opcional)</span>
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {src ? (
          <NextImage
            src={src}
            alt={`${rotulo} atual`}
            width={formato === "banner" ? 320 : 160}
            height={formato === "banner" ? 120 : 64}
            unoptimized={Boolean(imagem.nova)}
            className={cn(
              "rounded-xl border border-border",
              formato === "banner" ? "h-28 w-72 object-cover" : "h-16 w-40 bg-white object-contain p-2",
            )}
          />
        ) : (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground",
              formato === "banner" ? "h-28 w-72" : "h-16 w-40",
            )}
          >
            {formato === "banner" ? "Imagem padrão do site" : "Só o nome"}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={lendo}
            aria-describedby={`${id}-rotulo`}
            className={cn(botaoSecundario, "gap-2")}
          >
            <ImagePlus className="size-4" aria-hidden />
            {lendo ? "Preparando…" : src ? "Trocar" : "Escolher"}
          </button>
          {src ? (
            <button
              type="button"
              onClick={imagem.remover}
              aria-describedby={`${id}-rotulo`}
              className={cn(botaoSecundario, "text-destructive")}
            >
              Remover
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={async (ev) => {
          const arquivo = ev.target.files?.[0];
          ev.target.value = "";
          if (!arquivo) return;
          setLendo(true);
          await imagem.escolher(arquivo);
          setLendo(false);
        }}
      />
      <p className="text-xs text-muted-foreground">{dica}</p>
      {mensagem ? (
        <p role="alert" className="text-sm text-destructive">
          {mensagem}
        </p>
      ) : null}
    </div>
  );
}

// =============================================================================
// Núcleos
// =============================================================================
export function FormNucleo({ nucleo }: { nucleo?: NucleoAdmin }) {
  const novo = !nucleo;
  const p = `nucleo-${nucleo?.id ?? "novo"}`;
  const imagem = useImagemUnica(1920);
  const { formRef, estado, pendente, onSubmit, e } = useFormConteudo(salvarNucleo, novo, imagem.anexar, imagem.limpar);
  const v = (c: string, padrao = "") => (estado.status === "erro" ? (estado.valores?.[c] ?? padrao) : padrao);

  return (
    <form ref={formRef} noValidate className="grid gap-5" onSubmit={onSubmit}>
      <input type="hidden" name="id" value={nucleo?.id ?? ""} />
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <Field id={`${p}-nome`} label="Nome" erro={e.nome}>
          <Input {...ariaCampo(`${p}-nome`, e.nome)} name="nome" maxLength={60} defaultValue={v("nome", nucleo?.nome)} className={inputClasse} />
        </Field>
        <Field id={`${p}-area`} label="Área" opcional erro={e.area} dica="Ex.: Equity Research.">
          <Input
            {...ariaCampo(`${p}-area`, e.area, "dica")}
            name="area"
            maxLength={80}
            defaultValue={v("area", nucleo?.area)}
            className={inputClasse}
          />
        </Field>
      </div>
      <Field id={`${p}-descricao`} label="Descrição" opcional erro={e.descricao} dica="Aparece na página Núcleos e no carrossel do início.">
        <Textarea
          {...ariaCampo(`${p}-descricao`, e.descricao, "dica")}
          name="descricao"
          rows={5}
          maxLength={2000}
          defaultValue={v("descricao", nucleo?.descricao)}
          className={textareaClasse}
        />
      </Field>
      <CampoImagem
        id={`${p}-banner`}
        rotulo="Banner"
        dica="Imagem larga, no topo da seção do núcleo. Reduzida para até 1920 px antes de enviar."
        atualUrl={publicUrl("site", nucleo?.bannerPath)}
        imagem={imagem}
        erro={e.imagem}
        formato="banner"
      />
      <Rodape pendente={pendente} novo={novo} estado={estado} rotuloNovo="Criar núcleo" />
    </form>
  );
}

// =============================================================================
// Diretorias
// =============================================================================
export function FormDiretoria({ diretoria }: { diretoria?: DiretoriaAdmin }) {
  const novo = !diretoria;
  const p = `diretoria-${diretoria?.id ?? "nova"}`;
  const { formRef, estado, pendente, onSubmit, e } = useFormConteudo(salvarDiretoria, novo, () => {}, () => {});
  return (
    <form ref={formRef} noValidate className="grid gap-5 sm:max-w-md" onSubmit={onSubmit}>
      <input type="hidden" name="id" value={diretoria?.id ?? ""} />
      <Field id={`${p}-nome`} label="Nome" erro={e.nome}>
        <Input
          {...ariaCampo(`${p}-nome`, e.nome)}
          name="nome"
          maxLength={80}
          defaultValue={estado.status === "erro" ? estado.valores?.nome : diretoria?.nome}
          className={inputClasse}
        />
      </Field>
      <Rodape pendente={pendente} novo={novo} estado={estado} rotuloNovo="Criar diretoria" />
    </form>
  );
}

// =============================================================================
// Parceiros
// =============================================================================
export function FormParceiro({ parceiro, nucleos }: { parceiro?: ParceiroAdmin; nucleos: Opcao[] }) {
  const novo = !parceiro;
  const p = `parceiro-${parceiro?.id ?? "novo"}`;
  const imagem = useImagemUnica(600);
  const { formRef, estado, pendente, onSubmit, e } = useFormConteudo(salvarParceiro, novo, imagem.anexar, imagem.limpar);
  const v = (c: string, padrao = "") => (estado.status === "erro" ? (estado.valores?.[c] ?? padrao) : padrao);
  const opcao =
    "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-[0.9375rem] has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-2 has-focus-visible:ring-ring";

  return (
    <form ref={formRef} noValidate className="grid gap-5" onSubmit={onSubmit}>
      <input type="hidden" name="id" value={parceiro?.id ?? ""} />
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <Field id={`${p}-nome`} label="Nome" erro={e.nome}>
          <Input {...ariaCampo(`${p}-nome`, e.nome)} name="nome" maxLength={80} defaultValue={v("nome", parceiro?.nome)} className={inputClasse} />
        </Field>
        <Field id={`${p}-url`} label="Site" opcional erro={e.url}>
          <Input
            {...ariaCampo(`${p}-url`, e.url)}
            name="url"
            type="url"
            inputMode="url"
            placeholder="https://"
            defaultValue={v("url", parceiro?.url)}
            className={inputClasse}
          />
        </Field>
      </div>
      <fieldset className="grid gap-2" aria-describedby={e.nucleos ? `${p}-nucleos-erro` : undefined}>
        <legend className="mb-1.5 text-sm text-foreground">Aparece em</legend>
        <div className="flex flex-wrap gap-2">
          <label className={opcao}>
            <input type="checkbox" name="institucional" defaultChecked={parceiro?.institucional ?? false} className="size-4 accent-primary" />
            Rodapé (parceiro institucional)
          </label>
          {nucleos.map((n) => (
            <label key={n.id} className={opcao}>
              <input
                type="checkbox"
                name="nucleo"
                value={n.id}
                defaultChecked={parceiro?.nucleos.includes(n.id) ?? false}
                className="size-4 accent-primary"
              />
              Núcleo {n.nome}
            </label>
          ))}
        </div>
        {e.nucleos ? (
          <p id={`${p}-nucleos-erro`} className="text-sm text-destructive">
            {e.nucleos}
          </p>
        ) : null}
      </fieldset>
      <CampoImagem
        id={`${p}-logo`}
        rotulo="Logo"
        dica="PNG com fundo transparente fica melhor. Sem logo, o site mostra o nome."
        atualUrl={publicUrl("site", parceiro?.logoPath)}
        imagem={imagem}
        erro={e.imagem}
        formato="logo"
      />
      <Rodape pendente={pendente} novo={novo} estado={estado} rotuloNovo="Cadastrar parceiro" />
    </form>
  );
}

// =============================================================================
// Nossa História
// =============================================================================
function CampoFotos({
  id,
  mantidas,
  setMantidas,
  novas,
  setNovas,
  erro,
}: {
  id: string;
  mantidas: string[];
  setMantidas: (f: (atual: string[]) => string[]) => void;
  novas: ImagemNova[];
  setNovas: (f: (atual: ImagemNova[]) => ImagemNova[]) => void;
  erro?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [aviso, setAviso] = useState<string>();
  const total = mantidas.length + novas.length;
  const miniatura = "h-24 w-32 rounded-xl border border-border object-cover";
  const remover =
    "absolute -top-2 -right-2 inline-flex size-8 items-center justify-center rounded-full border border-border bg-background shadow hover:bg-secondary";

  return (
    <div className="grid gap-2">
      <p id={`${id}-rotulo`} className="text-sm text-foreground">
        Fotos <span className="text-muted-foreground">(opcional, até 12)</span>
      </p>
      <ul aria-labelledby={`${id}-rotulo`} className="flex flex-wrap gap-3">
        {mantidas.map((path, i) => (
          <li key={path} className="relative">
            <NextImage src={publicUrl("fotos", path) ?? ""} alt={`Foto ${i + 1}`} width={128} height={96} className={miniatura} />
            <button
              type="button"
              onClick={() => setMantidas((a) => a.filter((x) => x !== path))}
              aria-label={`Remover foto ${i + 1}`}
              className={remover}
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {novas.map((n, i) => (
          <li key={n.url} className="relative">
            <NextImage src={n.url} alt={`Foto nova ${i + 1} (ainda não salva)`} width={128} height={96} unoptimized className={miniatura} />
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(n.url);
                setNovas((a) => a.filter((x) => x.url !== n.url));
              }}
              aria-label={`Remover foto nova ${i + 1}`}
              className={remover}
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {total < 12 ? (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={lendo}
              className="inline-flex h-24 w-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground disabled:opacity-60"
            >
              <ImagePlus className="size-5" aria-hidden />
              {lendo ? "Preparando…" : "Adicionar"}
            </button>
          </li>
        ) : null}
      </ul>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={async (ev) => {
          const arquivos = Array.from(ev.target.files ?? []).slice(0, 12 - total);
          ev.target.value = "";
          if (arquivos.length === 0) return;
          setLendo(true);
          setAviso(undefined);
          const prontas: ImagemNova[] = [];
          for (const arquivo of arquivos) {
            try {
              const blob = await imagemReduzida(arquivo, 1600);
              prontas.push({ blob, url: URL.createObjectURL(blob) });
            } catch {
              setAviso(`${arquivo.name}: ${ERRO_LEITURA}`);
            }
          }
          setNovas((a) => [...a, ...prontas]);
          setLendo(false);
        }}
      />
      <p className="text-xs text-muted-foreground">Reduzidas para até 1600 px antes de enviar. Até 8 fotos novas por vez.</p>
      {aviso || erro ? (
        <p role="alert" className="text-sm text-destructive">
          {aviso ?? erro}
        </p>
      ) : null}
    </div>
  );
}

export function FormSecaoHistoria({ secao }: { secao?: SecaoHistoriaAdmin }) {
  const novo = !secao;
  const p = `secao-${secao?.id ?? "nova"}`;
  const [mantidas, setMantidas] = useState<string[]>(secao?.fotos ?? []);
  const [novas, setNovas] = useState<ImagemNova[]>([]);
  const { formRef, estado, pendente, onSubmit, e } = useFormConteudo(
    salvarSecaoHistoria,
    novo,
    (dados) => {
      dados.set("fotos_mantidas", JSON.stringify(mantidas));
      for (const n of novas) dados.append("novas_fotos", n.blob, "foto.webp");
    },
    () => {
      for (const n of novas) URL.revokeObjectURL(n.url);
      setNovas([]);
      if (novo) setMantidas([]);
    },
  );
  const v = (c: string, padrao = "") => (estado.status === "erro" ? (estado.valores?.[c] ?? padrao) : padrao);

  // Depois de salvar, as fotos novas viram "mantidas" com o caminho do servidor (a página recarrega os dados).
  const [fotosServidor, setFotosServidor] = useState(secao?.fotos);
  if (secao && secao.fotos !== fotosServidor) {
    setFotosServidor(secao.fotos);
    setMantidas(secao.fotos);
  }

  return (
    <form ref={formRef} noValidate className="grid gap-5" onSubmit={onSubmit}>
      <input type="hidden" name="id" value={secao?.id ?? ""} />
      <div className="grid items-start gap-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <Field id={`${p}-periodo`} label="Período" erro={e.periodo} dica="Ex.: 2019 – 2021.">
          <Input
            {...ariaCampo(`${p}-periodo`, e.periodo, "dica")}
            name="periodo"
            maxLength={40}
            defaultValue={v("periodo", secao?.periodo)}
            className={inputClasse}
          />
        </Field>
        <Field id={`${p}-titulo`} label="Título" erro={e.titulo}>
          <Input {...ariaCampo(`${p}-titulo`, e.titulo)} name="titulo" maxLength={160} defaultValue={v("titulo", secao?.titulo)} className={inputClasse} />
        </Field>
      </div>
      <Field id={`${p}-texto`} label="Texto" opcional erro={e.texto}>
        <Textarea {...ariaCampo(`${p}-texto`, e.texto)} name="texto" rows={6} maxLength={5000} defaultValue={v("texto", secao?.texto)} className={textareaClasse} />
      </Field>
      <Field id={`${p}-conquistas`} label="Conquistas" opcional erro={e.conquistas} dica="Uma por linha, até 12. Aparecem como etiquetas.">
        <Textarea
          {...ariaCampo(`${p}-conquistas`, e.conquistas, "dica")}
          name="conquistas"
          rows={4}
          defaultValue={v("conquistas", secao?.conquistas.join("\n"))}
          className={textareaClasse}
        />
      </Field>
      <CampoFotos id={`${p}-fotos`} mantidas={mantidas} setMantidas={setMantidas} novas={novas} setNovas={setNovas} erro={e.fotos} />
      <Rodape pendente={pendente} novo={novo} estado={estado} rotuloNovo="Criar seção" />
    </form>
  );
}

// =============================================================================
// Etapas do Processo Seletivo
// =============================================================================
export function FormEtapa({ etapa }: { etapa?: EtapaPS }) {
  const novo = !etapa;
  const p = `etapa-${etapa?.id ?? "nova"}`;
  const { formRef, estado, pendente, onSubmit, e } = useFormConteudo(salvarEtapa, novo, () => {}, () => {});
  const v = (c: string, padrao = "") => (estado.status === "erro" ? (estado.valores?.[c] ?? padrao) : padrao);
  return (
    <form ref={formRef} noValidate className="grid gap-5" onSubmit={onSubmit}>
      <input type="hidden" name="id" value={etapa?.id ?? ""} />
      <Field id={`${p}-titulo`} label="Título" erro={e.titulo}>
        <Input {...ariaCampo(`${p}-titulo`, e.titulo)} name="titulo" maxLength={120} defaultValue={v("titulo", etapa?.titulo)} className={inputClasse} />
      </Field>
      <Field id={`${p}-descricao`} label="Descrição" opcional erro={e.descricao}>
        <Textarea
          {...ariaCampo(`${p}-descricao`, e.descricao)}
          name="descricao"
          rows={3}
          maxLength={1000}
          defaultValue={v("descricao", etapa?.descricao)}
          className={textareaClasse}
        />
      </Field>
      <Rodape pendente={pendente} novo={novo} estado={estado} rotuloNovo="Criar etapa" />
    </form>
  );
}

// =============================================================================
// Calendários
// =============================================================================
export function FormCalendario({ calendario }: { calendario?: Calendario }) {
  const novo = !calendario;
  const p = `agenda-${calendario?.id ?? "nova"}`;
  const { formRef, estado, pendente, onSubmit, e } = useFormConteudo(salvarCalendario, novo, () => {}, () => {});
  const v = (c: string, padrao = "") => (estado.status === "erro" ? (estado.valores?.[c] ?? padrao) : padrao);
  return (
    <form ref={formRef} noValidate className="grid gap-5" onSubmit={onSubmit}>
      <input type="hidden" name="id" value={calendario?.id ?? ""} />
      <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Field id={`${p}-nome`} label="Nome" erro={e.nome}>
          <Input {...ariaCampo(`${p}-nome`, e.nome)} name="nome" maxLength={80} defaultValue={v("nome", calendario?.nome)} className={inputClasse} />
        </Field>
        <Field id={`${p}-cor`} label="Cor" erro={e.cor}>
          <input
            {...ariaCampo(`${p}-cor`, e.cor)}
            name="cor"
            type="color"
            defaultValue={(v("cor", calendario?.cor) || "#8C14B9").toLowerCase()}
            className="h-11 w-full cursor-pointer rounded-[0.9rem_0.9rem_0.3rem_0.9rem] border border-input bg-background p-1"
          />
        </Field>
      </div>
      <Field
        id={`${p}-google`}
        label="ID da agenda no Google"
        erro={e.google_id}
        dica="No Google Agenda: Configurações da agenda → Integrar agenda → ID da agenda (ou cole o link de incorporação). A agenda precisa ser pública."
      >
        <Input
          {...ariaCampo(`${p}-google`, e.google_id, "dica")}
          name="google_id"
          spellCheck={false}
          autoComplete="off"
          defaultValue={v("google_id", calendario?.googleId)}
          className={inputClasse}
        />
      </Field>
      <Rodape pendente={pendente} novo={novo} estado={estado} rotuloNovo="Salvar agenda" />
    </form>
  );
}
