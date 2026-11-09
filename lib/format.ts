const TZ = "America/Sao_Paulo";

const dataLonga = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
const dataCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ });

export function formatarData(iso: string | null | undefined, estilo: "longa" | "curta" = "longa") {
  if (!iso) return null;
  return (estilo === "longa" ? dataLonga : dataCurta).format(new Date(iso));
}

/** Ordena gestões no formato 2026.2. */
export function compararGestao(a: string, b: string) {
  return a.localeCompare(b, "en", { numeric: true });
}

const anoMes = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: TZ });

/** Gestão (semestre) de uma data no horário de Brasília: jan–jun → .1, jul–dez → .2. */
export function gestaoDe(data: Date) {
  const [ano, mes] = anoMes.format(data).split("-");
  return `${ano}.${Number(mes) <= 6 ? 1 : 2}`;
}

/** "2025.1 – 2026.2", ou só "2026.2" se for uma gestão. */
export function intervaloGestoes(gestoes: string[]) {
  if (gestoes.length === 0) return null;
  const ordenadas = [...gestoes].sort(compararGestao);
  const [primeira, ultima] = [ordenadas[0], ordenadas[ordenadas.length - 1]];
  return primeira === ultima ? primeira : `${primeira} – ${ultima}`;
}

export function plural(n: number, singular: string, pluralForma: string) {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}
