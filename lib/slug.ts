/** Slug a partir de um título: sem acentos, minúsculo, só letras/números e hífens (domínio public.slug). */
export function gerarSlug(texto: string, max = 70): string {
  const base = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return base || "publicacao";
}

/** Escolhe o primeiro slug livre: base, base-2, base-3… */
export function slugLivre(base: string, existentes: Iterable<string>): string {
  const usados = new Set(existentes);
  if (!usados.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidato = `${base}-${i}`;
    if (!usados.has(candidato)) return candidato;
  }
}
