"use client";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// Precisa ficar no mesmo módulo que usa <Document>/<Page> (orientação do react-pdf).
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const botao =
  "inline-flex size-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40";

/** Mostra o edital página a página, na largura da coluna. */
export default function VisorEdital({ url }: { url: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState<number | null>(null);
  const [paginas, setPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.floor(entrada.contentRect.width)));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div>
      <div ref={caixa} className="overflow-hidden rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-border bg-white">
        <Document
          file={url}
          externalLinkTarget="_blank"
          onLoadSuccess={({ numPages }) => {
            setPaginas(numPages);
            setPagina(1);
          }}
          loading={<p className="p-6 text-neutral-600">Carregando o edital…</p>}
          error={
            <p role="alert" className="p-6 text-neutral-700">
              Não foi possível exibir o edital aqui. Use o botão “Baixar edital”.
            </p>
          }
        >
          {largura ? <Page pageNumber={pagina} width={largura} /> : null}
        </Document>
      </div>

      {paginas > 1 ? (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className={botao}
            onClick={() => setPagina((p) => p - 1)}
            disabled={pagina <= 1}
            aria-label="Página anterior do edital"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
            Página {pagina} de {paginas}
          </p>
          <button
            type="button"
            className={botao}
            onClick={() => setPagina((p) => p + 1)}
            disabled={pagina >= paginas}
            aria-label="Próxima página do edital"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
