/**
 * Validação de arquivos pelos primeiros bytes (magic numbers). O Content-Type
 * enviado pelo navegador não é confiável; estes testes olham o conteúdo real.
 */

export type ExtImagem = "jpg" | "png" | "webp";

export const MIME_IMAGEM: Record<ExtImagem, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export const IMAGEM_MAX = 5 * 1024 * 1024;
export const PDF_MAX = 20 * 1024 * 1024;

/** Quantos bytes ler do início do arquivo para as checagens abaixo. */
export const BYTES_ASSINATURA = 12;

export function extensaoImagem(b: Uint8Array): ExtImagem | null {
  const ascii = (de: number, ate: number) => String.fromCharCode(...b.slice(de, ate));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "png";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

/** Todo PDF começa com "%PDF-". */
export function ehPdf(b: Uint8Array): boolean {
  return b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === "%PDF-";
}

export async function primeirosBytes(arquivo: Blob): Promise<Uint8Array> {
  return new Uint8Array(await arquivo.slice(0, BYTES_ASSINATURA).arrayBuffer());
}
