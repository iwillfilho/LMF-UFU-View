export type ModoAgenda = "MONTH" | "WEEK" | "AGENDA";

export const MODOS: { valor: ModoAgenda; rotulo: string }[] = [
  { valor: "MONTH", rotulo: "Mês" },
  { valor: "WEEK", rotulo: "Semana" },
  { valor: "AGENDA", rotulo: "Lista" },
];

/**
 * Monta a URL do embed oficial do Google Agenda com várias agendas.
 * Os IDs e as cores vêm do banco; URLSearchParams cuida da codificação.
 */
export function urlEmbedAgenda(agendas: { googleId: string; cor: string }[], modo: ModoAgenda): string {
  const params = new URLSearchParams({
    ctz: "America/Sao_Paulo",
    hl: "pt_BR",
    wkst: "1",
    mode: modo,
    showTitle: "0",
    showPrint: "0",
    showCalendars: "0",
    showTz: "0",
  });
  for (const { googleId, cor } of agendas) {
    params.append("src", googleId);
    params.append("color", /^#[0-9A-Fa-f]{6}$/.test(cor) ? cor : "#8C14B9");
  }
  return `https://calendar.google.com/calendar/embed?${params.toString()}`;
}
