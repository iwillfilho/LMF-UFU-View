/**
 * Configuração estática do site (menu, contatos, endereço).
 * Se o PS está aberto vem de `site_settings.ps_aberto` (lib/queries.ts).
 */
export const siteConfig = {
  nome: "LMF UFU",
  nomeCompleto: "Liga do Mercado Financeiro da UFU",
  slogan: "Criada por estudantes, reconhecida pelo mercado.",
  descricao:
    "Liga do Mercado Financeiro da UFU: formação de analistas para o mercado financeiro com núcleos de Asset, Equity e Quant, relatórios de investimento, eventos e competições.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://lmfufu.com.br",
  contato: {
    email: "ligamf.ufu@gmail.com",
    instagram: "https://www.instagram.com/lmf.ufu/",
    linkedin: "https://www.linkedin.com/company/lmf.ufu/",
    linktree: "https://linktr.ee/lmf_ufu",
    endereco: "Av. João Naves de Ávila, 2121 - Santa Mônica, Uberlândia - MG, 38408-100",
  },
} as const;

export type NavItem = { href: string; label: string };

/** Menu principal. O Processo Seletivo fica fora: aparece só como botão. */
export const mainNav: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/equipe", label: "Equipe" },
  { href: "/nucleos", label: "Núcleos" },
  { href: "/competicoes", label: "Competições" },
  { href: "/eventos", label: "Eventos" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/nossa-historia", label: "Nossa História" },
  { href: "/contato", label: "Contato" },
];
