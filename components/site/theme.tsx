"use client";

import { Moon, Sun } from "lucide-react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    />
  );
}

/** Alterna entre o tema escuro (padrão) e o claro. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // O servidor não sabe o tema salvo no navegador, então o rótulo é fixo
  // (evita divergência de hidratação); o ícone muda via classe .dark.
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      className={
        "inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground " +
        (className ?? "")
      }
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema claro/escuro"
    >
      {/* Os dois ícones são renderizados e trocados via CSS, evitando divergência de hidratação. */}
      <Sun className="hidden size-[1.15rem] dark:block" aria-hidden />
      <Moon className="size-[1.15rem] dark:hidden" aria-hidden />
    </button>
  );
}
