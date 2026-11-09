import type { Metadata } from "next";
import Link from "next/link";

import { botaoPrimario, botaoSecundario, selectClasse } from "@/components/area-restrita/estilos";
import { inputClasse } from "@/components/forms/field";
import { exigirPapel } from "@/lib/auth";
import { compararGestao, plural } from "@/lib/format";
import { ADMIN, ROTULO_PAPEL } from "@/lib/papeis";
import {
  contarEnviosPendentes,
  getDiretoriasOpcoes,
  getMembrosAdmin,
  getNucleosOpcoes,
  type MembroAdmin,
} from "@/lib/restrito";
import { gerarSlug } from "@/lib/slug";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Membros" };

const SITUACOES = { ativos: "Ativos", alumni: "Alumni", todos: "Todos" } as const;
type Situacao = keyof typeof SITUACOES;

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim() : "";
}

/** Busca sem acento nem maiúscula, no nome e no e-mail. */
function confere(m: MembroAdmin, busca: string) {
  if (!busca) return true;
  const alvo = gerarSlug(`${m.nome} ${m.email ?? ""} ${m.acessoEmail ?? ""}`, 400);
  return gerarSlug(busca, 400)
    .split("-")
    .every((parte) => alvo.includes(parte));
}

export default async function Page({ searchParams }: PageProps<"/area-restrita/membros">) {
  await exigirPapel(ADMIN);
  const [membros, diretorias, nucleos, pendentes, sp] = await Promise.all([
    getMembrosAdmin(),
    getDiretoriasOpcoes(),
    getNucleosOpcoes(),
    contarEnviosPendentes(),
    searchParams,
  ]);

  const busca = texto(sp.busca);
  const situacao: Situacao = texto(sp.situacao) in SITUACOES ? (texto(sp.situacao) as Situacao) : "ativos";
  const gestoes = [...new Set(membros.flatMap((m) => m.cargos.map((c) => c.gestao)))].sort(compararGestao).reverse();
  const gestao = gestoes.includes(texto(sp.gestao)) ? texto(sp.gestao) : "";
  const diretoria = diretorias.some((d) => d.id === texto(sp.diretoria)) ? texto(sp.diretoria) : "";
  const nucleo = nucleos.some((n) => n.id === texto(sp.nucleo)) ? texto(sp.nucleo) : "";

  const filtrados = membros.filter(
    (m) =>
      (situacao === "todos" || (situacao === "ativos" ? m.status === "ativo" : m.status === "alumni")) &&
      confere(m, busca) &&
      // Gestão, diretoria e núcleo valem para o mesmo cargo.
      (!gestao && !diretoria && !nucleo
        ? true
        : m.cargos.some(
            (c) =>
              (!gestao || c.gestao === gestao) &&
              (!diretoria || c.diretoriaId === diretoria) &&
              (!nucleo || c.nucleoId === nucleo),
          )),
  );
  const filtrando = Boolean(busca || gestao || diretoria || nucleo || situacao !== "ativos");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <h1 className="text-title">Membros</h1>
      <p className="mt-4 max-w-[62ch] text-muted-foreground">
        Cadastro de membros e alumni que aparece nas páginas Equipe e Alumni do site, com foto, cargos por gestão e
        contato.
      </p>

      {sp.excluido ? (
        <p role="status" className="mt-6 text-ink-accent">
          Cadastro excluído.
        </p>
      ) : null}
      {sp.anonimizado ? (
        <p role="status" className="mt-6 text-ink-accent">
          Cadastro anonimizado.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href="/area-restrita/membros/novo" className={botaoPrimario}>
          Novo membro
        </Link>
        <Link href="/area-restrita/membros/virar-gestao" className={botaoSecundario}>
          Virar gestão
        </Link>
        <Link href="/area-restrita/membros/cadastros-alumni" className={cn(botaoSecundario, "gap-2")}>
          Cadastros de alumni
          {pendentes > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {pendentes}
              <span className="sr-only"> {pendentes === 1 ? "pendente" : "pendentes"}</span>
            </span>
          ) : null}
        </Link>
      </div>

      {/* Formulário GET: funciona sem JavaScript e deixa os filtros na URL. */}
      <form
        action="/area-restrita/membros"
        className="mt-10 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="grid gap-1.5 text-sm sm:col-span-2 lg:col-span-3">
          Buscar por nome ou e-mail
          <input type="search" name="busca" defaultValue={busca} className={cn(inputClasse, "border border-input")} />
        </label>
        <label className="grid gap-1.5 text-sm">
          Situação
          <select name="situacao" defaultValue={situacao} className={selectClasse}>
            {Object.entries(SITUACOES).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          Gestão
          <select name="gestao" defaultValue={gestao} className={selectClasse}>
            <option value="">Todas</option>
            {gestoes.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          Diretoria
          <select name="diretoria" defaultValue={diretoria} className={selectClasse}>
            <option value="">Todas</option>
            {diretorias.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          Núcleo
          <select name="nucleo" defaultValue={nucleo} className={selectClasse}>
            <option value="">Todos</option>
            {nucleos.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nome}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
          <button type="submit" className={botaoSecundario}>
            Filtrar
          </button>
          {filtrando ? (
            <Link href="/area-restrita/membros" className="inline-flex min-h-11 items-center px-3 text-sm underline-offset-4 hover:underline">
              Limpar
            </Link>
          ) : null}
        </div>
      </form>

      <p className="mt-6 text-sm text-muted-foreground" role="status">
        {plural(filtrados.length, "cadastro", "cadastros")}
        {filtrando ? " com estes filtros" : " ativos"}.
      </p>

      {filtrados.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Ninguém encontrado.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-[0.9375rem]">
            <caption className="sr-only">Membros</caption>
            <thead className="border-b border-border text-sm text-muted-foreground">
              <tr>
                <th scope="col" className="py-3 pr-4 font-normal">
                  Nome
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Cargo mais recente
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Situação
                </th>
                <th scope="col" className="py-3 pl-4 font-normal">
                  Acesso
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.map((m) => (
                <tr key={m.id}>
                  <th scope="row" className="py-2 pr-4 font-normal">
                    <Link
                      href={`/area-restrita/membros/${m.id}`}
                      className="inline-flex min-h-10 flex-col justify-center underline-offset-4 hover:underline"
                    >
                      {m.nome}
                      {m.email ? <span className="text-sm text-muted-foreground">{m.email}</span> : null}
                    </Link>
                  </th>
                  <td className="px-4 py-2">
                    {m.atual ? (
                      <>
                        {m.atual.cargo}
                        <span className="block text-sm text-muted-foreground">
                          {[m.atual.diretoria ?? m.atual.nucleo, m.atual.gestao].filter(Boolean).join(" · ")}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {m.anonimizado ? "Anonimizado" : m.status === "ativo" ? "Ativo" : "Alumni"}
                  </td>
                  <td className="py-2 pl-4 text-sm">
                    {m.papeis.length > 0 ? (
                      m.papeis.map((p) => ROTULO_PAPEL[p]).join(", ")
                    ) : (
                      <span className="text-muted-foreground">Sem acesso</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
