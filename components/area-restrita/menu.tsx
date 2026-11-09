"use client";

import { LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { sair } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

type Props = { abas: { href: string; label: string }[]; email: string | null; papel: string };

/** Menu lateral da Área Restrita. As abas já chegam filtradas pelo papel (servidor). */
export function MenuAreaRestrita({ abas, email, papel }: Props) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {/* Celular: barra no topo com o menu em Sheet */}
      <div className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md lg:hidden">
        <Link href="/area-restrita" className="text-foreground" aria-label="Área Restrita, início">
          <Logo variante="simbolo" className="h-8" titulo="" />
        </Link>
        <span className="font-serif text-xl">Área Restrita</span>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Sheet open={aberto} onOpenChange={setAberto}>
            <SheetTrigger
              className="inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-secondary"
              aria-label="Abrir menu da Área Restrita"
            >
              <Menu className="size-5" aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(20rem,88vw)] border-border bg-background p-0">
              <SheetTitle className="sr-only">Menu da Área Restrita</SheetTitle>
              <SheetDescription className="sr-only">Abas disponíveis para o seu papel</SheetDescription>
              <Navegacao abas={abas} email={email} papel={papel} aoNavegar={() => setAberto(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop: coluna fixa */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border lg:block">
        <Navegacao abas={abas} email={email} papel={papel} />
      </aside>
    </>
  );
}

function Navegacao({ abas, email, papel, aoNavegar }: Props & { aoNavegar?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col px-4 pt-6 pb-6">
      <Link href="/" className="hidden px-2 text-foreground lg:block" aria-label="LMF UFU, voltar ao site">
        <Logo className="h-8" titulo="" />
      </Link>
      <nav aria-label="Área Restrita" className="mt-10 lg:mt-10">
        <ul className="flex flex-col gap-1">
          {abas.map((aba) => {
            const ativa = pathname === aba.href || pathname.startsWith(`${aba.href}/`);
            return (
              <li key={aba.href}>
                <Link
                  href={aba.href}
                  onClick={aoNavegar}
                  aria-current={ativa ? "page" : undefined}
                  className={cn(
                    "block rounded-[0.9rem_0.9rem_0.3rem_0.9rem] px-3 py-2.5 text-[0.9375rem] transition-colors",
                    ativa ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {aba.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto border-t border-border px-2 pt-4">
        <p className="truncate text-sm text-foreground" title={email ?? undefined}>
          {email ?? "Conta Google"}
        </p>
        <p className="text-xs text-muted-foreground">{papel}</p>
        <div className="mt-4 flex items-center gap-2">
          <form action={sair}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </form>
          <span className="hidden lg:inline-flex">
            <ThemeToggle />
          </span>
        </div>
      </div>
    </div>
  );
}
