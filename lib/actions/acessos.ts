"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { liberarAcesso, membroOcupado, mensagemErroAcesso } from "@/lib/acessos-servidor";
import type { FormState } from "@/lib/actions/form-state";
import { primeiroErro, valoresTexto } from "@/lib/actions/form-state";
import { exigirPapel, getSessao } from "@/lib/auth";
import { ADMIN, PAPEIS } from "@/lib/papeis";
import { createClient } from "@/lib/supabase/server";

/**
 * Acessos à Área Restrita: só Presidente e Diretor de RH (iguais às policies de access_grants).
 * access_grants é a fonte da verdade; os triggers do banco derivam user_roles e
 * ligam a conta ao cadastro em member_private. As regras de vínculo ficam em
 * lib/acessos-servidor.ts, compartilhadas com o cadastro de membros.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe o e-mail.")
  .max(254, "E-mail longo demais.")
  .pipe(z.email("Informe um e-mail válido."));

const concederSchema = z.object({
  email: emailSchema,
  papel: z.enum(PAPEIS, "Escolha o papel."),
});

/** Membro do formulário: "" (sem vínculo), um UUID, ou inválido (null). */
function lerMembro(valor: string): string | "" | null {
  if (valor === "") return "";
  return UUID.test(valor) ? valor : null;
}

/** Revogar o próprio acesso: volta ao início da Área Restrita, que confere os papéis de novo. */
async function sairSeFoiOProprio(email: string) {
  const sessao = await getSessao();
  if (sessao?.email?.toLowerCase() === email) redirect("/area-restrita");
}

export async function concederAcesso(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const valores = valoresTexto(formData, ["email", "papel", "membro"]);
  const parsed = concederSchema.safeParse(valores);
  const erros: Record<string, string> = parsed.success ? {} : primeiroErro(z.flattenError(parsed.error).fieldErrors);
  const membroForm = lerMembro(valores.membro);
  if (membroForm === null) erros.membro = "Escolha o membro de novo.";
  if (!parsed.success || membroForm === null || Object.keys(erros).length > 0) {
    return { status: "erro", mensagem: "Revise os campos destacados.", erros, valores };
  }

  const { email, papel } = parsed.data;
  const supabase = await createClient();
  const r = await liberarAcesso(supabase, email, papel, membroForm || null);
  if (!r.ok) {
    return r.campo
      ? { status: "erro", mensagem: "Revise os campos destacados.", erros: { [r.campo]: r.mensagem }, valores }
      : { status: "erro", mensagem: r.mensagem, valores };
  }

  refresh();
  return { status: "ok", mensagem: r.mensagem };
}

/** Troca (ou remove) o cadastro de membro ligado a um e-mail, em todos os papéis dele. */
export async function vincularMembro(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const valores = valoresTexto(formData, ["email", "membro"]);
  const email = emailSchema.safeParse(valores.email);
  const membro = lerMembro(valores.membro);
  if (!email.success) return { status: "erro", mensagem: "E-mail inválido. Recarregue a página." };
  if (membro === null) return { status: "erro", mensagem: "Escolha o membro de novo.", valores };

  const supabase = await createClient();
  if (membro) {
    const ocupado = await membroOcupado(supabase, membro, email.data);
    if (ocupado) return { status: "erro", mensagem: ocupado, valores };
  }
  const { data, error } = await supabase
    .from("access_grants")
    .update({ member_id: membro || null })
    .eq("email", email.data)
    .select("id");
  if (error) return { status: "erro", mensagem: mensagemErroAcesso(error, "vincular membro"), valores };
  if (data.length === 0) return { status: "erro", mensagem: "Acesso não encontrado. Recarregue a página." };

  refresh();
  return { status: "ok", mensagem: membro ? "Vínculo salvo." : "Vínculo removido." };
}

/** Remove um papel. Se for o último do e-mail, a pessoa perde o acesso na próxima página. */
export async function revogarPapel(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { status: "erro", mensagem: "Acesso inválido. Recarregue a página." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("access_grants").delete().eq("id", id).select("email");
  if (error) return { status: "erro", mensagem: mensagemErroAcesso(error, "revogar papel") };
  if (data.length === 0) return { status: "erro", mensagem: "Acesso não encontrado. Recarregue a página." };

  await sairSeFoiOProprio(data[0].email);
  refresh();
  return { status: "ok", mensagem: "Papel removido." };
}

/** Remove todos os papéis de um e-mail: a pessoa perde o acesso à Área Restrita. */
export async function revogarTudo(_anterior: FormState, formData: FormData): Promise<FormState> {
  await exigirPapel(ADMIN);
  const email = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!email.success) return { status: "erro", mensagem: "E-mail inválido. Recarregue a página." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("access_grants").delete().eq("email", email.data).select("id");
  if (error) return { status: "erro", mensagem: mensagemErroAcesso(error, "revogar acesso") };
  if (data.length === 0) return { status: "erro", mensagem: "Acesso não encontrado. Recarregue a página." };

  await sairSeFoiOProprio(email.data);
  refresh();
  return { status: "ok", mensagem: `Acesso de ${email.data} removido.` };
}
