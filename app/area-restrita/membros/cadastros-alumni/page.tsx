import type { Metadata } from "next";

import { EnvioPendente } from "@/components/area-restrita/envios-alumni";
import { Voltar } from "@/components/area-restrita/voltar";
import { exigirPapel } from "@/lib/auth";
import { plural } from "@/lib/format";
import { ADMIN } from "@/lib/papeis";
import { getEnviosPendentes, getMembrosRH } from "@/lib/restrito";

export const metadata: Metadata = { title: "Cadastros de alumni" };

export default async function Page() {
  await exigirPapel(ADMIN);
  const [envios, membros] = await Promise.all([getEnviosPendentes(), getMembrosRH()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <Voltar href="/area-restrita/membros" label="Membros" />
      <h1 className="text-title mt-6">Cadastros de alumni</h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Enviados pelo formulário público de ex-membros. Só entram no site depois de aprovados aqui.
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        {envios.length === 0 ? "Nenhum cadastro pendente." : `${plural(envios.length, "cadastro", "cadastros")} para revisar.`}
      </p>
      {envios.length > 0 ? (
        <ul className="mt-2 divide-y divide-border border-y border-border">
          {envios.map((e) => (
            <EnvioPendente key={e.id} envio={e} membros={membros} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
