import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Renova a sessão do Supabase e manda para o login quem abre a Área Restrita
 * sem estar logado. Não decide papéis: isso é feito em cada página e Server
 * Action (lib/auth.ts) e, por último, pela RLS.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([nome, valor]) => response.headers.set(nome, valor));
      },
    },
  });

  // Não coloque código entre createServerClient e getClaims (orientação do Supabase).
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (!logado && pathname.startsWith("/area-restrita")) {
    return redirecionar(request, response, "/login", `?next=${encodeURIComponent(pathname + search)}`);
  }
  if (logado && pathname === "/login" && !request.nextUrl.searchParams.has("erro")) {
    return redirecionar(request, response, "/area-restrita", "");
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/** Redireciona levando junto os cookies renovados, senão a pessoa perde a sessão. */
function redirecionar(request: NextRequest, response: NextResponse, pathname: string, search: string) {
  const destino = request.nextUrl.clone();
  destino.pathname = pathname;
  destino.search = search;
  const redirect = NextResponse.redirect(destino);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  redirect.headers.set("Cache-Control", "private, no-store");
  return redirect;
}

export const config = {
  // Só as rotas com sessão. As páginas públicas continuam estáticas.
  matcher: ["/area-restrita/:path*", "/login", "/auth/:path*"],
};
