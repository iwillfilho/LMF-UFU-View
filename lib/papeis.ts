import type { Enums } from "@/lib/supabase/database.types";

export type Papel = Enums<"app_role">;

// Espelham os helpers private.* do banco (is_admin, can_publish, can_manage_hr, is_member).
export const ADMIN = ["presidente", "diretor_rh"] as const satisfies readonly Papel[];
export const PUBLICA = [...ADMIN, "editor"] as const satisfies readonly Papel[];
export const RH = [...ADMIN, "rh"] as const satisfies readonly Papel[];
export const TODOS = [...ADMIN, "rh", "editor", "membro"] as const satisfies readonly Papel[];

export function temPapel(papeis: readonly Papel[], permitidos: readonly Papel[]) {
  return papeis.some((p) => permitidos.includes(p));
}

/** Todos os papéis, do mais ao menos amplo (ordem de exibição). */
export const PAPEIS = ["presidente", "diretor_rh", "rh", "editor", "membro"] as const satisfies readonly Papel[];

export const ROTULO_PAPEL: Record<Papel, string> = {
  presidente: "Presidente",
  diretor_rh: "Diretor de RH",
  rh: "RH",
  editor: "Editor",
  membro: "Membro",
};

/** O que cada papel libera, para quem concede o acesso saber o que está dando. */
export const DESCRICAO_PAPEL: Record<Papel, string> = {
  presidente: "Administra tudo: acessos, membros, documentos, publicações e RH.",
  diretor_rh: "Administra tudo: acessos, membros, documentos, publicações e RH.",
  rh: "Lança pontos e strikes dos membros.",
  editor: "Publica posts e relatórios no site.",
  membro: "Vê o calendário, os documentos e os próprios pontos.",
};

export type Aba = { href: string; label: string; papeis: readonly Papel[] };

/** Abas da Área Restrita e quem vê cada uma. Cada página confere o papel de novo no servidor. */
export const ABAS: Aba[] = [
  { href: "/area-restrita/calendario", label: "Calendário", papeis: TODOS },
  { href: "/area-restrita/ferramenta", label: "Ferramenta", papeis: TODOS },
  { href: "/area-restrita/publicacoes", label: "Publicações", papeis: PUBLICA },
  { href: "/area-restrita/documentos", label: "Documentos", papeis: TODOS },
  { href: "/area-restrita/meus-pontos", label: "Meus pontos", papeis: TODOS },
  { href: "/area-restrita/rh", label: "RH", papeis: RH },
  { href: "/area-restrita/membros", label: "Membros", papeis: ADMIN },
  { href: "/area-restrita/acessos", label: "Acessos", papeis: ADMIN },
];
