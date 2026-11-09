import type { Categoria } from "@/lib/queries";

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  evento: "Evento",
  palestra: "Palestra",
  viagem: "Viagem",
  smf: "SMF",
  competicao: "Competição",
};

export const TIPO_RELATORIO_LABEL = { tese: "Tese", iniciacao: "Iniciação" } as const;

/** Sub-páginas de /eventos (slug da URL → categoria do banco). */
export const SUBPAGINAS_EVENTOS = {
  smf: { categoria: "smf", titulo: "SMF" },
  viagens: { categoria: "viagem", titulo: "Viagens" },
  palestras: { categoria: "palestra", titulo: "Palestras" },
} as const satisfies Record<string, { categoria: Categoria; titulo: string }>;

export type SubpaginaEventos = keyof typeof SUBPAGINAS_EVENTOS;

/** Categorias que aparecem na página Eventos (competições têm página própria). */
export const CATEGORIAS_EVENTOS: Categoria[] = ["evento", "palestra", "viagem", "smf"];

/** Tipos de lançamento do RH (hr_records.tipo): singular e plural. */
export const TIPO_REGISTRO = {
  ponto: ["ponto", "pontos"],
  strike: ["strike", "strikes"],
} as const;

/** Categorias de documento interno (documents.categoria), na ordem em que aparecem. */
export const CATEGORIA_DOCUMENTO = {
  estatuto: "Estatuto Social",
  regimento: "Regimento Interno",
  auxiliar: "Documentos auxiliares",
} as const;
