import type { Metadata } from "next";

import { FormConceder, PessoaAcesso } from "@/components/area-restrita/acessos";
import { exigirPapel } from "@/lib/auth";
import { plural } from "@/lib/format";
import { ADMIN } from "@/lib/papeis";
import { getAcessos, getMembrosRH } from "@/lib/restrito";

export const metadata: Metadata = { title: "Acessos" };

export default async function Page() {
  const sessao = await exigirPapel(ADMIN);
  const [pessoas, membros] = await Promise.all([getAcessos(), getMembrosRH()]);
  const meuEmail = sessao.email?.toLowerCase();
  const pendentes = pessoas.filter((p) => !p.entrou).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <h1 className="text-title">Acessos</h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Quem entra na Área Restrita e o que cada um pode fazer. A pessoa só precisa entrar com a conta Google do
        e-mail liberado. Remover um acesso vale já na próxima página que ela abrir.
      </p>

      <section aria-labelledby="liberar" className="mt-12 max-w-2xl">
        <h2 id="liberar" className="text-3xl">
          Liberar acesso
        </h2>
        <div className="mt-6">
          <FormConceder membros={membros} />
        </div>
      </section>

      <section aria-labelledby="quem" className="mt-16 max-w-3xl">
        <h2 id="quem" className="text-3xl">
          Quem tem acesso
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {plural(pessoas.length, "pessoa", "pessoas")}
          {pendentes > 0 ? `, ${pendentes} ainda sem o primeiro login` : null}.
        </p>
        {pessoas.length === 0 ? (
          <p className="mt-6 text-muted-foreground">Nenhum acesso liberado ainda.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {pessoas.map((p) => (
              <PessoaAcesso key={p.email} pessoa={p} membros={membros} voce={p.email === meuEmail} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
