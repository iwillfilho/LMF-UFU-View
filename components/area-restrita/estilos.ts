import { inputClasse } from "@/components/forms/field";
import { cn } from "@/lib/utils";

/**
 * Classes dos controles da Área Restrita. Ficam fora de arquivos "use client":
 * importadas de um deles, chegariam ao Server Component como referência de cliente.
 */
export const selectClasse = cn(inputClasse, "w-full border border-input");
export const botaoPrimario =
  "pill bg-primary px-6 py-3 text-base text-primary-foreground transition-colors hover:bg-plum disabled:opacity-60 dark:hover:bg-lilac dark:hover:text-galaxy";
export const botaoSecundario =
  "inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm hover:bg-secondary disabled:opacity-60";
