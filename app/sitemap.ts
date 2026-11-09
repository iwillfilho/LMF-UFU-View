import type { MetadataRoute } from "next";

import { SUBPAGINAS_EVENTOS } from "@/lib/labels";
import { getSlugsPosts } from "@/lib/queries";
import { siteConfig } from "@/lib/site-config";

/** Rotas públicas fixas (as sub-páginas de /eventos vêm de SUBPAGINAS_EVENTOS). */
const ROTAS_FIXAS = [
  "/",
  "/equipe",
  "/equipe/alumni",
  "/equipe/alumni/cadastro",
  "/nucleos",
  "/competicoes",
  "/eventos",
  "/relatorios",
  "/nossa-historia",
  "/contato",
  "/processo-seletivo",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const eventos = Object.keys(SUBPAGINAS_EVENTOS).map((c) => `/eventos/${c}`);
  const posts = (await getSlugsPosts()).map((slug) => `/publicacoes/${slug}`);

  // Sem lastModified: new Date() quebraria o prerender (Cache Components).
  return [...ROTAS_FIXAS, ...eventos, ...posts].map((rota) => ({ url: `${siteConfig.url}${rota === "/" ? "" : rota}` }));
}
