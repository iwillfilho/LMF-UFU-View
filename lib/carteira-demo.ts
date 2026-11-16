/**
 * Carteira de DEMONSTRAÇÃO da aba Ferramenta (usada em apresentações do site).
 * Todos os números são fictícios: quantidades, preços e a série histórica são
 * gerados aqui, de forma determinística (mesma saída no servidor e no navegador,
 * sem Date.now()). Quando a ferramenta real existir, ela substitui este módulo.
 */

export type Posicao = {
  ticker: string;
  nome: string;
  setor: string;
  quantidade: number;
  precoMedio: number;
  precoAtual: number;
};

export type PosicaoCalculada = Posicao & { valor: number; peso: number; retorno: number };

export type PontoSerie = {
  /** ISO (aaaa-mm-dd), sexta-feira de cada semana. */
  data: string;
  carteira: number;
  ibovespa: number;
  cdi: number;
};

export type SerieId = "carteira" | "ibovespa" | "cdi";

export const SERIES: { id: SerieId; nome: string; curto: string }[] = [
  { id: "carteira", nome: "Carteira LMF", curto: "Carteira" },
  { id: "ibovespa", nome: "Ibovespa", curto: "Ibov" },
  { id: "cdi", nome: "CDI", curto: "CDI" },
];

const POSICOES: Posicao[] = [
  { ticker: "ITUB4", nome: "Itaú Unibanco PN", setor: "Financeiro", quantidade: 420, precoMedio: 31.8, precoAtual: 38.9 },
  { ticker: "BBAS3", nome: "Banco do Brasil ON", setor: "Financeiro", quantidade: 600, precoMedio: 27.4, precoAtual: 24.1 },
  { ticker: "PETR4", nome: "Petrobras PN", setor: "Petróleo e gás", quantidade: 500, precoMedio: 36.2, precoAtual: 33.7 },
  { ticker: "PRIO3", nome: "PRIO ON", setor: "Petróleo e gás", quantidade: 250, precoMedio: 41.5, precoAtual: 47.8 },
  { ticker: "VALE3", nome: "Vale ON", setor: "Mineração", quantidade: 260, precoMedio: 61.3, precoAtual: 58.9 },
  { ticker: "WEGE3", nome: "WEG ON", setor: "Bens industriais", quantidade: 300, precoMedio: 38.6, precoAtual: 45.2 },
  { ticker: "EQTL3", nome: "Equatorial ON", setor: "Energia elétrica", quantidade: 450, precoMedio: 30.1, precoAtual: 35.6 },
  { ticker: "RADL3", nome: "Raia Drogasil ON", setor: "Saúde", quantidade: 380, precoMedio: 25.9, precoAtual: 23.4 },
  { ticker: "TOTS3", nome: "TOTVS ON", setor: "Tecnologia", quantidade: 280, precoMedio: 33.7, precoAtual: 42.1 },
  { ticker: "RENT3", nome: "Localiza ON", setor: "Consumo", quantidade: 200, precoMedio: 44.8, precoAtual: 49.3 },
  { ticker: "IPCA35", nome: "Tesouro IPCA+ 2035", setor: "Renda fixa", quantidade: 8, precoMedio: 2980, precoAtual: 3215 },
  { ticker: "SELIC29", nome: "Tesouro Selic 2029", setor: "Caixa", quantidade: 1, precoMedio: 15000, precoAtual: 15800 },
];

export const POSICOES_CALCULADAS: PosicaoCalculada[] = (() => {
  const total = POSICOES.reduce((s, p) => s + p.quantidade * p.precoAtual, 0);
  return POSICOES.map((p) => {
    const valor = p.quantidade * p.precoAtual;
    return { ...p, valor, peso: valor / total, retorno: p.precoAtual / p.precoMedio - 1 };
  }).sort((a, b) => b.valor - a.valor);
})();

export const PATRIMONIO = POSICOES_CALCULADAS.reduce((s, p) => s + p.valor, 0);

/** Peso por setor, do maior para o menor. */
export const ALOCACAO_SETOR: { setor: string; valor: number; peso: number }[] = (() => {
  const mapa = new Map<string, number>();
  for (const p of POSICOES_CALCULADAS) mapa.set(p.setor, (mapa.get(p.setor) ?? 0) + p.valor);
  return [...mapa]
    .map(([setor, valor]) => ({ setor, valor, peso: valor / PATRIMONIO }))
    .sort((a, b) => b.valor - a.valor);
})();

// -----------------------------------------------------------------------------
// Série semanal de 12 meses (base 100 na primeira semana)
// -----------------------------------------------------------------------------

/** Gerador pseudoaleatório com semente fixa (mulberry32): mesma série sempre. */
function gerador(semente: number) {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normais(n: number, semente: number) {
  const r = gerador(semente);
  return Array.from({ length: n }, () => {
    const u = Math.max(r(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
  });
}

/** Ajusta o drift dos retornos log para fechar exatamente no retorno total pedido. */
function trajetoria(choques: number[], volSemanal: number, retornoTotal: number) {
  const ruido = choques.map((z) => z * volSemanal);
  const drift = (Math.log(1 + retornoTotal) - ruido.reduce((s, x) => s + x, 0)) / ruido.length;
  const valores = [100];
  for (const x of ruido) valores.push(valores.at(-1)! * Math.exp(drift + x));
  return valores;
}

const SEMANAS = 52;
const INICIO = Date.UTC(2025, 10, 14); // sexta, 14/11/2025

export const SERIE: PontoSerie[] = (() => {
  const mercado = normais(SEMANAS, 2026);
  const idio = normais(SEMANAS, 7);
  // Carteira: beta ~0,85 com o Ibovespa, mais risco próprio.
  const choquesCarteira = mercado.map((z, i) => 0.85 * z + 0.45 * idio[i]);
  const ibov = trajetoria(mercado, 0.024, 0.112);
  const carteira = trajetoria(choquesCarteira, 0.024, 0.214);
  const cdiSemanal = Math.pow(1.1465, 1 / SEMANAS);
  // Arredonda: exp/pow podem diferir na 13ª casa entre o Node e o navegador, e
  // qualquer diferença vira hydration mismatch nas coordenadas do gráfico.
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
  return ibov.map((v, i) => ({
    data: new Date(INICIO + i * 7 * 86_400_000).toISOString().slice(0, 10),
    carteira: r4(carteira[i]),
    ibovespa: r4(v),
    cdi: r4(100 * Math.pow(cdiSemanal, i)),
  }));
})();

export function retornoNoPeriodo(serie: PontoSerie[], id: SerieId) {
  return serie.at(-1)![id] / serie[0][id] - 1;
}

/** Volatilidade anualizada a partir dos retornos semanais. */
export function volatilidade(serie: PontoSerie[], id: SerieId) {
  const r = serie.slice(1).map((p, i) => Math.log(p[id] / serie[i][id]));
  const media = r.reduce((s, x) => s + x, 0) / r.length;
  const variancia = r.reduce((s, x) => s + (x - media) ** 2, 0) / (r.length - 1);
  return Math.sqrt(variancia * 52);
}

/** Maior queda do pico ao vale no período. */
export function quedaMaxima(serie: PontoSerie[], id: SerieId) {
  let pico = -Infinity;
  let pior = 0;
  for (const p of serie) {
    pico = Math.max(pico, p[id]);
    pior = Math.min(pior, p[id] / pico - 1);
  }
  return pior;
}

/** Data em ISO como na série (meio-dia UTC: o dia não muda no fuso de Brasília). */
export const DATA_POSICAO = SERIE.at(-1)!.data;

// -----------------------------------------------------------------------------
// Formatação (pt-BR)
// -----------------------------------------------------------------------------
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCurto = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pctSinal = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const num1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });
const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const formatar = {
  reais: (v: number) => brl.format(v),
  reaisCurto: (v: number) => brlCurto.format(v),
  pct: (v: number) => pct.format(v),
  pctSinal: (v: number) => pctSinal.format(v),
  /** Diferença em pontos percentuais (v em fração: 0,1 → "+10,0 p.p."). */
  pp: (v: number) => `${num1.format(v * 100)} p.p.`,
  dataCurta: (iso: string) => {
    const [a, m, d] = iso.split("-");
    return `${d}/${m}/${a.slice(2)}`;
  },
  dataLonga: (iso: string) => {
    const [a, m, d] = iso.split("-");
    return `${Number(d)} de ${meses[Number(m) - 1]}. de ${a}`;
  },
  mesAno: (iso: string) => {
    const [a, m] = iso.split("-");
    return `${meses[Number(m) - 1]}/${a.slice(2)}`;
  },
};
