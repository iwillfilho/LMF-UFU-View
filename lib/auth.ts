import "server-only";

import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { type Papel, temPapel } from "@/lib/papeis";
import { createClient } from "@/lib/supabase/server";

/**
 * Camada de acesso da Área Restrita. Toda página e toda Server Action dela
 * chama exigirPapel() antes de ler ou gravar qualquer coisa. O proxy.ts só
 * renova a sessão; a RLS do banco é a última linha de defesa.
 */

export type Sessao = { userId: string; email: string | null; papeis: Papel[] };

/**
 * Lê a sessão e os papéis a cada requisição. Os papéis vêm de user_roles
 * (e não do JWT) para que revogar um acesso valha já na próxima página.
 * O cache() do React só evita repetir a consulta dentro da mesma requisição.
 */
export const getSessao = cache(async (): Promise<Sessao | null> => {
  // getClaims() compara a validade do token com a hora atual, o que o Next
  // proíbe em pré-renderização. connection() garante que a checagem da sessão
  // rode sempre na requisição real, nunca num prefetch pré-renderizado.
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const userId = data.claims.sub;
  const { data: roles, error: erroRoles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (erroRoles) throw new Error(`Supabase (user_roles): ${erroRoles.message}`);

  return {
    userId,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    papeis: roles.map((r) => r.role),
  };
});

/**
 * - sem sessão: vai para o login;
 * - logado sem nenhum papel (acesso revogado): encerra a sessão e mostra "sem acesso";
 * - sem o papel pedido: 404, para não revelar que a página existe.
 */
export async function exigirPapel(permitidos: readonly Papel[]): Promise<Sessao> {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");
  if (sessao.papeis.length === 0) redirect("/auth/sem-acesso");
  if (!temPapel(sessao.papeis, permitidos)) notFound();
  return sessao;
}
