"use client";

import { LockKeyhole, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { mainNav } from "@/lib/site-config";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { ThemeToggle } from "./theme";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Só aparece quando o Presidente ou o Diretor de RH abre o PS (site_settings.ps_aberto). */
function PsButton({
  visivel,
  ativo,
  onClick,
  className,
}: {
  visivel: boolean;
  ativo: boolean;
  onClick?: () => void;
  className?: string;
}) {
  if (!visivel) return null;
  return (
    <Link
      href="/processo-seletivo"
      onClick={onClick}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "pill bg-primary text-primary-foreground transition-colors hover:bg-plum dark:hover:bg-lilac dark:hover:text-galaxy",
        className,
      )}
    >
      Processo Seletivo
    </Link>
  );
}

export function SiteHeader({ psAberto }: { psAberto: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Pílula do item ativo: uma só, que desliza de um item para o outro. A posição
  // é medida no DOM (as larguras mudam com a fonte e com o tamanho da janela).
  useLayoutEffect(() => {
    const nav = navRef.current;
    const indicador = nav?.querySelector<HTMLElement>(".nav-indicador");
    if (!nav || !indicador) return;

    const medir = () => {
      const ativo = nav.querySelector<HTMLElement>('a[aria-current="page"]');
      const base = nav.getBoundingClientRect();
      const r = ativo?.getBoundingClientRect();
      if (!r || r.width === 0) {
        // Página fora do menu (ou menu escondido no celular): a pílula some onde está.
        indicador.style.opacity = "0";
        return;
      }
      indicador.style.transform = `translate(${r.left - base.left}px, ${r.top - base.top}px)`;
      indicador.style.width = `${r.width}px`;
      indicador.style.height = `${r.height}px`;
      indicador.style.opacity = "1";
    };

    medir();
    // A transição só liga depois da primeira posição, para a pílula não vir deslizando do canto.
    const quadro = requestAnimationFrame(() => nav.setAttribute("data-pronto", ""));
    const observador = new ResizeObserver(medir);
    observador.observe(nav);
    return () => {
      cancelAnimationFrame(quadro);
      observador.disconnect();
    };
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="shrink-0 text-foreground" aria-label="LMF UFU, página inicial">
          <Logo className="h-9 sm:h-10" titulo="" />
        </Link>

        <nav ref={navRef} aria-label="Principal" className="group/nav relative ml-auto hidden xl:block">
          <span aria-hidden className="nav-indicador" />
          <ul className="relative flex items-center gap-1">
            {mainNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "pill text-[0.875rem] transition-colors",
                      // Até a pílula ser medida, o próprio link carrega o fundo (sem piscar na carga).
                      active
                        ? "bg-secondary text-foreground group-data-[pronto]/nav:bg-transparent"
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
          <PsButton visivel={psAberto} ativo={pathname === "/processo-seletivo"} className="hidden sm:inline-flex" />
          {/* Sem sessão, o proxy manda para /login; logado, entra direto. Sem prefetch: é rota autenticada. */}
          <Link
            href="/area-restrita"
            prefetch={false}
            aria-label="Área restrita"
            title="Área restrita"
            className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LockKeyhole className="size-[1.15rem]" aria-hidden />
          </Link>
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
                <PsButton
                  visivel={psAberto}
                  ativo={pathname === "/processo-seletivo"}
                  onClick={() => setOpen(false)}
                  className="mt-8 self-start"
                />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
