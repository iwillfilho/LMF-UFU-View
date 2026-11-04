import { cn } from "@/lib/utils";

const variantes = {
  // Símbolo (águia) + "Liga de Mercado Financeiro" em duas linhas
  horizontal: { src: "/marca/logo-horizontal.png", ratio: 728 / 160 },
  // Logo completa com o slogan
  completa: { src: "/marca/logo-completa.png", ratio: 1264 / 189 },
  // Só a águia
  simbolo: { src: "/marca/simbolo.png", ratio: 489 / 428 },
} as const;

/**
 * Logo aplicada como máscara CSS: assume a cor do texto (`currentColor`),
 * então a mesma arte branca funciona no tema escuro e no claro.
 */
export function Logo({
  variante = "horizontal",
  className,
  titulo = "Liga do Mercado Financeiro da UFU",
}: {
  variante?: keyof typeof variantes;
  className?: string;
  titulo?: string;
}) {
  const { src, ratio } = variantes[variante];
  // titulo="" → decorativa (ex.: dentro de um link que já tem aria-label)
  const a11y = titulo ? { role: "img", "aria-label": titulo } : { "aria-hidden": true };
  return (
    <span
      {...a11y}
      className={cn("brand-mask", className)}
      style={{
        aspectRatio: ratio,
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
      }}
    />
  );
}
