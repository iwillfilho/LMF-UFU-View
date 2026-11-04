/** Buckets públicos do Storage (ver supabase/migrations/*_storage.sql). */
export type PublicBucket = "relatorios" | "fotos" | "site";

/** URL pública de um arquivo do Storage, ou null se não houver arquivo. */
export function publicUrl(bucket: PublicBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${bucket}/${encoded}`;
}

export const FOTO_PADRAO = "/imagens/foto-perfil-generica.jpg";
export const BANNER_PADRAO = "/imagens/nucleo-generica.avif";
