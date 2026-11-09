import { type NextRequest, NextResponse } from "next/server";

import { destinoSeguro } from "@/lib/auth-destino";
import { origemDoSite } from "@/lib/origem";
import { createClient } from "@/lib/supabase/server";

/**
 * Volta do Google. Troca o código pela sessão e segue para a Área Restrita.
 * Se o hook before_user_created barrou o e-mail, o Supabase chega aqui com
 * ?error=..., e a pessoa vê a mensagem de acesso no /login.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const origem = await origemDoSite();

  if (params.get("error")) {
    return NextResponse.redirect(`${origem}/login?erro=google`);
  }

  const code = params.get("code");
  if (!code) return NextResponse.redirect(`${origem}/login?erro=falha`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("exchangeCodeForSession", error.message);
    return NextResponse.redirect(`${origem}/login?erro=google`);
  }

  return NextResponse.redirect(`${origem}${destinoSeguro(params.get("next"))}`);
}
