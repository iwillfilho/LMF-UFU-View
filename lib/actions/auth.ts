"use server";

import { redirect } from "next/navigation";

import { destinoSeguro } from "@/lib/auth-destino";
import { origemDoSite } from "@/lib/origem";
import { createClient } from "@/lib/supabase/server";

/** Inicia o login com Google (PKCE). O Supabase devolve a pessoa em /auth/callback. */
export async function entrarComGoogle(formData: FormData) {
  const destino = destinoSeguro(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  const origem = await origemDoSite();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origem}/auth/callback?next=${encodeURIComponent(destino)}` },
  });

  if (error || !data.url) {
    console.error("signInWithOAuth", error);
    redirect("/login?erro=falha");
  }
  redirect(data.url);
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
