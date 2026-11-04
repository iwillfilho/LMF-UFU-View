import type { NextConfig } from "next";

/** Imagens do Storage do Supabase (fotos de membros, capas de posts). */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
const supabaseLocal = supabaseUrl ? ["127.0.0.1", "localhost"].includes(supabaseUrl.hostname) : false;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    /**
     * Conteúdo publicado pela Área Restrita. Na Fase 4 cada mudança chama
     * updateTag(); estes 5 minutos cobrem edições feitas direto no Supabase.
     */
    conteudo: { stale: 300, revalidate: 300, expire: 86400 },
  },
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: supabaseUrl.protocol === "http:" ? "http" : "https",
            hostname: supabaseUrl.hostname,
            port: supabaseUrl.port,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
    // Só no Supabase local (127.0.0.1); em produção o host é público.
    dangerouslyAllowLocalIP: supabaseLocal,
  },
  experimental: {
    // Foto do cadastro de alumni: até 5 MB + folga do multipart.
    serverActions: { bodySizeLimit: "6mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
