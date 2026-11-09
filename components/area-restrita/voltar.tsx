import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function Voltar({ href = "/area-restrita/publicacoes", label = "Publicações" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Link>
  );
}
