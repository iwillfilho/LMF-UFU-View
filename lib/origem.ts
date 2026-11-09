import "server-only";

import { headers } from "next/headers";

/**
 * Origem usada nos redirects do login. Em produção vem de NEXT_PUBLIC_SITE_URL
 * (não confia no Host da requisição). Sem a variável (local e previews), usa o
 * Host; o Supabase só aceita destinos que estão na lista de redirect URLs.
 */
export async function origemDoSite(): Promise<string> {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL;
  if (configurada) return configurada.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("host") ?? "127.0.0.1:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("127.0.0.1") || host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
