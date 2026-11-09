/** Para onde a pessoa vai depois de entrar, quando não há destino válido. */
export const DESTINO_PADRAO = "/area-restrita/calendario";

/**
 * Valida o `?next=` do login contra open redirect. Só aceita caminhos
 * relativos dentro da Área Restrita: nada de `//evil.com`, `/\evil.com`,
 * `https://...` ou caracteres de controle.
 */
export function destinoSeguro(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f]/.test(next)) {
    return DESTINO_PADRAO;
  }
  let url: URL;
  try {
    url = new URL(next, "http://lmf.invalid");
  } catch {
    return DESTINO_PADRAO;
  }
  if (url.origin !== "http://lmf.invalid") return DESTINO_PADRAO;
  if (url.pathname !== "/area-restrita" && !url.pathname.startsWith("/area-restrita/")) return DESTINO_PADRAO;
  return `${url.pathname}${url.search}`;
}
