import "server-only";

import type { Papel } from "@/lib/papeis";
import { ROTULO_PAPEL } from "@/lib/papeis";
import type { createClient } from "@/lib/supabase/server";

/**
 * Regras de access_grants usadas pelas Server Actions de Acessos e de Membros.
 * Quem chama já conferiu o papel (exigirPapel(ADMIN)); a RLS confere de novo.
 *
 * - Todos os papéis de um e-mail apontam para o mesmo membro (member_private.user_id
 *   é único; o trigger de sincronização falharia com dois vínculos).
 * - Um membro só pode estar ligado a um e-mail.
 * - O banco recusa remover o último Presidente/Diretor de RH (P0001).
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ErroPg = { code?: string; message: string };

export const ULTIMO_ADMIN =
  "A LMF precisa de pelo menos um Presidente ou Diretor de RH com acesso. Libere o acesso do sucessor antes de remover este.";

export function mensagemErroAcesso(error: ErroPg, contexto: string) {
  console.error(contexto, error);
  if (error.code === "P0001") return ULTIMO_ADMIN;
  if (error.code === "23505") return "Este e-mail já tem esse papel.";
  if (error.code === "23503") return "Membro não encontrado. Recarregue a página.";
  if (error.code === "23514") return "Confira o e-mail: use só letras minúsculas, sem espaços.";
  if (error.code === "42501") return "Você não tem permissão para esta ação.";
  return "Não foi possível salvar agora. Tente de novo em instantes.";
}

/** Mensagem de erro se o membro já estiver ligado a outro e-mail; null se estiver livre. */
export async function membroOcupado(supabase: Supabase, membro: string, email: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("access_grants")
    .select("email")
    .eq("member_id", membro)
    .neq("email", email)
    .limit(1);
  if (error) return mensagemErroAcesso(error, "conferir vínculo");
  if (data.length > 0) return `Este membro já está ligado ao e-mail ${data[0].email}.`;
  return null;
}

export type ResultadoAcesso =
  | { ok: true; mensagem: string }
  | { ok: false; mensagem: string; campo?: "membro" };

/**
 * Concede um papel a um e-mail (já normalizado). Sem membro (null), herda o vínculo
 * que o e-mail já tem; com membro, passa todos os papéis do e-mail para ele.
 */
export async function liberarAcesso(
  supabase: Supabase,
  email: string,
  papel: Papel,
  membroPedido: string | null,
): Promise<ResultadoAcesso> {
  const { data: existentes, error: erroExistentes } = await supabase
    .from("access_grants")
    .select("role, member_id")
    .eq("email", email);
  if (erroExistentes) return { ok: false, mensagem: mensagemErroAcesso(erroExistentes, "ler acessos") };
  if (existentes.some((g) => g.role === papel)) {
    return { ok: false, mensagem: `${email} já é ${ROTULO_PAPEL[papel]}.` };
  }

  const atual = existentes.find((g) => g.member_id)?.member_id ?? null;
  const membro = membroPedido ?? atual;

  if (membroPedido && membroPedido !== atual) {
    const ocupado = await membroOcupado(supabase, membroPedido, email);
    if (ocupado) return { ok: false, mensagem: ocupado, campo: "membro" };
    // Um único UPDATE: os triggers só ressincronizam no fim do comando, já com todos os papéis no novo membro.
    if (existentes.length > 0) {
      const { error } = await supabase.from("access_grants").update({ member_id: membroPedido }).eq("email", email);
      if (error) return { ok: false, mensagem: mensagemErroAcesso(error, "trocar vínculo") };
    }
  }

  const { error } = await supabase.from("access_grants").insert({ email, role: papel, member_id: membro });
  if (error) return { ok: false, mensagem: mensagemErroAcesso(error, "conceder acesso") };

  return {
    ok: true,
    mensagem:
      existentes.length > 0
        ? `${email} agora também é ${ROTULO_PAPEL[papel]}.`
        : `Acesso liberado para ${email}. A pessoa já pode entrar com essa conta Google.`,
  };
}

/** Remove todos os papéis ligados a estes membros (desligamento, exclusão, virar gestão). */
export async function revogarDosMembros(supabase: Supabase, membros: string[]): Promise<string | null> {
  if (membros.length === 0) return null;
  const { error } = await supabase.from("access_grants").delete().in("member_id", membros);
  return error ? mensagemErroAcesso(error, "revogar acesso dos membros") : null;
}
