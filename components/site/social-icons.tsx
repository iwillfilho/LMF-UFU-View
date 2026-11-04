import type { SVGProps } from "react";

/* O Lucide v1 removeu ícones de marcas; estes seguem o mesmo traço (24px, stroke 2). */

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10.5V17" />
      <path d="M8 7.25v.01" />
      <path d="M12 17v-3.75a2.25 2.25 0 0 1 4.5 0V17" />
      <path d="M12 10.5V17" />
    </svg>
  );
}
