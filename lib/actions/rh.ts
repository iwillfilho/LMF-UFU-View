"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/lib/actions/form-state";
import { primeiroErro, valoresTexto } from "@/lib/actions/form-state";
import { exigirPapel } from "@/lib/auth";
import { plural } from "@/lib/format";
import { TIPO_REGISTRO } from "@/lib/labels";
import { ADMIN, RH } from "@/lib/papeis";
import { createClient } from "@/lib/supabase/server";

/**
 * Pontos e strikes. Lançar: RH, Diretor de RH e Presidente.
 * Corrigir e excluir: só Presidente e Diretor de RH (iguais às policies de hr_records).
 * Quem lançou fica gravado em created_by pelo próprio banco.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CAMPOS = ["membro", "tipo", "valor", "gestao", "motivo"];

const registroSchema = z.object({
  tipo: z.enum(["ponto", "strike"], "Escolha ponto ou strike."),
  valor: z.coerce.number("Informe a quantidade.").int("Use um número inteiro.").min(1, "Use de 1 a 100.").max(100, "Use de 1 a 100."),
  gestao: z
    .string()
    .trim()
    .regex(/^\d{4}\.[12]$/, "Use o formato 2026.2.")
    .refine((g) => Number(g.slice(0, 4)) >= 2000 && Number(g.slice(0, 4)) <= 2100, "Confira o ano da gestão."),
  motivo: z.string().trim().min(3, "Descreva o motivo.").max(500, "Use no máximo 500 caracteres."),
});

function mensagemErro(error: { code?: string; message: string }, contexto: string) {
  console.error(contexto, error);
  if (error.code === "23503") return "Membro não encontrado. Recarregue a página.";
  if (error.code === "23514") return "Algum campo está fora do formato aceito.";
  if (error.code === "42501") return "Você não tem permissão para esta ação.";
  return "Não foi possível salvar agora. Tente de novo em instantes.";
}

function invalido(erros: Record<string, string>, valores: Record<string, string>): FormState {
  return { status: "erro", mensagem: "Revise os campos destacados.", erros, valores };
}

export async function lancarRegistro(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(RH);
  const valores = valoresTexto(formData, CAMPOS);
  const parsed = registroSchema.safeParse(valores);
  const erros: Record<string, string> = parsed.success ? {} : primeiroErro(z.flattenError(parsed.error).fieldErrors);
  if (!UUID.test(valores.membro)) erros.membro = "Escolha o membro.";
  if (!parsed.success || Object.keys(erros).length > 0) return invalido(erros, valores);

  const r = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hr_records")
    .insert({ member_id: valores.membro, tipo: r.tipo, valor: r.valor, gestao: r.gestao, motivo: r.motivo })
    .select("members(nome)")
    .single();
  if (error) return { status: "erro", mensagem: mensagemErro(error, "lançar registro"), valores };

  refresh();
  const [um, varios] = TIPO_REGISTRO[r.tipo];
  return {
    status: "ok",
    mensagem: `${plural(r.valor, um, varios)} para ${data.members?.nome ?? "o membro"} em ${r.gestao}.`,
  };
}

export async function corrigirRegistro(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { status: "erro", mensagem: "Lançamento inválido." };
  const valores = valoresTexto(formData, CAMPOS);
  const parsed = registroSchema.safeParse(valores);
  if (!parsed.success) return invalido(primeiroErro(z.flattenError(parsed.error).fieldErrors), valores);

  const r = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hr_records")
    .update({ tipo: r.tipo, valor: r.valor, gestao: r.gestao, motivo: r.motivo })
    .eq("id", id)
    .select("id");
  if (error) return { status: "erro", mensagem: mensagemErro(error, "corrigir registro"), valores };
  if (data.length === 0) return { status: "erro", mensagem: "Lançamento não encontrado. Recarregue a página." };

  refresh();
  return { status: "ok", mensagem: "Correção salva." };
}

export async function excluirRegistro(formData: FormData) {
  await exigirPapel(ADMIN);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("hr_records").delete().eq("id", id);
  if (error) {
    console.error("excluir registro", error);
    return;
  }
  refresh();
}
