import Image from "next/image";
import Link from "next/link";

import type { Membro } from "@/lib/queries";

/** Foto ao lado do nome e curso abaixo, em fonte menor (pedido do PDF). Abre o pop-up de currículo. */
export function MemberCard({ membro, href, detalhe }: { membro: Membro; href: string; detalhe?: string | null }) {
  return (
    <Link
      href={href}
      scroll={false}
      className="group flex items-center gap-4 rounded-[1.25rem_1.25rem_0.35rem_1.25rem] p-2 -m-2 transition-colors hover:bg-secondary"
    >
      <Image
        src={membro.fotoUrl}
        alt=""
        width={64}
        height={64}
        className="size-16 shrink-0 rounded-[1rem_1rem_0.3rem_1rem] object-cover"
      />
      <span className="min-w-0">
        <span className="block truncate text-[1.0625rem] text-foreground group-hover:text-ink-accent">{membro.nome}</span>
        <span className="block truncate text-sm text-muted-foreground">{membro.curso ?? "Curso não informado"}</span>
        {detalhe ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detalhe}</span> : null}
      </span>
    </Link>
  );
}
