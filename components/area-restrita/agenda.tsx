"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MODOS, type ModoAgenda, urlEmbedAgenda } from "@/lib/calendario";
import { cn } from "@/lib/utils";

type Agenda = { id: string; nome: string; googleId: string; cor: string };

const CHAVE = "lmf:area-restrita:agenda";

type Preferencias = { ocultas: string[]; modo: ModoAgenda };

function lerPreferencias(): Partial<Preferencias> {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Partial<Preferencias>) : {};
  } catch {
    return {};
  }
}

function salvarPreferencias(p: Preferencias) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {
    // Navegação anônima ou armazenamento bloqueado: a escolha vale só nesta visita.
  }
}

/**
 * Checkboxes das agendas + embed do Google Agenda com as marcadas.
 * Guarda as ocultas (e não as marcadas) para que uma agenda nova cadastrada
 * pela diretoria já apareça marcada para todo mundo.
 */
export function AgendaLmf({ agendas }: { agendas: Agenda[] }) {
  const [ocultas, setOcultas] = useState<string[]>([]);
  const [modo, setModo] = useState<ModoAgenda>("MONTH");
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    const aplicar = () => {
      const salvo = lerPreferencias();
      if (Array.isArray(salvo.ocultas)) setOcultas(salvo.ocultas.filter((id) => typeof id === "string"));
      if (salvo.modo && MODOS.some((m) => m.valor === salvo.modo)) setModo(salvo.modo);
      // No celular a visão de mês fica apertada: começa em lista.
      else if (window.matchMedia("(max-width: 639px)").matches) setModo("AGENDA");
      setCarregado(true);
    };
    aplicar();
  }, []);

  useEffect(() => {
    if (carregado) salvarPreferencias({ ocultas, modo });
  }, [ocultas, modo, carregado]);

  const visiveis = useMemo(() => agendas.filter((a) => !ocultas.includes(a.id)), [agendas, ocultas]);
  const src = useMemo(() => urlEmbedAgenda(visiveis, modo), [visiveis, modo]);

  function alternar(id: string) {
    setOcultas((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-8">
        <fieldset>
          <legend className="text-sm text-muted-foreground">Agendas</legend>
          <ul className="mt-3 flex flex-col gap-1">
            {agendas.map((a) => (
              <li key={a.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[0.9rem_0.9rem_0.3rem_0.9rem] px-3 py-2 hover:bg-secondary/60">
                  <input
                    type="checkbox"
                    checked={!ocultas.includes(a.id)}
                    onChange={() => alternar(a.id)}
                    className="size-4 shrink-0"
                    style={{ accentColor: a.cor }}
                  />
                  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.cor }} />
                  <span className="text-[0.9375rem]">{a.nome}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset>
          <legend className="text-sm text-muted-foreground">Visualização</legend>
          <div className="mt-3 flex gap-1">
            {MODOS.map((m) => (
              <button
                key={m.valor}
                type="button"
                aria-pressed={modo === m.valor}
                onClick={() => setModo(m.valor)}
                className={cn(
                  "min-h-10 rounded-full px-4 text-sm transition-colors",
                  modo === m.valor ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {m.rotulo}
              </button>
            ))}
          </div>
        </fieldset>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Eventos de agendas privadas só aparecem se a conta Google aberta neste navegador tiver acesso a elas.
        </p>
      </div>

      <div className="min-w-0">
        {visiveis.length === 0 ? (
          <p className="rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-dashed border-border p-6 text-muted-foreground">
            Marque ao menos uma agenda para ver os eventos.
          </p>
        ) : (
          <>
            {/* O Google não tem tema escuro no embed: no tema escuro a agenda é invertida. */}
            <div className="overflow-hidden rounded-[1.25rem_1.25rem_0.35rem_1.25rem] border border-border bg-white">
              <iframe
                key={src}
                src={src}
                title="Agenda da LMF"
                className="block h-[70dvh] min-h-[28rem] w-full dark:hue-rotate-180 dark:invert-[0.9]"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-ink-accent hover:underline"
            >
              Abrir a agenda em tela cheia
              <ExternalLink className="size-3.5" aria-hidden />
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
