import { GerenciarRegistro } from "@/components/area-restrita/rh";
import { compararGestao, formatarData, plural } from "@/lib/format";
import { TIPO_REGISTRO } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";
import type { RegistroRH } from "@/lib/restrito";
import { cn } from "@/lib/utils";

/** Soma de pontos e de strikes de uma lista de lançamentos. */
export function totais(registros: RegistroRH[]) {
  const soma = (tipo: Enums<"hr_tipo">) =>
    registros.filter((r) => r.tipo === tipo).reduce((total, r) => total + r.valor, 0);
  return { pontos: soma("ponto"), strikes: soma("strike") };
}

export function Totais({ pontos, strikes }: { pontos: number; strikes: number }) {
  return (
    <span className="text-sm text-muted-foreground">
      {plural(pontos, "ponto", "pontos")} · {plural(strikes, "strike", "strikes")}
    </span>
  );
}

/** Histórico agrupado por gestão (mais recente primeiro). */
export function HistoricoRH({
  registros,
  mostrarAutor = false,
  admin = false,
}: {
  registros: RegistroRH[];
  mostrarAutor?: boolean;
  admin?: boolean;
}) {
  const gestoes = [...new Set(registros.map((r) => r.gestao))].sort(compararGestao).reverse();

  return (
    <div className="grid gap-10">
      {gestoes.map((gestao) => {
        const itens = registros.filter((r) => r.gestao === gestao);
        return (
          <section key={gestao} aria-labelledby={`gestao-${gestao}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border pb-2">
              <h3 id={`gestao-${gestao}`} className="font-sans text-lg font-normal">
                Gestão {gestao}
              </h3>
              <Totais {...totais(itens)} />
            </div>
            <ul className="divide-y divide-border">
              {itens.map((r) => (
                <li key={r.id} className="py-4">
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                    <span
                      className={cn(
                        "pill shrink-0",
                        r.tipo === "ponto" ? "bg-primary/15 text-ink-accent" : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {plural(r.valor, TIPO_REGISTRO[r.tipo][0], TIPO_REGISTRO[r.tipo][1])}
                    </span>
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="text-[0.9375rem] break-words whitespace-pre-line text-foreground">{r.motivo}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatarData(r.criadoEm, "curta")}
                        {mostrarAutor && r.autor ? ` · lançado por ${r.autor}` : null}
                      </p>
                    </div>
                  </div>
                  {admin ? <GerenciarRegistro registro={r} /> : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
