"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

/**
 * Cliente do navegador com a sessão de quem está logado. Serve para os uploads
 * grandes (PDFs) irem direto ao Storage, sem passar pelo limite das Server Actions.
 */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient<Database>(url, key);
}
