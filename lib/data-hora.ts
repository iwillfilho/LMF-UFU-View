/**
 * Conversão entre <input type="datetime-local"> e timestamptz, sempre no
 * horário de Brasília (UTC−3; o Brasil não tem horário de verão desde 2019).
 */

const FUSO = "-03:00";

/** "2026-11-20T19:00" (horário de Brasília) → ISO com fuso. Vazio → null. */
export function deInputDataHora(valor: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null;
  const data = new Date(`${valor}:00${FUSO}`);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

/** timestamptz → "2026-11-20T19:00" no horário de Brasília. */
export function paraInputDataHora(iso: string | null): string {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(data)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
