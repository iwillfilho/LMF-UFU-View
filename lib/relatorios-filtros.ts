import type { Relatorio } from "@/lib/queries";

/** Filtros da página Relatórios, todos na URL para o link ser compartilhável. */
export type FiltrosRelatorios = { nucleo?: string; autor?: string; tipo?: "tese" | "iniciacao" };

function primeiro(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export function lerFiltros(sp: Record<string, string | string[] | undefined>): FiltrosRelatorios {
  const tipo = primeiro(sp.tipo);
  return {
    nucleo: primeiro(sp.nucleo) || undefined,
    autor: primeiro(sp.autor) || undefined,
    tipo: tipo === "tese" || tipo === "iniciacao" ? tipo : undefined,
  };
}

export function aplicarFiltros(relatorios: Relatorio[], f: FiltrosRelatorios) {
  return relatorios.filter(
    (r) =>
      (!f.nucleo || r.nucleo?.slug === f.nucleo) &&
      (!f.tipo || r.tipo === f.tipo) &&
      (!f.autor || r.autores.some((a) => a.slug === f.autor)),
  );
}

/** Monta /relatorios?... trocando só o que mudou. `extra` entra por último (ex.: membro do pop-up). */
export function hrefRelatorios(f: FiltrosRelatorios, mudancas: Partial<Record<keyof FiltrosRelatorios, string | null>> = {}, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  const final = { ...f, ...mudancas };
  for (const chave of ["nucleo", "tipo", "autor"] as const) {
    const valor = final[chave];
    if (valor) params.set(chave, valor);
  }
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
  const qs = params.toString();
  return qs ? `/relatorios?${qs}` : "/relatorios";
}
