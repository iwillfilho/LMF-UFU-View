import type { Membro } from "@/lib/queries";

/** Cargos que aparecem no organograma (Presidente, Vice-presidente, Diretor(a)...). */
export function ehLideranca(cargo: string) {
  return /^(presidente|vice|diretor)/i.test(cargo);
}

/** Membros ativos com cargo na gestão atual. */
export function membrosDaGestao(membros: Membro[], gestao: string | null) {
  return membros.filter((m) => m.status === "ativo" && m.atual && m.atual.gestao === gestao);
}

/** Lideranças da gestão, agrupadas pelo slug da diretoria. */
export function liderancasPorDiretoria(membros: Membro[], gestao: string | null) {
  const mapa = new Map<string, Membro[]>();
  for (const m of membrosDaGestao(membros, gestao)) {
    for (const c of m.cargos) {
      if (c.gestao !== gestao || !c.diretoriaSlug || !ehLideranca(c.cargo)) continue;
      mapa.set(c.diretoriaSlug, [...(mapa.get(c.diretoriaSlug) ?? []), m]);
    }
  }
  return mapa;
}

/** Texto curto do cargo atual para o cartão do membro. */
export function descricaoCargo(m: Membro) {
  if (!m.atual) return null;
  const { cargo, diretoria } = m.atual;
  if (/^(presidente|vice)/i.test(cargo)) return cargo;
  return diretoria ? `${cargo} · ${diretoria}` : cargo;
}
