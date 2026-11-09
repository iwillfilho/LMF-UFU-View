"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { liberarAcesso, revogarDosMembros } from "@/lib/acessos-servidor";
import type { FormState } from "@/lib/actions/form-state";
import { primeiroErro, valoresTexto } from "@/lib/actions/form-state";
import { extensaoImagem, IMAGEM_MAX, MIME_IMAGEM, primeirosBytes } from "@/lib/arquivos";
import { exigirPapel } from "@/lib/auth";
import { compararGestao, plural } from "@/lib/format";
import { ADMIN, PAPEIS } from "@/lib/papeis";
import { TAGS } from "@/lib/queries";
import { gerarSlug, slugLivre } from "@/lib/slug";
import { listarPasta, remover } from "@/lib/storage-servidor";
import { createClient } from "@/lib/supabase/server";

/**
 * Membros e cadastros de alumni (só Presidente e Diretor de RH, iguais às policies).
 * Ordem em toda ação: papel → validação → banco → arquivos → cache.
 * Fotos ficam em fotos/membros/<id>/; a antiga só é apagada depois que o banco aponta para a nova.
 * Desligar, excluir, anonimizar e "virar gestão" também revogam o acesso à Área Restrita.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const GESTAO = /^\d{4}\.[12]$/;
const MAX_CARGOS = 40;

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ErroPg = { code?: string; message: string };

function mensagemErro(error: ErroPg, contexto: string): string {
  console.error(contexto, error);
  if (error.code === "23505" && error.message.includes("member_terms")) {
    return "O mesmo cargo aparece duas vezes na mesma gestão.";
  }
  if (error.code === "23503") return "Este cadastro tem relatórios como autor: use Anonimizar em vez de Excluir.";
  if (error.code === "23514") return "Algum campo está fora do formato aceito.";
  if (error.code === "42501") return "Você não tem permissão para esta ação.";
  return "Não foi possível salvar agora. Tente de novo em instantes.";
}

const gestao = z
  .string()
  .trim()
  .regex(GESTAO, "Use o formato 2026.2.")
  .refine((g) => Number(g.slice(0, 4)) >= 2000 && Number(g.slice(0, 4)) <= 2100, "Confira o ano da gestão.");
const gestaoOpcional = z.string().trim().refine((g) => g === "" || gestao.safeParse(g).success, "Use o formato 2026.2.");
const uuidOuVazio = z.string().refine((v) => v === "" || UUID.test(v), "Escolha de novo.");

const membroSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(120, "Use no máximo 120 caracteres."),
  curso: z.string().trim().max(120, "Use no máximo 120 caracteres."),
  linkedin: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^https:\/\/([a-z]+\.)?linkedin\.com\//.test(v),
      "Cole o link completo do perfil (https://www.linkedin.com/in/...).",
    ),
  gestao_trainee: gestaoOpcional,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || z.email().max(254).safeParse(v).success, "Informe um e-mail válido."),
  telefone: z.string().trim().max(30, "Use no máximo 30 caracteres."),
});

const cargoSchema = z.object({
  id: uuidOuVazio,
  gestao,
  cargo: z.string().trim().min(1, "Informe o cargo.").max(80, "Use no máximo 80 caracteres."),
  diretoria: uuidOuVazio,
  nucleo: uuidOuVazio,
});

export type CargoForm = z.infer<typeof cargoSchema>;

const CAMPOS = ["nome", "curso", "linkedin", "gestao_trainee", "email", "telefone", "status", "acesso_papel", "cargos"];

function lerCargos(json: string): { cargos: CargoForm[] } | { erro: string } {
  let bruto: unknown;
  try {
    bruto = JSON.parse(json || "[]");
  } catch {
    return { erro: "Não foi possível ler os cargos. Recarregue a página." };
  }
  if (!Array.isArray(bruto)) return { erro: "Não foi possível ler os cargos. Recarregue a página." };
  if (bruto.length > MAX_CARGOS) return { erro: `Use no máximo ${MAX_CARGOS} cargos.` };
  const cargos: CargoForm[] = [];
  for (const [i, linha] of bruto.entries()) {
    const r = cargoSchema.safeParse(linha);
    if (!r.success) return { erro: `Cargo ${i + 1}: ${r.error.issues[0]?.message ?? "confira os campos."}` };
    cargos.push(r.data);
  }
  const chaves = cargos.map((c) => `${c.gestao}|${c.cargo.toLowerCase()}`);
  const repetido = chaves.findIndex((k, i) => chaves.indexOf(k) !== i);
  if (repetido >= 0) return { erro: `Cargo ${repetido + 1}: o mesmo cargo já aparece nesta gestão.` };
  return { cargos };
}

/** Foto já recortada e comprimida no navegador; aqui só se confere tamanho e conteúdo real. */
async function lerFoto(formData: FormData): Promise<{ arquivo: File; ext: keyof typeof MIME_IMAGEM } | { erro: string } | null> {
  const foto = formData.get("foto");
  if (!(foto instanceof File) || foto.size === 0) return null;
  if (foto.size > IMAGEM_MAX) return { erro: "A foto pode ter no máximo 5 MB." };
  const ext = extensaoImagem(await primeirosBytes(foto));
  if (!ext) return { erro: "Envie a foto em JPG, PNG ou WebP." };
  return { arquivo: foto, ext };
}

async function slugDeMembro(supabase: Supabase, nome: string) {
  const base = gerarSlug(nome);
  const { data, error } = await supabase.from("members").select("slug").like("slug", `${base}%`);
  if (error) throw new Error(`Supabase (members): ${error.message}`);
  return slugLivre(
    base,
    data.map((m) => m.slug),
  );
}

/** Envia a nova foto e aponta o cadastro para ela; depois apaga as outras da pasta. */
async function trocarFoto(
  supabase: Supabase,
  membroId: string,
  foto: { arquivo: Blob; ext: keyof typeof MIME_IMAGEM } | null,
): Promise<string | null> {
  const pasta = `membros/${membroId}`;
  let novo: string | null = null;
  if (foto) {
    novo = `${pasta}/${crypto.randomUUID()}.${foto.ext}`;
    const { error } = await supabase.storage
      .from("fotos")
      .upload(novo, foto.arquivo, { contentType: MIME_IMAGEM[foto.ext], upsert: false });
    if (error) {
      console.error("upload foto membro", error);
      return "Não foi possível enviar a foto. Tente de novo.";
    }
  }
  const { error } = await supabase.from("members").update({ foto_path: novo }).eq("id", membroId);
  if (error) {
    if (novo) await remover(supabase, "fotos", [novo]);
    return mensagemErro(error, "gravar foto do membro");
  }
  const antigas = (await listarPasta(supabase, "fotos", pasta)).map((f) => f.path).filter((p) => p !== novo);
  await remover(supabase, "fotos", antigas);
  return null;
}

/**
 * Sincroniza os cargos: apaga os que saíram do formulário, depois grava os demais
 * num único upsert. Se algo falhar no meio, nada que deveria ficar foi apagado.
 */
async function salvarCargos(supabase: Supabase, membroId: string, cargos: CargoForm[]) {
  const { data: atuais, error: erroAtuais } = await supabase.from("member_terms").select("id").eq("member_id", membroId);
  if (erroAtuais) return { erro: mensagemErro(erroAtuais, "ler cargos") };
  const existentes = new Set(atuais.map((t) => t.id));
  const linhas = cargos.map((c, ordem) => ({
    id: c.id && existentes.has(c.id) ? c.id : crypto.randomUUID(),
    member_id: membroId,
    gestao: c.gestao,
    cargo: c.cargo,
    diretoria_id: c.diretoria || null,
    nucleo_id: c.nucleo || null,
    ordem,
  }));
  const ficam = new Set(linhas.map((l) => l.id));
  const sairam = [...existentes].filter((id) => !ficam.has(id));
  if (sairam.length > 0) {
    const { error } = await supabase.from("member_terms").delete().in("id", sairam);
    if (error) return { erro: mensagemErro(error, "apagar cargos") };
  }
  if (linhas.length > 0) {
    const { error } = await supabase.from("member_terms").upsert(linhas, { onConflict: "id" });
    if (error) return { erro: mensagemErro(error, "gravar cargos") };
  }
  return {
    salvos: linhas.map((l) => ({
      id: l.id,
      gestao: l.gestao,
      cargo: l.cargo,
      diretoria: l.diretoria_id ?? "",
      nucleo: l.nucleo_id ?? "",
    })),
  };
}

// =============================================================================
// Criar e editar
// =============================================================================
export async function salvarMembro(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = String(formData.get("id") ?? "");
  const novo = id === "";
  if (!novo && !UUID.test(id)) return { status: "erro", mensagem: "Cadastro inválido. Recarregue a página." };

  const valores = valoresTexto(formData, CAMPOS);
  const parsed = membroSchema.safeParse(valores);
  const erros: Record<string, string> = parsed.success ? {} : primeiroErro(z.flattenError(parsed.error).fieldErrors);
  const cargos = lerCargos(valores.cargos);
  if ("erro" in cargos) erros.cargos = cargos.erro;
  const foto = await lerFoto(formData);
  if (foto && "erro" in foto) erros.foto = foto.erro;

  const status = valores.status === "alumni" ? "alumni" : "ativo";
  const papel = PAPEIS.find((p) => p === valores.acesso_papel) ?? null;
  if (novo && valores.acesso_papel && !papel) erros.acesso_papel = "Escolha o papel.";
  if (novo && papel && parsed.success && !parsed.data.email) {
    erros.email = "Para liberar o acesso, informe o e-mail da conta Google.";
  }
  if (!parsed.success || "erro" in cargos || (foto && "erro" in foto) || Object.keys(erros).length > 0) {
    return { status: "erro", mensagem: "Revise os campos destacados.", erros, valores };
  }

  const d = parsed.data;
  const dados = {
    nome: d.nome,
    curso: d.curso || null,
    linkedin: d.linkedin || null,
    gestao_trainee: d.gestao_trainee || null,
  };
  const supabase = await createClient();

  let membroId = id;
  if (novo) {
    const { data, error } = await supabase
      .from("members")
      .insert({ ...dados, slug: await slugDeMembro(supabase, d.nome), status })
      .select("id")
      .single();
    if (error) return { status: "erro", mensagem: mensagemErro(error, "criar membro"), valores };
    membroId = data.id;
  } else {
    const { data, error } = await supabase
      .from("members")
      .update(dados)
      .eq("id", id)
      .eq("anonimizado", false)
      .select("id");
    if (error) return { status: "erro", mensagem: mensagemErro(error, "salvar membro"), valores };
    if (data.length === 0) return { status: "erro", mensagem: "Cadastro não encontrado ou anonimizado." };
  }

  // Daqui em diante o cadastro existe: num membro novo, uma falha leva à edição com aviso.
  const falhas: string[] = [];
  const { error: erroPrivado } = await supabase
    .from("member_private")
    .upsert({ member_id: membroId, email_contato: d.email || null, telefone: d.telefone || null }, { onConflict: "member_id" });
  if (erroPrivado) falhas.push(mensagemErro(erroPrivado, "salvar contato"));

  const resultadoCargos = await salvarCargos(supabase, membroId, cargos.cargos);
  if ("erro" in resultadoCargos && resultadoCargos.erro) falhas.push(resultadoCargos.erro);

  if (foto || formData.get("remover_foto") === "1") {
    const erroFoto = await trocarFoto(supabase, membroId, foto);
    if (erroFoto) falhas.push(erroFoto);
  }

  let acessoFalhou = false;
  if (novo && papel && d.email) {
    const r = await liberarAcesso(supabase, d.email, papel, membroId);
    if (!r.ok) {
      console.error("liberar acesso ao criar membro", r.mensagem);
      acessoFalhou = true;
    }
  }

  updateTag(TAGS.members);
  if (novo) {
    const aviso = falhas.length > 0 ? "&erro=parcial" : acessoFalhou ? "&acesso=falhou" : "";
    redirect(`/area-restrita/membros/${membroId}?criado=1${aviso}`);
  }

  refresh();
  if (falhas.length > 0) return { status: "erro", mensagem: falhas.join(" "), valores };
  return {
    status: "ok",
    mensagem: "Alterações salvas.",
    valores: "salvos" in resultadoCargos ? { cargos: JSON.stringify(resultadoCargos.salvos) } : undefined,
  };
}

// =============================================================================
// Situação: alumni, reativar, excluir, anonimizar
// =============================================================================
function lerId(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  return UUID.test(id) ? id : null;
}

/** Desligamento normal: vira alumni (cargos e relatórios continuam) e perde o acesso. */
export async function moverParaAlumni(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = lerId(formData);
  if (!id) return { status: "erro", mensagem: "Cadastro inválido. Recarregue a página." };
  const supabase = await createClient();

  const erroAcesso = await revogarDosMembros(supabase, [id]);
  if (erroAcesso) return { status: "erro", mensagem: erroAcesso };
  const { error } = await supabase.from("members").update({ status: "alumni" }).eq("id", id);
  if (error) return { status: "erro", mensagem: mensagemErro(error, "mover para alumni") };

  updateTag(TAGS.members);
  refresh();
  return { status: "ok", mensagem: "Agora é alumni e não tem mais acesso à Área Restrita." };
}

export async function reativarMembro(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = lerId(formData);
  if (!id) return { status: "erro", mensagem: "Cadastro inválido. Recarregue a página." };
  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ status: "ativo" }).eq("id", id).eq("anonimizado", false);
  if (error) return { status: "erro", mensagem: mensagemErro(error, "reativar membro") };

  updateTag(TAGS.members);
  refresh();
  return { status: "ok", mensagem: "Membro ativo de novo. O acesso à Área Restrita se libera em Acessos." };
}

/** Lê o nome para conferir a confirmação digitada e conta as autorias de relatório. */
async function conferirConfirmacao(supabase: Supabase, id: string, formData: FormData) {
  const { data, error } = await supabase
    .from("members")
    .select("nome, anonimizado, report_authors(report_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) return { erro: mensagemErro(error, "ler membro") };
  if (!data) return { erro: "Cadastro não encontrado. Recarregue a página." };
  const digitado = String(formData.get("confirmacao") ?? "").trim().toLowerCase();
  if (digitado !== data.nome.trim().toLowerCase()) return { erro: "Digite o nome exatamente como aparece." };
  return { nome: data.nome, anonimizado: data.anonimizado, relatorios: data.report_authors.length };
}

/** Só para cadastro errado ou pedido de remoção (LGPD). Quem é autor de relatório é anonimizado. */
export async function excluirMembro(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = lerId(formData);
  if (!id) return { status: "erro", mensagem: "Cadastro inválido. Recarregue a página." };
  const supabase = await createClient();
  const conferido = await conferirConfirmacao(supabase, id, formData);
  if ("erro" in conferido) return { status: "erro", mensagem: conferido.erro };
  if (conferido.relatorios > 0) {
    return {
      status: "erro",
      mensagem: `${conferido.nome} é autor de ${plural(conferido.relatorios, "relatório", "relatórios")}. Use Anonimizar.`,
    };
  }

  const erroAcesso = await revogarDosMembros(supabase, [id]);
  if (erroAcesso) return { status: "erro", mensagem: erroAcesso };
  const fotos = (await listarPasta(supabase, "fotos", `membros/${id}`)).map((f) => f.path);
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) return { status: "erro", mensagem: mensagemErro(error, "excluir membro") };
  await remover(supabase, "fotos", fotos);

  updateTag(TAGS.members);
  redirect("/area-restrita/membros?excluido=1");
}

/**
 * Remove os dados pessoais e mantém a linha só como autor dos relatórios.
 * Pontos/strikes e cadastros de alumni ligados à pessoa também são apagados.
 */
export async function anonimizarMembro(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = lerId(formData);
  if (!id) return { status: "erro", mensagem: "Cadastro inválido. Recarregue a página." };
  const supabase = await createClient();
  const conferido = await conferirConfirmacao(supabase, id, formData);
  if ("erro" in conferido) return { status: "erro", mensagem: conferido.erro };
  if (conferido.anonimizado) return { status: "erro", mensagem: "Este cadastro já foi anonimizado." };

  const erroAcesso = await revogarDosMembros(supabase, [id]);
  if (erroAcesso) return { status: "erro", mensagem: erroAcesso };

  const fotos = (await listarPasta(supabase, "fotos", `membros/${id}`)).map((f) => f.path);
  const { error } = await supabase
    .from("members")
    .update({
      nome: "Ex-membro",
      slug: `ex-membro-${id.slice(0, 8)}`,
      curso: null,
      linkedin: null,
      foto_path: null,
      gestao_trainee: null,
      status: "alumni",
      anonimizado: true,
    })
    .eq("id", id);
  if (error) return { status: "erro", mensagem: mensagemErro(error, "anonimizar membro") };

  const passos = await Promise.all([
    supabase.from("member_private").update({ email_contato: null, telefone: null, user_id: null }).eq("member_id", id),
    supabase.from("hr_records").delete().eq("member_id", id),
    supabase.from("alumni_submissions").delete().eq("member_id", id),
  ]);
  for (const p of passos) if (p.error) console.error("anonimizar membro: limpeza", p.error);
  await remover(supabase, "fotos", fotos);

  updateTag(TAGS.members);
  redirect("/area-restrita/membros?anonimizado=1");
}

// =============================================================================
// Virar gestão (em lote)
// =============================================================================
/**
 * Abre a nova gestão: quem sai vira alumni e perde o acesso; quem continua leva
 * o(s) cargo(s) da gestão mais recente para a nova (opcional). Promoções e
 * cargos novos se ajustam depois, na ficha de cada membro.
 */
export async function virarGestao(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const valores = valoresTexto(formData, ["gestao", "copiar"]);
  const nova = gestao.safeParse(valores.gestao);
  if (!nova.success) {
    return {
      status: "erro",
      mensagem: "Revise os campos destacados.",
      erros: { gestao: nova.error.issues[0]?.message ?? "Confira a gestão." },
      valores,
    };
  }
  const saem = [...new Set(formData.getAll("sai").map(String))];
  if (saem.some((id) => !UUID.test(id))) return { status: "erro", mensagem: "Seleção inválida. Recarregue a página." };

  const supabase = await createClient();
  const { data: ativos, error: erroAtivos } = await supabase
    .from("members")
    .select("id, member_terms(gestao, cargo, diretoria_id, nucleo_id, ordem)")
    .eq("status", "ativo");
  if (erroAtivos) return { status: "erro", mensagem: mensagemErro(erroAtivos, "ler ativos"), valores };

  const idsAtivos = new Set(ativos.map((m) => m.id));
  if (saem.some((id) => !idsAtivos.has(id))) {
    return { status: "erro", mensagem: "A lista mudou desde que a página abriu. Recarregue e tente de novo." };
  }
  const maisRecente = ativos.flatMap((m) => m.member_terms.map((t) => t.gestao)).sort(compararGestao).at(-1);
  if (maisRecente && compararGestao(nova.data, maisRecente) <= 0) {
    return {
      status: "erro",
      mensagem: "Revise os campos destacados.",
      erros: { gestao: `A nova gestão precisa ser depois de ${maisRecente}.` },
      valores,
    };
  }

  // 1. Acesso de quem sai (pode esbarrar na trava do último admin: aí nada mudou ainda).
  const erroAcesso = await revogarDosMembros(supabase, saem);
  if (erroAcesso) return { status: "erro", mensagem: erroAcesso, valores };

  // 2. Quem sai vira alumni.
  if (saem.length > 0) {
    const { error } = await supabase.from("members").update({ status: "alumni" }).in("id", saem);
    if (error) return { status: "erro", mensagem: mensagemErro(error, "virar gestão: alumni"), valores };
  }

  // 3. Quem continua leva os cargos da própria gestão mais recente.
  let copiados = 0;
  if (valores.copiar === "on") {
    const linhas = ativos
      .filter((m) => !saem.includes(m.id))
      .flatMap((m) => {
        const ultima = m.member_terms.map((t) => t.gestao).sort(compararGestao).at(-1);
        return m.member_terms
          .filter((t) => t.gestao === ultima)
          .map((t) => ({
            member_id: m.id,
            gestao: nova.data,
            cargo: t.cargo,
            diretoria_id: t.diretoria_id,
            nucleo_id: t.nucleo_id,
            ordem: t.ordem,
          }));
      });
    if (linhas.length > 0) {
      const { error } = await supabase
        .from("member_terms")
        .upsert(linhas, { onConflict: "member_id,gestao,cargo", ignoreDuplicates: true });
      if (error) {
        updateTag(TAGS.members);
        return {
          status: "erro",
          mensagem: `${mensagemErro(error, "virar gestão: cargos")} Quem saía já virou alumni; tente de novo para copiar os cargos.`,
          valores,
        };
      }
      copiados = new Set(linhas.map((l) => l.member_id)).size;
    }
  }

  updateTag(TAGS.members);
  refresh();
  const partes = [`${plural(saem.length, "membro virou", "membros viraram")} alumni`];
  if (valores.copiar === "on") partes.push(`${plural(copiados, "membro levou", "membros levaram")} o cargo para ${nova.data}`);
  return { status: "ok", mensagem: `Gestão ${nova.data} aberta: ${partes.join("; ")}.` };
}

// =============================================================================
// Cadastros de alumni (formulário público)
// =============================================================================
/**
 * Leva a foto do envio (bucket privado) para o cadastro. O bucket `envios` aceita
 * upload anônimo pela API, então o conteúdo é conferido de novo antes de publicar.
 */
async function fotoDoEnvio(supabase: Supabase, path: string) {
  const { data, error } = await supabase.storage.from("envios").download(path);
  if (error || !data) {
    console.error("baixar foto do envio", error);
    return null;
  }
  if (data.size > IMAGEM_MAX) return null;
  const ext = extensaoImagem(await primeirosBytes(data));
  return ext ? { arquivo: data, ext } : null;
}

export async function aprovarEnvio(_anterior: FormState, formData: FormData): Promise<FormState> {
  const sessao = await exigirPapel(ADMIN);
  const id = lerId(formData);
  if (!id) return { status: "erro", mensagem: "Cadastro inválido. Recarregue a página." };
  const modo = formData.get("modo") === "mesclar" ? "mesclar" : "novo";
  const alvo = String(formData.get("membro") ?? "");
  if (modo === "mesclar" && !UUID.test(alvo)) {
    return { status: "erro", mensagem: "Escolha o membro com quem mesclar.", erros: { membro: "Escolha o membro." } };
  }

  const supabase = await createClient();
  const { data: envio, error: erroEnvio } = await supabase
    .from("alumni_submissions")
    .select("nome, curso, email, linkedin, gestao_trainee, foto_path")
    .eq("id", id)
    .eq("status", "pendente")
    .maybeSingle();
  if (erroEnvio) return { status: "erro", mensagem: mensagemErro(erroEnvio, "ler envio") };
  if (!envio) return { status: "erro", mensagem: "Este cadastro já foi revisado. Recarregue a página." };

  let membroId: string;
  if (modo === "novo") {
    const { data, error } = await supabase
      .from("members")
      .insert({
        slug: await slugDeMembro(supabase, envio.nome),
        nome: envio.nome,
        curso: envio.curso,
        linkedin: envio.linkedin,
        gestao_trainee: envio.gestao_trainee,
        status: "alumni",
      })
      .select("id")
      .single();
    if (error) return { status: "erro", mensagem: mensagemErro(error, "aprovar envio: criar") };
    membroId = data.id;
  } else {
    // Mescla: o que a pessoa enviou é mais recente; campos vazios no envio não apagam o cadastro.
    const atualizacao = {
      status: "alumni" as const,
      ...(envio.curso ? { curso: envio.curso } : {}),
      ...(envio.linkedin ? { linkedin: envio.linkedin } : {}),
      ...(envio.gestao_trainee ? { gestao_trainee: envio.gestao_trainee } : {}),
    };
    const { data, error } = await supabase
      .from("members")
      .update(atualizacao)
      .eq("id", alvo)
      .eq("anonimizado", false)
      .select("id");
    if (error) return { status: "erro", mensagem: mensagemErro(error, "aprovar envio: mesclar") };
    if (data.length === 0) return { status: "erro", mensagem: "Membro não encontrado. Recarregue a página." };
    membroId = alvo;
    // Quem volta como alumni não fica com acesso de quando era ativo.
    const erroAcesso = await revogarDosMembros(supabase, [membroId]);
    if (erroAcesso) console.error("aprovar envio: revogar acesso", erroAcesso);
  }

  const { error: erroPrivado } = await supabase
    .from("member_private")
    .upsert({ member_id: membroId, email_contato: envio.email }, { onConflict: "member_id" });
  if (erroPrivado) console.error("aprovar envio: contato", erroPrivado);

  let fotoRecusada = false;
  if (envio.foto_path) {
    const foto = await fotoDoEnvio(supabase, envio.foto_path);
    if (foto) {
      const erroFoto = await trocarFoto(supabase, membroId, foto);
      if (erroFoto) console.error("aprovar envio: foto", erroFoto);
    } else {
      fotoRecusada = true;
    }
  }

  const { error: erroRevisao } = await supabase
    .from("alumni_submissions")
    .update({
      status: "aprovado",
      member_id: membroId,
      reviewed_by: sessao.userId,
      reviewed_at: new Date().toISOString(),
      foto_path: null,
    })
    .eq("id", id);
  if (erroRevisao) console.error("aprovar envio: marcar revisado", erroRevisao);
  else if (envio.foto_path) await removerEnvio(supabase, envio.foto_path);

  updateTag(TAGS.members);
  redirect(`/area-restrita/membros/${membroId}?aprovado=1${fotoRecusada ? "&foto=recusada" : ""}`);
}

export async function rejeitarEnvio(_anterior: FormState, formData: FormData): Promise<FormState> {
  const sessao = await exigirPapel(ADMIN);
  const id = lerId(formData);
  if (!id) return { status: "erro", mensagem: "Cadastro inválido. Recarregue a página." };
  const supabase = await createClient();
  const { data: envio, error: erroEnvio } = await supabase
    .from("alumni_submissions")
    .select("foto_path")
    .eq("id", id)
    .eq("status", "pendente")
    .maybeSingle();
  if (erroEnvio) return { status: "erro", mensagem: mensagemErro(erroEnvio, "ler envio") };
  if (!envio) return { status: "erro", mensagem: "Este cadastro já foi revisado. Recarregue a página." };

  const { error } = await supabase
    .from("alumni_submissions")
    .update({ status: "rejeitado", reviewed_by: sessao.userId, reviewed_at: new Date().toISOString(), foto_path: null })
    .eq("id", id);
  if (error) return { status: "erro", mensagem: mensagemErro(error, "rejeitar envio") };

  // A foto do envio rejeitado não tem mais uso: sai do bucket (LGPD).
  if (envio.foto_path) await removerEnvio(supabase, envio.foto_path);
  refresh();
  return { status: "ok", mensagem: "Cadastro rejeitado." };
}

async function removerEnvio(supabase: Supabase, path: string) {
  const { error } = await supabase.storage.from("envios").remove([path]);
  if (error) console.error("remover foto do envio", path, error);
}
