import { NextResponse } from "next/server";

import { origemDoSite } from "@/lib/origem";
import { createClient } from "@/lib/supabase/server";

/**
 * Logado, mas sem nenhum papel (acesso revogado). Encerra a sessão aqui porque
 * Server Components não conseguem apagar cookies, e mostra o aviso no /login.
 */
export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${await origemDoSite()}/login?erro=sem-acesso`);
}
