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

/**
 * Cores das séries da carteira (validadas para daltonismo e contraste nos dois temas):
 * carteira = marca (violeta no claro, lilás no escuro), Ibovespa = laranja, CDI = verde-água.
 */
export const coresCarteira =
  "[--serie-carteira:#8c14b9] [--serie-ibovespa:#eb6834] [--serie-cdi:#1baf7a] dark:[--serie-carteira:#c455ed] dark:[--serie-ibovespa:#d95926] dark:[--serie-cdi:#199e70]";
