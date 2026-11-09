import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * Cliente com a sessão de quem está logado (cookies). Usado só na Área
 * Restrita, no login e nas Server Actions dela; a RLS aplica o papel da pessoa.
 * Nunca use dentro de 'use cache': ele lê cookies.
 */
export async function createClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não gravam cookies. O proxy.ts renova a sessão
          // a cada requisição da Área Restrita, então dá para ignorar aqui.
        }
      },
    },
  });
}
