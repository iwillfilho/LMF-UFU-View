import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * Cliente sem sessão (papel `anon`) para as páginas públicas.
 * Não lê cookies, então pode rodar dentro de funções com 'use cache'.
 * A RLS garante que ele só vê o conteúdo publicado.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (veja .env.example).",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // O cache é só o 'use cache' das funções em lib/queries.ts. Sem isto o Next
    // também guarda a resposta no fetch cache, que sobrevive entre builds e
    // fazia o build seguinte mostrar dados antigos.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
