import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { exigirPapel } from "@/lib/auth";
import { plural } from "@/lib/format";
import { ADMIN } from "@/lib/papeis";
import { getResumoConteudo } from "@/lib/restrito";

export const metadata: Metadata = { title: "Conteúdo" };

export default async function Page() {
  await exigirPapel(ADMIN);
  const n = await getResumoConteudo();
  const secoes = [
    { href: "nucleos", titulo: "Núcleos", qtd: plural(n.nucleos, "núcleo", "núcleos"), onde: "Página Núcleos, carrossel do início, filtros de relatório e cargos." },
    { href: "diretorias", titulo: "Diretorias", qtd: plural(n.diretorias, "diretoria", "diretorias"), onde: "Organograma da página Equipe e cargos dos membros." },
    { href: "parceiros", titulo: "Parceiros", qtd: plural(n.parceiros, "parceiro", "parceiros"), onde: "Rodapé (institucionais) e carrossel de cada núcleo." },
    { href: "historia", titulo: "Nossa História", qtd: plural(n.historia, "seção", "seções"), onde: "Página Nossa História: períodos, textos, fotos e conquistas." },
    { href: "processo-seletivo", titulo: "Processo Seletivo", qtd: `${n.psAberto ? "Inscrições abertas" : "Inscrições fechadas"} · ${plural(n.etapas, "etapa", "etapas")}`, onde: "Botão Processo Seletivo no topo do site, edital, formulário e etapas." },
    { href: "calendarios", titulo: "Calendários", qtd: plural(n.calendarios, "agenda", "agendas"), onde: "Agendas do Google que aparecem na aba Calendário." },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <h1 className="text-title">Conteúdo</h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Textos, imagens e listas fixas do site. As mudanças aparecem no site assim que são salvas.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {secoes.map((s) => (
          <li key={s.href}>
            <Link
              href={`/area-restrita/conteudo/${s.href}`}
              className="group flex h-full flex-col gap-2 rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-border p-5 hover:bg-secondary/40"
            >
              <span className="flex items-center justify-between gap-3 text-xl">
                {s.titulo}
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
              <span className="text-sm text-ink-accent">{s.qtd}</span>
              <span className="text-sm text-muted-foreground">{s.onde}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
