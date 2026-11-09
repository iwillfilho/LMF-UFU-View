"use client";

import dynamic from "next/dynamic";

/**
 * O react-pdf (pdf.js) só roda no navegador: o visor é carregado sem SSR e
 * fica num chunk à parte, baixado apenas na página do Processo Seletivo.
 */
export const EditalPdf = dynamic(() => import("./edital-pdf-visor"), {
  ssr: false,
  loading: () => <p className="p-6 text-muted-foreground">Carregando o edital…</p>,
});
