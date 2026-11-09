"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/lib/actions/form-state";
import { primeiroErro, valoresTexto } from "@/lib/actions/form-state";
import { exigirPapel } from "@/lib/auth";
import { ADMIN } from "@/lib/papeis";
import { TAGS } from "@/lib/queries";
import { gerarSlug, slugLivre } from "@/lib/slug";
import { conferirPdf, lerImagem, listarPasta, podarPasta, remover, subirImagem } from "@/lib/storage-servidor";
import { createClient } from "@/lib/supabase/server";

/**
 * Conteúdo fixo do site (só Presidente e Diretor de RH, iguais às policies):
 * núcleos, diretorias, parceiros, seções de Nossa História, etapas do PS e
 * calendários da Área Restrita.
 * Ordem em toda ação: papel → validação → banco → arquivos → cache.
 * Imagens chegam já reduzidas pelo navegador e são conferidas de novo aqui.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_FOTOS_HISTORIA = 12;
const MAX_NOVAS_FOTOS = 8;

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ErroPg = { code?: string; message: string };

/** Tabelas editáveis aqui, as tags de cache públicas e a pasta de arquivos de cada uma. */
const TABELAS = {
  nucleos: { tags: [TAGS.nucleos, TAGS.members, TAGS.reports], pasta: { bucket: "site", prefixo: "nucleos" } },
  diretorias: { tags: [TAGS.members], pasta: null },
  partners: { tags: [TAGS.partners, TAGS.nucleos], pasta: { bucket: "site", prefixo: "parceiros" } },
  history_sections: { tags: [TAGS.history], pasta: { bucket: "fotos", prefixo: "historia" } },
  ps_steps: { tags: [TAGS.psSteps], pasta: null },
  calendars: { tags: [], pasta: null },
} as const;
type Tabela = keyof typeof TABELAS;

function ehTabela(valor: unknown): valor is Tabela {
  return typeof valor === "string" && Object.hasOwn(TABELAS, valor);
}

function atualizarCache(tabela: Tabela) {
  for (const tag of TABELAS[tabela].tags) updateTag(tag);
  refresh();
}

function mensagemErro(error: ErroPg, contexto: string): string {
  console.error(contexto, error);
  if (error.code === "23505") return "Já existe um item igual cadastrado.";
  if (error.code === "23514") return "Algum campo está fora do formato aceito.";
  if (error.code === "42501") return "Você não tem permissão para esta ação.";
  return "Não foi possível salvar agora. Tente de novo em instantes.";
}

function invalido(erros: Record<string, string>, valores: Record<string, string>): FormState {
  return { status: "erro", mensagem: "Revise os campos destacados.", erros, valores };
}

const texto = (max: number) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`);
const obrigatorio = (max: number, msg: string) => z.string().trim().min(1, msg).max(max, `Use no máximo ${max} caracteres.`);

/** id do formulário: "" (novo), um UUID, ou inválido (null). */
function lerId(formData: FormData): string | "" | null {
  const id = String(formData.get("id") ?? "");
  if (id === "") return "";
  return UUID.test(id) ? id : null;
}

/** Próxima posição no fim da lista. */
async function proximaOrdem(supabase: Supabase, tabela: Tabela) {
  const { data } = await supabase.from(tabela).select("ordem").order("ordem", { ascending: false }).limit(1);
  return (data?.[0]?.ordem ?? 0) + 1;
}

async function slugUnico(supabase: Supabase, tabela: "nucleos" | "diretorias", nome: string) {
  const base = gerarSlug(nome, 60);
  const { data, error } = await supabase.from(tabela).select("slug").like("slug", `${base}%`);
  if (error) throw new Error(`Supabase (${tabela}): ${error.message}`);
  return slugLivre(
    base,
    data.map((r) => r.slug),
  );
}

/**
 * Troca a imagem única de um item (banner de núcleo, logo de parceiro): envia a
 * nova, aponta o banco para ela e só então apaga as antigas da pasta.
 */
async function trocarImagemUnica(
  supabase: Supabase,
  tabela: "nucleos" | "partners",
  coluna: "banner_path" | "logo_path",
  id: string,
  arquivo: File | null,
): Promise<string | null> {
  const { bucket, prefixo } = TABELAS[tabela].pasta;
  const pasta = `${prefixo}/${id}`;
  let novo: string | null = null;
  if (arquivo) {
    novo = await subirImagem(supabase, bucket, pasta, arquivo);
    if (!novo) return "Não foi possível enviar a imagem. Tente de novo.";
  }
  const { error } =
    tabela === "nucleos"
      ? await supabase.from("nucleos").update({ banner_path: novo }).eq("id", id)
      : await supabase.from("partners").update({ logo_path: novo }).eq("id", id);
  if (error) {
    if (novo) await remover(supabase, bucket, [novo]);
    return mensagemErro(error, `gravar ${coluna}`);
  }
  await podarPasta(supabase, bucket, pasta, [novo]);
  return null;
}

// =============================================================================
// Ordem e exclusão (genéricas)
// =============================================================================
/** Sobe ou desce um item e renumera a lista (1, 2, 3…), o que também conserta empates antigos. */
export async function moverItem(formData: FormData) {
  await exigirPapel(ADMIN);
  const tabela = formData.get("tabela");
  const id = String(formData.get("id") ?? "");
  const direcao = formData.get("direcao") === "cima" ? -1 : 1;
  if (!ehTabela(tabela) || !UUID.test(id)) return;

  const supabase = await createClient();
  const { data, error } = await supabase.from(tabela).select("id, ordem").order("ordem").order("created_at");
  if (error) {
    console.error("mover item", error);
    return;
  }
  const lista = data.map((r) => r.id);
  const i = lista.indexOf(id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];

  const mudancas = lista.flatMap((rid, pos) => (data.find((r) => r.id === rid)?.ordem === pos + 1 ? [] : [{ rid, ordem: pos + 1 }]));
  const resultados = await Promise.all(mudancas.map((m) => supabase.from(tabela).update({ ordem: m.ordem }).eq("id", m.rid)));
  for (const r of resultados) if (r.error) console.error("mover item", r.error);
  atualizarCache(tabela);
}

/**
 * Exclui um item. Núcleos e diretorias pedem o nome digitado, porque somem do
 * currículo dos membros e dos filtros de relatório (as referências viram vazias).
 */
export async function excluirItem(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const tabela = formData.get("tabela");
  const id = String(formData.get("id") ?? "");
  if (!ehTabela(tabela) || !UUID.test(id)) return { status: "erro", mensagem: "Item inválido. Recarregue a página." };
  const supabase = await createClient();

  if (tabela === "nucleos" || tabela === "diretorias") {
    const { data, error } = await supabase.from(tabela).select("nome").eq("id", id).maybeSingle();
    if (error) return { status: "erro", mensagem: mensagemErro(error, "ler item") };
    if (!data) return { status: "erro", mensagem: "Item não encontrado. Recarregue a página." };
    const digitado = String(formData.get("confirmacao") ?? "").trim().toLowerCase();
    if (digitado !== data.nome.trim().toLowerCase()) return { status: "erro", mensagem: "Digite o nome exatamente como aparece." };
  }

  const pasta = TABELAS[tabela].pasta;
  const arquivos = pasta ? (await listarPasta(supabase, pasta.bucket, `${pasta.prefixo}/${id}`)).map((f) => f.path) : [];
  const { data, error } = await supabase.from(tabela).delete().eq("id", id).select("id");
  if (error) return { status: "erro", mensagem: mensagemErro(error, `excluir ${tabela}`) };
  if (data.length === 0) return { status: "erro", mensagem: "Item não encontrado. Recarregue a página." };
  if (pasta) await remover(supabase, pasta.bucket, arquivos);

  atualizarCache(tabela);
  return { status: "ok", mensagem: "Excluído." };
}

// =============================================================================
// Núcleos
// =============================================================================
const nucleoSchema = z.object({
  nome: obrigatorio(60, "Informe o nome."),
  area: texto(80),
  descricao: texto(2000),
});

export async function salvarNucleo(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = lerId(formData);
  if (id === null) return { status: "erro", mensagem: "Núcleo inválido. Recarregue a página." };
  const valores = valoresTexto(formData, ["nome", "area", "descricao"]);
  const parsed = nucleoSchema.safeParse(valores);
  const erros: Record<string, string> = parsed.success ? {} : primeiroErro(z.flattenError(parsed.error).fieldErrors);
  const banner = await lerImagem(formData.get("imagem"));
  if (banner && "erro" in banner) erros.imagem = banner.erro;
  if (!parsed.success || Object.keys(erros).length > 0) return invalido(erros, valores);

  const d = { nome: parsed.data.nome, area: parsed.data.area || null, descricao: parsed.data.descricao || null };
  const supabase = await createClient();
  let nucleoId = id;
  if (id === "") {
    const { data, error } = await supabase
      .from("nucleos")
      .insert({ ...d, slug: await slugUnico(supabase, "nucleos", d.nome), ordem: await proximaOrdem(supabase, "nucleos") })
      .select("id")
      .single();
    if (error) return { status: "erro", mensagem: mensagemErro(error, "criar núcleo"), valores };
    nucleoId = data.id;
  } else {
    const { data, error } = await supabase.from("nucleos").update(d).eq("id", id).select("id");
    if (error) return { status: "erro", mensagem: mensagemErro(error, "salvar núcleo"), valores };
    if (data.length === 0) return { status: "erro", mensagem: "Núcleo não encontrado. Recarregue a página." };
  }

  let aviso: string | null = null;
  if (banner || formData.get("remover_imagem") === "1") {
    aviso = await trocarImagemUnica(supabase, "nucleos", "banner_path", nucleoId, banner && "arquivo" in banner ? banner.arquivo : null);
  }

  atualizarCache("nucleos");
  if (aviso) return { status: "erro", mensagem: `Textos salvos, mas o banner não: ${aviso}`, valores };
  return { status: "ok", mensagem: id === "" ? `Núcleo ${d.nome} criado.` : "Alterações salvas." };
}

// =============================================================================
// Diretorias
// =============================================================================
export async function salvarDiretoria(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = lerId(formData);
  if (id === null) return { status: "erro", mensagem: "Diretoria inválida. Recarregue a página." };
  const valores = valoresTexto(formData, ["nome"]);
  const nome = obrigatorio(80, "Informe o nome.").safeParse(valores.nome);
  if (!nome.success) return invalido({ nome: nome.error.issues[0]?.message ?? "Confira o nome." }, valores);

  const supabase = await createClient();
  if (id === "") {
    const { error } = await supabase.from("diretorias").insert({
      nome: nome.data,
      slug: await slugUnico(supabase, "diretorias", nome.data),
      ordem: await proximaOrdem(supabase, "diretorias"),
    });
    if (error) return { status: "erro", mensagem: mensagemErro(error, "criar diretoria"), valores };
  } else {
    const { data, error } = await supabase.from("diretorias").update({ nome: nome.data }).eq("id", id).select("id");
    if (error) return { status: "erro", mensagem: mensagemErro(error, "salvar diretoria"), valores };
    if (data.length === 0) return { status: "erro", mensagem: "Diretoria não encontrada. Recarregue a página." };
  }

  atualizarCache("diretorias");
  return { status: "ok", mensagem: id === "" ? `Diretoria ${nome.data} criada.` : "Alterações salvas." };
}

// =============================================================================
// Parceiros (rodapé e núcleos)
// =============================================================================
const parceiroSchema = z.object({
  nome: obrigatorio(80, "Informe o nome."),
  url: z
    .string()
    .trim()
    .max(300, "Link longo demais.")
    .refine((v) => v === "" || (/^https:\/\//.test(v) && URL.canParse(v)), "Use o link completo, começando com https://."),
});

export async function salvarParceiro(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = lerId(formData);
  if (id === null) return { status: "erro", mensagem: "Parceiro inválido. Recarregue a página." };
  const valores = valoresTexto(formData, ["nome", "url"]);
  const parsed = parceiroSchema.safeParse(valores);
  const erros: Record<string, string> = parsed.success ? {} : primeiroErro(z.flattenError(parsed.error).fieldErrors);
  const nucleos = [...new Set(formData.getAll("nucleo").map(String))];
  if (nucleos.some((n) => !UUID.test(n))) erros.nucleos = "Escolha os núcleos de novo.";
  const logo = await lerImagem(formData.get("imagem"));
  if (logo && "erro" in logo) erros.imagem = logo.erro;
  if (!parsed.success || Object.keys(erros).length > 0) return invalido(erros, valores);

  const d = { nome: parsed.data.nome, url: parsed.data.url || null, institucional: formData.get("institucional") === "on" };
  const supabase = await createClient();
  let parceiroId = id;
  if (id === "") {
    const { data, error } = await supabase
      .from("partners")
      .insert({ ...d, ordem: await proximaOrdem(supabase, "partners") })
      .select("id")
      .single();
    if (error) return { status: "erro", mensagem: mensagemErro(error, "criar parceiro"), valores };
    parceiroId = data.id;
  } else {
    const { data, error } = await supabase.from("partners").update(d).eq("id", id).select("id");
    if (error) return { status: "erro", mensagem: mensagemErro(error, "salvar parceiro"), valores };
    if (data.length === 0) return { status: "erro", mensagem: "Parceiro não encontrado. Recarregue a página." };
  }

  // Núcleos em que aparece: tira os desmarcados e acrescenta os novos.
  const avisos: string[] = [];
  const { error: erroTira } = await supabase
    .from("nucleo_partners")
    .delete()
    .eq("partner_id", parceiroId)
    .not("nucleo_id", "in", `(${nucleos.length ? nucleos.join(",") : "00000000-0000-0000-0000-000000000000"})`);
  if (erroTira) avisos.push(mensagemErro(erroTira, "tirar parceiro de núcleos"));
  if (nucleos.length > 0) {
    const { error } = await supabase
      .from("nucleo_partners")
      .upsert(
        nucleos.map((n) => ({ nucleo_id: n, partner_id: parceiroId })),
        { onConflict: "nucleo_id,partner_id", ignoreDuplicates: true },
      );
    if (error) avisos.push(mensagemErro(error, "pôr parceiro em núcleos"));
  }

  if (logo || formData.get("remover_imagem") === "1") {
    const aviso = await trocarImagemUnica(supabase, "partners", "logo_path", parceiroId, logo && "arquivo" in logo ? logo.arquivo : null);
    if (aviso) avisos.push(`Logo: ${aviso}`);
  }

  atualizarCache("partners");
  if (avisos.length > 0) return { status: "erro", mensagem: avisos.join(" "), valores };
  return { status: "ok", mensagem: id === "" ? `Parceiro ${d.nome} cadastrado.` : "Alterações salvas." };
}

// =============================================================================
// Nossa História
// =============================================================================
const secaoSchema = z.object({
  periodo: obrigatorio(40, "Informe o período (ex.: 2019 – 2021)."),
  titulo: obrigatorio(160, "Informe o título."),
  texto: texto(5000),
  conquistas: z
    .string()
    .transform((v) => [...new Set(v.split("\n").map((l) => l.trim()).filter(Boolean))])
    .refine((l) => l.length <= 12, "Use no máximo 12 conquistas.")
    .refine((l) => l.every((c) => c.length <= 100), "Cada conquista pode ter no máximo 100 caracteres."),
});

export async function salvarSecaoHistoria(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = lerId(formData);
  if (id === null) return { status: "erro", mensagem: "Seção inválida. Recarregue a página." };
  const valores = valoresTexto(formData, ["periodo", "titulo", "texto", "conquistas"]);
  const parsed = secaoSchema.safeParse(valores);
  const erros: Record<string, string> = parsed.success ? {} : primeiroErro(z.flattenError(parsed.error).fieldErrors);

  let mantidas: string[] = [];
  try {
    const bruto: unknown = JSON.parse(String(formData.get("fotos_mantidas") ?? "[]"));
    mantidas = Array.isArray(bruto) ? bruto.filter((p): p is string => typeof p === "string") : [];
  } catch {
    erros.fotos = "Não foi possível ler as fotos. Recarregue a página.";
  }
  const novas = formData.getAll("novas_fotos");
  if (novas.length > MAX_NOVAS_FOTOS) erros.fotos = `Envie no máximo ${MAX_NOVAS_FOTOS} fotos de cada vez.`;
  if (mantidas.length + novas.length > MAX_FOTOS_HISTORIA) erros.fotos = `Use no máximo ${MAX_FOTOS_HISTORIA} fotos por seção.`;
  const arquivos: File[] = [];
  for (const n of novas) {
    const r = await lerImagem(n);
    if (r && "erro" in r) erros.fotos = r.erro;
    else if (r) arquivos.push(r.arquivo);
  }
  if (!parsed.success || Object.keys(erros).length > 0) return invalido(erros, valores);

  const d = { periodo: parsed.data.periodo, titulo: parsed.data.titulo, texto: parsed.data.texto || null, conquistas: parsed.data.conquistas };
  const supabase = await createClient();
  let secaoId = id;
  let atuais: string[] = [];
  if (id === "") {
    const { data, error } = await supabase
      .from("history_sections")
      .insert({ ...d, ordem: await proximaOrdem(supabase, "history_sections") })
      .select("id")
      .single();
    if (error) return { status: "erro", mensagem: mensagemErro(error, "criar seção"), valores };
    secaoId = data.id;
  } else {
    const { data, error } = await supabase.from("history_sections").select("fotos").eq("id", id).maybeSingle();
    if (error) return { status: "erro", mensagem: mensagemErro(error, "ler seção"), valores };
    if (!data) return { status: "erro", mensagem: "Seção não encontrada. Recarregue a página." };
    atuais = data.fotos;
  }

  // Só mantém fotos que já eram desta seção: o cliente não escolhe caminhos arbitrários.
  const ficam = mantidas.filter((p) => atuais.includes(p));
  const pasta = `historia/${secaoId}`;
  const enviadas: string[] = [];
  for (const arquivo of arquivos) {
    const path = await subirImagem(supabase, "fotos", pasta, arquivo);
    if (path) enviadas.push(path);
  }
  const fotos = [...ficam, ...enviadas];

  const { error } = await supabase.from("history_sections").update({ ...d, fotos }).eq("id", secaoId);
  if (error) {
    await remover(supabase, "fotos", enviadas);
    return { status: "erro", mensagem: mensagemErro(error, "salvar seção"), valores };
  }
  await podarPasta(supabase, "fotos", pasta, fotos);

  atualizarCache("history_sections");
  if (enviadas.length < arquivos.length) {
    return { status: "erro", mensagem: "Seção salva, mas alguma foto não foi enviada. Tente de novo.", valores };
  }
  return { status: "ok", mensagem: id === "" ? "Seção criada." : "Alterações salvas." };
}

// =============================================================================
// Etapas do Processo Seletivo
// =============================================================================
const etapaSchema = z.object({ titulo: obrigatorio(120, "Informe o título."), descricao: texto(1000) });

export async function salvarEtapa(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = lerId(formData);
  if (id === null) return { status: "erro", mensagem: "Etapa inválida. Recarregue a página." };
  const valores = valoresTexto(formData, ["titulo", "descricao"]);
  const parsed = etapaSchema.safeParse(valores);
  if (!parsed.success) return invalido(primeiroErro(z.flattenError(parsed.error).fieldErrors), valores);

  const d = { titulo: parsed.data.titulo, descricao: parsed.data.descricao || null };
  const supabase = await createClient();
  const { error } =
    id === ""
      ? await supabase.from("ps_steps").insert({ ...d, ordem: await proximaOrdem(supabase, "ps_steps") })
      : await supabase.from("ps_steps").update(d).eq("id", id);
  if (error) return { status: "erro", mensagem: mensagemErro(error, "salvar etapa"), valores };

  atualizarCache("ps_steps");
  return { status: "ok", mensagem: id === "" ? "Etapa criada." : "Alterações salvas." };
}

// =============================================================================
// Calendários (aba Calendário da Área Restrita)
// =============================================================================
/**
 * Aceita o ID da agenda ("...@group.calendar.google.com") ou o link de
 * incorporação copiado do Google Agenda (de onde sai o parâmetro src).
 */
function idDaAgenda(valor: string): string {
  const v = valor.trim();
  if (/^https:\/\/calendar\.google\.com\//.test(v) && URL.canParse(v)) {
    return new URL(v).searchParams.get("src")?.trim() ?? "";
  }
  return v;
}

const calendarioSchema = z.object({
  nome: obrigatorio(80, "Informe o nome."),
  google_id: z
    .string()
    .transform(idDaAgenda)
    .pipe(
      z
        .string()
        .min(1, "Cole o ID da agenda.")
        .max(255, "ID longo demais.")
        .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Cole o ID da agenda (termina em @group.calendar.google.com) ou o link de incorporação."),
    ),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Escolha uma cor."),
});

export async function salvarCalendario(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = lerId(formData);
  if (id === null) return { status: "erro", mensagem: "Agenda inválida. Recarregue a página." };
  const valores = valoresTexto(formData, ["nome", "google_id", "cor"]);
  const parsed = calendarioSchema.safeParse(valores);
  if (!parsed.success) return invalido(primeiroErro(z.flattenError(parsed.error).fieldErrors), valores);

  const d = { nome: parsed.data.nome, google_calendar_id: parsed.data.google_id, cor: parsed.data.cor.toUpperCase() };
  const supabase = await createClient();
  const { error } =
    id === ""
      ? await supabase.from("calendars").insert({ ...d, ordem: await proximaOrdem(supabase, "calendars") })
      : await supabase.from("calendars").update(d).eq("id", id);
  if (error?.code === "23505") {
    return invalido({ google_id: "Esta agenda já está cadastrada." }, valores);
  }
  if (error) return { status: "erro", mensagem: mensagemErro(error, "salvar agenda"), valores };

  atualizarCache("calendars");
  return { status: "ok", mensagem: id === "" ? `Agenda ${d.nome} adicionada.` : "Alterações salvas." };
}

// =============================================================================
// Processo Seletivo: abertura, link do Forms e edital
// =============================================================================
const FORMS = /^https:\/\/(docs\.google\.com\/forms\/|forms\.gle\/)/;
/** Edital no bucket público `site`, sempre com nome novo (evita cache antigo da CDN). */
const EDITAL = /^ps\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/;

/**
 * Abre ou fecha o PS. Aberto, o botão "Processo Seletivo" aparece no topo do
 * site e leva ao formulário, por isso abrir exige o link do Google Forms.
 */
export async function salvarPs(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const aberto = formData.get("aberto") === "on";
  const forms = String(formData.get("forms_url") ?? "").trim();
  const valores = { forms_url: forms, aberto: aberto ? "on" : "" };
  if (forms && (!FORMS.test(forms) || !URL.canParse(forms) || forms.length > 500)) {
    return invalido({ forms_url: "Use o link do Google Forms (https://docs.google.com/forms/… ou https://forms.gle/…)." }, valores);
  }
  if (aberto && !forms) return invalido({ forms_url: "Para abrir o PS, informe o link do formulário." }, valores);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .update({ ps_aberto: aberto, forms_url: forms || null })
    .eq("id", true)
    .select("id");
  if (error) return { status: "erro", mensagem: mensagemErro(error, "salvar PS"), valores };
  if (data.length === 0) return { status: "erro", mensagem: "Configuração não encontrada. Recarregue a página." };

  updateTag(TAGS.settings);
  refresh();
  return {
    status: "ok",
    mensagem: aberto
      ? "PS aberto: o botão Processo Seletivo já aparece no topo do site."
      : "PS fechado: o botão Processo Seletivo saiu do site.",
  };
}

/** Depois do upload direto do navegador: confere que é PDF, publica e apaga o edital anterior. */
export async function anexarEdital(path: string): Promise<{ ok: boolean; mensagem: string }> {
  await exigirPapel(ADMIN);
  if (!EDITAL.test(path)) return { ok: false, mensagem: "Arquivo inválido." };
  const supabase = await createClient();
  if (!(await conferirPdf(supabase, "site", path))) {
    await remover(supabase, "site", [path]);
    return { ok: false, mensagem: "O arquivo enviado não é um PDF válido." };
  }
  const { error } = await supabase.from("site_settings").update({ edital_pdf_path: path }).eq("id", true);
  if (error) {
    await remover(supabase, "site", [path]);
    return { ok: false, mensagem: mensagemErro(error, "anexar edital") };
  }
  await podarPasta(supabase, "site", "ps", [path]);

  updateTag(TAGS.settings);
  refresh();
  return { ok: true, mensagem: "Edital publicado." };
}

export async function removerEdital(): Promise<FormState> {
  await exigirPapel(ADMIN);
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").update({ edital_pdf_path: null }).eq("id", true);
  if (error) return { status: "erro", mensagem: mensagemErro(error, "remover edital") };
  await podarPasta(supabase, "site", "ps", []);

  updateTag(TAGS.settings);
  refresh();
  return { status: "ok", mensagem: "Edital removido." };
}
