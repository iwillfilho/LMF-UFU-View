import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { inputClasse } from "@/components/forms/field";
import { Logo } from "@/components/site/logo";
import { entrarComGoogle, entrarComSenha } from "@/lib/actions/auth";
import { loginComSenhaAtivo } from "@/lib/login-senha";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Entrar na Área Restrita",
  robots: { index: false, follow: false },
};

const ERROS: Record<string, string> = {
  "sem-acesso": "Você ainda não tem acesso à Área Restrita. Fale com o Diretor de RH.",
  google:
    "Não foi possível entrar com o Google. Se o seu e-mail ainda não foi liberado, fale com o Diretor de RH.",
  falha: "Não foi possível iniciar o login agora. Tente de novo em instantes.",
  senha: "E-mail ou senha incorretos. Confira e tente de novo; depois de várias tentativas, espere alguns minutos.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main id="conteudo" className="relative flex flex-1 items-center overflow-hidden">
      <div aria-hidden className="galaxy-glow pointer-events-none absolute -top-40 right-[-20%] h-[36rem] w-[60rem] opacity-70" />
      <div className="relative mx-auto w-full max-w-md px-4 py-16 sm:px-6">
        <Link href="/" className="inline-block text-foreground" aria-label="LMF UFU, página inicial">
          <Logo className="h-10" titulo="" />
        </Link>
        <h1 className="text-title mt-10">Área Restrita</h1>
        <p className="mt-4 text-muted-foreground">
          Entre com a conta Google que a diretoria liberou para você.
        </p>
        <Suspense fallback={<BotaoGoogle next="" />}>
          <Conteudo searchParams={searchParams} />
        </Suspense>
        <Link href="/" className="mt-10 inline-block text-[0.9375rem] underline-offset-4 hover:text-ink-accent hover:underline">
          Voltar ao site
        </Link>
      </div>
    </main>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const erro = typeof params.erro === "string" ? ERROS[params.erro] : undefined;
  const next = typeof params.next === "string" ? params.next : "";

  return (
    <>
      {erro ? (
        <p role="alert" className="mt-8 rounded-[1rem_1rem_0.35rem_1rem] border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {erro}
        </p>
      ) : null}
      <BotaoGoogle next={next} />
      {loginComSenhaAtivo() ? <FormSenha next={next} aberto={params.erro === "senha"} /> : null}
    </>
  );
}

function BotaoGoogle({ next }: { next: string }) {
  return (
    <form action={entrarComGoogle} className="mt-8">
      {/* O destino é validado de novo no servidor (lib/auth-destino.ts). */}
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        className="pill w-full justify-center bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum dark:hover:bg-lilac dark:hover:text-galaxy"
      >
        Entrar com Google
      </button>
    </form>
  );
}

/** Acesso provisório por e-mail e senha (só com LOGIN_COM_SENHA=1; ver lib/login-senha.ts). */
function FormSenha({ next, aberto }: { next: string; aberto: boolean }) {
  return (
    <details open={aberto} className="mt-6 text-[0.9375rem]">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Entrar com e-mail e senha</summary>
      <form action={entrarComSenha} className="mt-4 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="grid gap-1.5">
          <label htmlFor="login-email" className="text-sm">
            E-mail
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className={cn(inputClasse, "border border-input")}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="login-senha" className="text-sm">
            Senha
          </label>
          <input
            id="login-senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            required
            className={cn(inputClasse, "border border-input")}
          />
        </div>
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border px-5 hover:bg-secondary"
        >
          Entrar
        </button>
        <p className="text-sm text-muted-foreground">Acesso provisório, só para contas criadas pela diretoria.</p>
      </form>
    </details>
  );
}
