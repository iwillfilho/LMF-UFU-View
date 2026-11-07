"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { mainNav } from "@/lib/site-config";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Só aparece quando o Presidente ou o Diretor de RH abre o PS (site_settings.ps_aberto). */
function PsButton({ visivel, url, className }: { visivel: boolean; url: string; className?: string }) {
  if (!visivel) return null;
  // Link externo (formulário do PS ou Linktree). Quando existir a página interna
  // /processo-seletivo (Fase 5), trocar por <Link href="/processo-seletivo">.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "pill bg-primary text-primary-foreground transition-colors hover:bg-plum dark:hover:bg-lilac dark:hover:text-galaxy",
        className,
      )}
    >
      Processo Seletivo
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

export function SiteHeader({ psAberto, psUrl }: { psAberto: boolean; psUrl: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="shrink-0 text-foreground" aria-label="LMF UFU, página inicial">
          <Logo className="h-9 sm:h-10" titulo="" />
        </Link>

        <nav aria-label="Principal" className="ml-auto hidden xl:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "pill text-[0.875rem] transition-colors",
                      active
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-2">
          <PsButton visivel={psAberto} url={psUrl} className="hidden sm:inline-flex" />
          <ThemeToggle />

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-secondary xl:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" aria-hidden />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(22rem,88vw)] border-border bg-background p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Páginas do site da LMF UFU</SheetDescription>
              <nav aria-label="Principal (celular)" className="flex h-full flex-col px-6 pt-16 pb-8">
                <ul className="flex flex-col">
                  {mainNav.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "block border-b border-border py-3.5 font-serif text-3xl transition-colors",
                            active ? "text-ink-accent italic" : "text-foreground hover:text-ink-accent",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <PsButton visivel={psAberto} url={psUrl} className="mt-8 self-start" />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
