"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { plural } from "@/lib/format";
import type { Membro } from "@/lib/queries";

/**
 * Pop-up de "currículo" de um membro, controlado por ?membro=<slug>.
 * O link é compartilhável e o botão voltar do navegador fecha o pop-up.
 * Precisa ficar dentro de <Suspense> porque lê os searchParams.
 */
export function MemberDialog({ membros }: { membros: Membro[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const porSlug = useMemo(() => new Map(membros.map((m) => [m.slug, m])), [membros]);
  const slug = searchParams.get("membro");
  const membro = slug ? porSlug.get(slug) : undefined;

  function fechar() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("membro");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <Dialog open={Boolean(membro)} onOpenChange={(aberto) => !aberto && fechar()}>
      {membro ? (
        <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[1.75rem_1.75rem_0.5rem_1.75rem] border border-border bg-card p-6 sm:max-w-lg sm:p-8">
          <div className="flex items-start gap-5">
            <Image
              src={membro.fotoUrl}
              alt=""
              width={96}
              height={96}
              className="size-24 shrink-0 rounded-[1.25rem_1.25rem_0.35rem_1.25rem] object-cover"
            />
            <div className="min-w-0 pt-1">
              <span className="pill bg-secondary text-secondary-foreground">
                {membro.status === "alumni" ? "Alumni" : "Membro ativo"}
              </span>
              <DialogTitle className="mt-3 font-serif text-3xl leading-tight font-normal">{membro.nome}</DialogTitle>
              <DialogDescription className="mt-1 text-[0.9375rem] text-muted-foreground">
                {membro.curso ?? "Curso não informado"}
              </DialogDescription>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 text-[0.9375rem]">
            <div>
              <dt className="text-sm text-muted-foreground">Gestão trainee</dt>
              <dd className="mt-0.5">{membro.gestaoTrainee ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Gestões como efetivo</dt>
              <dd className="mt-0.5">{membro.gestoesEfetivo ?? "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm text-muted-foreground">Cargos</dt>
              <dd className="mt-1">
                {membro.cargos.length === 0 ? (
                  "—"
                ) : (
                  <ul className="space-y-1">
                    {membro.cargos.map((c) => (
                      <li key={`${c.gestao}-${c.cargo}`} className="flex gap-3">
                        <span className="w-14 shrink-0 text-muted-foreground tabular-nums">{c.gestao}</span>
                        <span>
                          {c.cargo}
                          {c.diretoria ? ` · ${c.diretoria}` : ""}
                          {c.nucleo ? ` · Núcleo ${c.nucleo}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm text-muted-foreground">Relatórios publicados</dt>
              <dd className="mt-0.5">{plural(membro.relatorios, "relatório", "relatórios")}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {membro.relatorios > 0 ? (
              <Link
                href={`/relatorios?autor=${membro.slug}`}
                className="pill bg-primary px-5 py-2.5 text-[0.9375rem] text-primary-foreground transition-colors hover:bg-plum dark:hover:bg-lilac dark:hover:text-galaxy"
              >
                Ver relatórios
              </Link>
            ) : null}
            {membro.linkedin ? (
              <a
                href={membro.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[0.9375rem] underline-offset-4 hover:text-ink-accent hover:underline"
              >
                LinkedIn <ArrowUpRight className="size-4 opacity-60" aria-hidden />
              </a>
            ) : null}
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
