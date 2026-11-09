"use client";

import { ImagePlus, Plus, Trash2 } from "lucide-react";
import NextImage from "next/image";
import { startTransition, useActionState, useId, useLayoutEffect, useRef, useState } from "react";

import { ConfirmarAcao } from "@/components/area-restrita/campos";
import { botaoPrimario, botaoSecundario, selectClasse } from "@/components/area-restrita/estilos";
import { AvisoFormulario, Field, ariaCampo, inputClasse } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { ESTADO_INICIAL, type FormState } from "@/lib/actions/form-state";
import {
  anonimizarMembro,
  excluirMembro,
  moverParaAlumni,
  reativarMembro,
  salvarMembro,
} from "@/lib/actions/membros";
import { plural } from "@/lib/format";
import { fotoQuadrada } from "@/lib/imagem-navegador";
import { DESCRICAO_PAPEL, PAPEIS, ROTULO_PAPEL } from "@/lib/papeis";
import type { MembroAdmin, Opcao } from "@/lib/restrito";
import { FOTO_PADRAO, publicUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type LinhaCargo = { chave: string; id: string; gestao: string; cargo: string; diretoria: string; nucleo: string };

let contador = 0;
const novaChave = () => `novo-${++contador}`;

function paraLinhas(cargos: { id: string; gestao: string; cargo: string; diretoria: string; nucleo: string }[]) {
  return cargos.map((c) => ({ ...c, chave: c.id || novaChave() }));
}

// =============================================================================
// Foto
// =============================================================================
function FotoMembro({
  atual,
  nova,
  removida,
  onEscolher,
  onRemover,
  erro,
}: {
  atual: string | null;
  nova: string | null;
  removida: boolean;
  onEscolher: (arquivo: File) => Promise<void>;
  onRemover: () => void;
  erro?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const urlAtual = !removida ? publicUrl("fotos", atual) : null;
  const src = nova ?? urlAtual ?? FOTO_PADRAO;
  const temFoto = Boolean(nova ?? urlAtual);

  return (
    <div className="grid gap-2">
      <p className="text-sm text-foreground">
        Foto <span className="text-muted-foreground">(opcional)</span>
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <NextImage
          src={src}
          alt={temFoto ? "Foto do membro" : "Sem foto (imagem padrão)"}
          width={112}
          height={112}
          unoptimized={Boolean(nova)}
          className="size-28 rounded-2xl border border-border object-cover"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={processando}
            className={cn(botaoSecundario, "gap-2")}
          >
            <ImagePlus className="size-4" aria-hidden />
            {processando ? "Preparando…" : temFoto ? "Trocar foto" : "Escolher foto"}
          </button>
          {temFoto ? (
            <button type="button" onClick={onRemover} className={cn(botaoSecundario, "text-destructive")}>
              Remover foto
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
        onChange={async (e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = "";
          if (!arquivo) return;
          setProcessando(true);
          await onEscolher(arquivo);
          setProcessando(false);
        }}
      />
      <p className="text-xs text-muted-foreground">
        JPG, PNG ou WebP. A foto é cortada em quadrado (com o rosto mais para cima) e comprimida antes de enviar.
      </p>
      {erro ? (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

// =============================================================================
// Cargos por gestão
// =============================================================================
function EditorCargos({
  linhas,
  setLinhas,
  diretorias,
  nucleos,
  sugestoes,
  gestaoPadrao,
  erro,
}: {
  linhas: LinhaCargo[];
  setLinhas: (f: (atual: LinhaCargo[]) => LinhaCargo[]) => void;
  diretorias: Opcao[];
  nucleos: Opcao[];
  sugestoes: string[];
  gestaoPadrao: string;
  erro?: string;
}) {
  const listaId = useId();
  const mudar = (chave: string, campo: keyof LinhaCargo, valor: string) =>
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));

  return (
    <fieldset className="grid gap-3" aria-describedby={erro ? "cargos-erro" : "cargos-dica"}>
      <legend className="mb-1 text-sm text-foreground">Cargos por gestão</legend>
      <p id="cargos-dica" className="text-xs text-muted-foreground">
        Uma linha por cargo em cada gestão. A cada nova gestão, acrescente uma linha em vez de mudar a antiga: é o
        histórico que aparece no currículo do site.
      </p>
      <datalist id={listaId}>
        {sugestoes.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {linhas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum cargo cadastrado.</p> : null}
      <ol className="grid gap-3">
        {linhas.map((l, i) => {
          const id = (c: string) => `cargo-${l.chave}-${c}`;
          return (
            <li
              key={l.chave}
              className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[6.5rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
            >
              <Field id={id("gestao")} label="Gestão">
                <Input
                  id={id("gestao")}
                  value={l.gestao}
                  onChange={(e) => mudar(l.chave, "gestao", e.target.value)}
                  inputMode="decimal"
                  maxLength={6}
                  placeholder="2026.2"
                  className={inputClasse}
                />
              </Field>
              <Field id={id("cargo")} label="Cargo">
                <Input
                  id={id("cargo")}
                  value={l.cargo}
                  onChange={(e) => mudar(l.chave, "cargo", e.target.value)}
                  list={listaId}
                  maxLength={80}
                  className={inputClasse}
                />
              </Field>
              <Field id={id("diretoria")} label="Diretoria">
                <select
                  id={id("diretoria")}
                  value={l.diretoria}
                  onChange={(e) => mudar(l.chave, "diretoria", e.target.value)}
                  className={selectClasse}
                >
                  <option value="">Nenhuma</option>
                  {diretorias.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id={id("nucleo")} label="Núcleo">
                <select
                  id={id("nucleo")}
                  value={l.nucleo}
                  onChange={(e) => mudar(l.chave, "nucleo", e.target.value)}
                  className={selectClasse}
                >
                  <option value="">Nenhum</option>
                  {nucleos.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                onClick={() => setLinhas((atual) => atual.filter((x) => x.chave !== l.chave))}
                aria-label={`Remover cargo ${i + 1}${l.cargo ? ` (${l.cargo}, ${l.gestao})` : ""}`}
                className="inline-flex size-11 items-center justify-center justify-self-end rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
      <div>
        <button
          type="button"
          onClick={() =>
            setLinhas((atual) => [
              { chave: novaChave(), id: "", gestao: gestaoPadrao, cargo: "", diretoria: "", nucleo: "" },
              ...atual,
            ])
          }
          className={cn(botaoSecundario, "gap-2")}
        >
          <Plus className="size-4" aria-hidden />
          Adicionar cargo
        </button>
      </div>
      {erro ? (
        <p id="cargos-erro" role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      ) : null}
    </fieldset>
  );
}

// =============================================================================
// Formulário (novo e edição)
// =============================================================================
type PropsForm = {
  membro?: MembroAdmin;
  diretorias: Opcao[];
  nucleos: Opcao[];
  sugestoesCargo: string[];
  gestaoPadrao: string;
};

export function FormMembro(props: PropsForm) {
  return props.membro ? <FormMembroInterno {...props} /> : <FormNovoMembro {...props} />;
}

/**
 * Com Cache Components, o Next esconde a página (Activity) em vez de desmontá-la:
 * sem isto, "Novo membro" reabriria com os dados do último cadastro. Depois de um
 * envio que redirecionou, o formulário é recriado do zero quando a página some.
 */
function FormNovoMembro(props: PropsForm) {
  const [versao, setVersao] = useState(0);
  const enviado = useRef(false);
  useLayoutEffect(
    () => () => {
      if (enviado.current) {
        enviado.current = false;
        setVersao((v) => v + 1);
      }
    },
    [],
  );
  return <FormMembroInterno key={versao} {...props} aoEnviar={(ok) => (enviado.current = ok)} />;
}

function FormMembroInterno({
  membro,
  diretorias,
  nucleos,
  sugestoesCargo,
  gestaoPadrao,
  aoEnviar,
}: PropsForm & { aoEnviar?: (enviado: boolean) => void }) {
  const novo = !membro;
  const [linhas, setLinhas] = useState<LinhaCargo[]>(() =>
    paraLinhas(
      (membro?.cargos ?? []).map((c) => ({
        id: c.id,
        gestao: c.gestao,
        cargo: c.cargo,
        diretoria: c.diretoriaId ?? "",
        nucleo: c.nucleoId ?? "",
      })),
    ),
  );
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string>();

  const [estado, salvar, salvando] = useActionState(async (anterior: FormState, dados: FormData) => {
    // Membro novo salvo redireciona e não volta aqui; se voltou, não foi salvo.
    aoEnviar?.(true);
    const r = await salvarMembro(anterior, dados);
    aoEnviar?.(false);
    if (r.status === "ok") {
      if (r.valores?.cargos) setLinhas(paraLinhas(JSON.parse(r.valores.cargos)));
      setFoto((f) => {
        if (f) URL.revokeObjectURL(f.url);
        return null;
      });
      setRemoverFoto(false);
    }
    return r;
  }, ESTADO_INICIAL);
  const e = estado.erros ?? {};
  const v = (campo: string, padrao: string | null | undefined) =>
    estado.status === "erro" && estado.valores ? estado.valores[campo] : (padrao ?? "");

  async function escolherFoto(arquivo: File) {
    setErroFoto(undefined);
    try {
      const blob = await fotoQuadrada(arquivo);
      setFoto((f) => {
        if (f) URL.revokeObjectURL(f.url);
        return { blob, url: URL.createObjectURL(blob) };
      });
      setRemoverFoto(false);
    } catch {
      setErroFoto("Não foi possível ler esta imagem. Use JPG, PNG ou WebP.");
    }
  }

  return (
    <form
      noValidate
      className="grid gap-8"
      onSubmit={(ev) => {
        ev.preventDefault();
        const dados = new FormData(ev.currentTarget);
        dados.set(
          "cargos",
          JSON.stringify(linhas.map(({ id, gestao, cargo, diretoria, nucleo }) => ({ id, gestao, cargo, diretoria, nucleo }))),
        );
        if (foto) dados.set("foto", foto.blob, foto.blob.type === "image/png" ? "foto.png" : "foto.webp");
        if (removerFoto) dados.set("remover_foto", "1");
        startTransition(() => salvar(dados));
      }}
    >
      <input type="hidden" name="id" value={membro?.id ?? ""} />

      <FotoMembro
        atual={membro?.fotoPath ?? null}
        nova={foto?.url ?? null}
        removida={removerFoto}
        onEscolher={escolherFoto}
        onRemover={() => {
          setFoto((f) => {
            if (f) URL.revokeObjectURL(f.url);
            return null;
          });
          setRemoverFoto(true);
        }}
        erro={erroFoto ?? e.foto}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="m-nome" label="Nome" erro={e.nome} className="sm:col-span-2">
          <Input
            {...ariaCampo("m-nome", e.nome)}
            name="nome"
            maxLength={120}
            defaultValue={v("nome", membro?.nome)}
            className={inputClasse}
          />
        </Field>
        <Field id="m-curso" label="Curso" opcional erro={e.curso}>
          <Input
            {...ariaCampo("m-curso", e.curso)}
            name="curso"
            maxLength={120}
            defaultValue={v("curso", membro?.curso)}
            className={inputClasse}
          />
        </Field>
        <Field id="m-trainee" label="Gestão em que entrou como trainee" opcional erro={e.gestao_trainee}>
          <Input
            {...ariaCampo("m-trainee", e.gestao_trainee)}
            name="gestao_trainee"
            inputMode="decimal"
            maxLength={6}
            placeholder="2025.1"
            defaultValue={v("gestao_trainee", membro?.gestaoTrainee)}
            className={inputClasse}
          />
        </Field>
        <Field id="m-linkedin" label="LinkedIn" opcional erro={e.linkedin} className="sm:col-span-2">
          <Input
            {...ariaCampo("m-linkedin", e.linkedin)}
            name="linkedin"
            type="url"
            inputMode="url"
            placeholder="https://www.linkedin.com/in/..."
            defaultValue={v("linkedin", membro?.linkedin)}
            className={inputClasse}
          />
        </Field>
        <Field
          id="m-email"
          label="E-mail de contato"
          opcional
          erro={e.email}
          dica="Só a diretoria vê. Não aparece no site."
        >
          <Input
            {...ariaCampo("m-email", e.email, "dica")}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            defaultValue={v("email", membro?.email)}
            className={inputClasse}
          />
        </Field>
        <Field id="m-telefone" label="Telefone" opcional erro={e.telefone} dica="Só a diretoria vê.">
          <Input
            {...ariaCampo("m-telefone", e.telefone, "dica")}
            name="telefone"
            type="tel"
            inputMode="tel"
            maxLength={30}
            defaultValue={v("telefone", membro?.telefone)}
            className={inputClasse}
          />
        </Field>
      </div>

      {novo ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-sm text-foreground">Situação</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["ativo", "Membro ativo"],
                  ["alumni", "Alumni"],
                ] as const
              ).map(([valor, rotulo]) => (
                <label
                  key={valor}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border px-4 text-[0.9375rem] has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-2 has-focus-visible:ring-ring"
                >
                  <input
                    type="radio"
                    name="status"
                    value={valor}
                    defaultChecked={(v("status", "ativo") || "ativo") === valor}
                    className="size-4 accent-primary"
                  />
                  {rotulo}
                </label>
              ))}
            </div>
          </fieldset>
          <Field
            id="m-acesso"
            label="Acesso à Área Restrita"
            erro={e.acesso_papel}
            dica="Usa o e-mail acima, que precisa ser o da conta Google. Dá para mudar depois em Acessos."
          >
            <select
              {...ariaCampo("m-acesso", e.acesso_papel, "dica")}
              name="acesso_papel"
              defaultValue={v("acesso_papel", "")}
              className={selectClasse}
            >
              <option value="">Sem acesso</option>
              {PAPEIS.map((p) => (
                <option key={p} value={p} title={DESCRICAO_PAPEL[p]}>
                  {ROTULO_PAPEL[p]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}

      <EditorCargos
        linhas={linhas}
        setLinhas={setLinhas}
        diretorias={diretorias}
        nucleos={nucleos}
        sugestoes={sugestoesCargo}
        gestaoPadrao={gestaoPadrao}
        erro={e.cargos}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          {salvando ? "Salvando…" : novo ? "Cadastrar membro" : "Salvar alterações"}
        </button>
        <AvisoFormulario status={estado.status} mensagem={estado.mensagem} />
      </div>
    </form>
  );
}

// =============================================================================
// Situação: alumni / reativar / excluir / anonimizar
// =============================================================================
export function SituacaoMembro({ membro }: { membro: MembroAdmin }) {
  const acesso = membro.papeis.length > 0 ? " O acesso à Área Restrita também é removido." : "";
  const linkSecundario = cn(botaoSecundario);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        {membro.status === "ativo" ? (
          <ConfirmarAcao
            gatilho="Mover para alumni"
            gatilhoClasse={linkSecundario}
            titulo={`Mover ${membro.nome} para alumni?`}
            descricao={`É o desligamento normal: sai da página Equipe e passa para Alumni, com os cargos e relatórios.${acesso}`}
            confirmar="Mover para alumni"
            pendente="Movendo…"
            destrutivo={false}
            campos={{ id: membro.id }}
            acao={moverParaAlumni}
          />
        ) : (
          <ConfirmarAcao
            gatilho="Reativar como membro"
            gatilhoClasse={linkSecundario}
            titulo={`Reativar ${membro.nome}?`}
            descricao="Volta para a página Equipe. Lembre de adicionar o cargo da gestão atual e, se for o caso, liberar o acesso em Acessos."
            confirmar="Reativar"
            pendente="Reativando…"
            destrutivo={false}
            campos={{ id: membro.id }}
            acao={reativarMembro}
          />
        )}
      </div>

      <div className="grid gap-3 rounded-xl border border-destructive/40 p-4">
        <h3 className="font-sans text-base font-medium">Remover dados pessoais</h3>
        {membro.relatorios === 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              Só para cadastro feito por engano ou pedido de remoção de dados (LGPD). Apaga o cadastro, os cargos, a
              foto e os pontos/strikes. Para desligar alguém, use “Mover para alumni”.
            </p>
            <div>
              <ConfirmarAcao
                gatilho="Excluir cadastro"
                gatilhoClasse="inline-flex min-h-10 items-center rounded-full px-4 text-sm text-destructive hover:bg-destructive/10"
                titulo="Excluir este cadastro de vez?"
                descricao={`Apaga ${membro.nome}, os cargos, a foto e os pontos/strikes.${acesso} Não dá para desfazer.`}
                confirmar="Excluir de vez"
                pendente="Excluindo…"
                digitar={membro.nome}
                campos={{ id: membro.id }}
                acao={excluirMembro}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {membro.nome} é autor de {plural(membro.relatorios, "relatório", "relatórios")}, então o cadastro não
              pode ser excluído. Para um pedido de remoção de dados (LGPD), anonimize: o nome vira “Ex-membro” nos
              relatórios, e somem foto, curso, LinkedIn, contato e pontos/strikes. A pessoa sai das páginas Equipe e
              Alumni.
            </p>
            <div>
              <ConfirmarAcao
                gatilho="Anonimizar"
                gatilhoClasse="inline-flex min-h-10 items-center rounded-full px-4 text-sm text-destructive hover:bg-destructive/10"
                titulo="Anonimizar este cadastro?"
                descricao={`Os dados pessoais de ${membro.nome} são apagados e o nome vira “Ex-membro”.${acesso} Não dá para desfazer.`}
                confirmar="Anonimizar"
                pendente="Anonimizando…"
                digitar={membro.nome}
                campos={{ id: membro.id }}
                acao={anonimizarMembro}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
