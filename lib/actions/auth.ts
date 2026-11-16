"use server";

import { redirect } from "next/navigation";

import { destinoSeguro } from "@/lib/auth-destino";
import { loginComSenhaAtivo } from "@/lib/login-senha";
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

/**
 * Login PROVISÓRIO com e-mail e senha, para quem ainda não consegue usar o Google
 * (ex.: e-mail liberado que não é conta Google). Só funciona com
 * LOGIN_COM_SENHA=1 (lib/login-senha.ts).
 * A conta e a senha são criadas pela Admin API (não há cadastro pelo site), e o
 * papel continua vindo de access_grants, como no login com Google.
 */
export async function entrarComSenha(formData: FormData) {
  const next = String(formData.get("next") ?? "");
  const voltar = (erro: string) =>
    redirect(`/login?erro=${erro}${next ? `&next=${encodeURIComponent(next)}` : ""}`);

  if (!loginComSenhaAtivo()) voltar("falha");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  if (!email || !senha || email.length > 254 || senha.length > 200) voltar("senha");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    // Mensagem única para e-mail inexistente, senha errada ou limite de tentativas.
    console.error("signInWithPassword", error.code ?? error.message);
    voltar("senha");
  }
  redirect(destinoSeguro(next));
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
