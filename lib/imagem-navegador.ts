/**
 * Prepara imagens no navegador antes de enviar: a foto de membro vira um
 * quadrado; banners, logos e fotos da história só são reduzidos. Tudo sai em
 * WebP (com transparência), então o upload fica pequeno. O servidor confere o
 * conteúdo de novo.
 */

const LADO = 640;
const QUALIDADE = 0.85;

/**
 * Recorte quadrado. Em foto vertical, o quadrado fica um pouco acima do centro
 * (20% da sobra), onde costuma estar o rosto; em foto horizontal, centralizado.
 */
export function recorteQuadrado(largura: number, altura: number) {
  const lado = Math.min(largura, altura);
  return {
    x: Math.round((largura - lado) / 2),
    y: Math.round((altura - lado) * (altura > largura ? 0.2 : 0.5)),
    lado,
  };
}

export async function fotoQuadrada(arquivo: File): Promise<Blob> {
  // imageOrientation aplica a rotação do EXIF (fotos de celular).
  const imagem = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  const { x, y, lado } = recorteQuadrado(imagem.width, imagem.height);
  const destino = Math.min(LADO, lado);

  const canvas = document.createElement("canvas");
  canvas.width = destino;
  canvas.height = destino;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imagem, x, y, lado, lado, 0, 0, destino, destino);
  imagem.close();

  return paraWebp(canvas);
}

/** Reduz para caber em maxLado × maxLado, sem cortar nem ampliar. */
export async function imagemReduzida(arquivo: File, maxLado: number): Promise<Blob> {
  const imagem = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, maxLado / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagem.width * escala);
  canvas.height = Math.round(imagem.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
  imagem.close();
  return paraWebp(canvas);
}

// Navegador sem encoder WebP (Safari antigo) devolve PNG, que o servidor também aceita.
async function paraWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALIDADE));
  if (!blob) throw new Error("Não foi possível processar a imagem");
  return blob;
}
