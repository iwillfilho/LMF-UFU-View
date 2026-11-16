"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Brilho da marca que acompanha o cursor com atraso. Fica dentro de uma seção
 * `relative overflow-hidden`; as classes de posição e tamanho vêm de fora.
 * Sem mouse ou com movimento reduzido, sobra só a deriva lenta do CSS.
 */
export function GlowVivo({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const area = el?.parentElement;
    if (!el || !area) return;

    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)");
    let alvoX = 0;
    let alvoY = 0;
    let x = 0;
    let y = 0;
    let quadro = 0;

    // O laço só roda enquanto o brilho ainda não alcançou o alvo.
    const passo = () => {
      x += (alvoX - x) * 0.06;
      y += (alvoY - y) * 0.06;
      el.style.setProperty("--gx", x.toFixed(4));
      el.style.setProperty("--gy", y.toFixed(4));
      quadro = Math.abs(alvoX - x) + Math.abs(alvoY - y) > 0.002 ? requestAnimationFrame(passo) : 0;
    };
    const mirar = (nx: number, ny: number) => {
      alvoX = nx;
      alvoY = ny;
      if (!quadro) quadro = requestAnimationFrame(passo);
    };
    const mover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || reduzir.matches) return;
      const r = area.getBoundingClientRect();
      mirar(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const sair = () => mirar(0, 0);

    area.addEventListener("pointermove", mover, { passive: true });
    area.addEventListener("pointerleave", sair);
    return () => {
      area.removeEventListener("pointermove", mover);
      area.removeEventListener("pointerleave", sair);
      cancelAnimationFrame(quadro);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className={cn("glow-vivo pointer-events-none absolute", className)}>
      <div className="galaxy-glow glow-deriva absolute inset-0" />
      {/* Núcleo mais quente, que "respira" devagar. */}
      <div className="glow-nucleo absolute inset-0" />
    </div>
  );
}

/**
 * Montado uma vez no layout público, com um único listener de cursor que:
 * - leva a luz `.luz-cursor` até o mouse, com um rastro curto, em qualquer página;
 * - grava a posição do cursor (--mx/--my) no cartão `[data-spot]` sob ele.
 * Os cartões continuam Server Components. No celular a luz fica parada (CSS).
 */
export function Ponteiro() {
  const luzRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const luz = luzRef.current;
    const ponto = luz?.firstElementChild as HTMLElement | null;
    if (!luz || !ponto) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Luz: interpolação até o cursor; o laço para quando ela alcança o alvo.
    let alvoX = 0;
    let alvoY = 0;
    let x = 0;
    let y = 0;
    let primeira = true;
    let quadroLuz = 0;
    const passoLuz = () => {
      x += (alvoX - x) * 0.12;
      y += (alvoY - y) * 0.12;
      ponto.style.setProperty("--lx", `${x.toFixed(1)}px`);
      ponto.style.setProperty("--ly", `${y.toFixed(1)}px`);
      quadroLuz = Math.abs(alvoX - x) + Math.abs(alvoY - y) > 0.5 ? requestAnimationFrame(passoLuz) : 0;
    };

    // Cartão sob o cursor: posição exata, um quadro por vez.
    let quadroSpot = 0;
    let ultimo: PointerEvent | null = null;
    const aplicarSpot = () => {
      quadroSpot = 0;
      const alvo = ultimo?.target instanceof Element ? ultimo.target.closest<HTMLElement>("[data-spot]") : null;
      if (!ultimo || !alvo) return;
      const r = alvo.getBoundingClientRect();
      alvo.style.setProperty("--mx", `${ultimo.clientX - r.left}px`);
      alvo.style.setProperty("--my", `${ultimo.clientY - r.top}px`);
    };

    const mover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      ultimo = e;
      if (!quadroSpot) quadroSpot = requestAnimationFrame(aplicarSpot);

      if (reduzir.matches) return;
      alvoX = e.clientX;
      alvoY = e.clientY;
      if (primeira) {
        // Acende já no lugar do cursor, sem atravessar a tela a partir do canto.
        primeira = false;
        x = alvoX;
        y = alvoY;
      }
      luz.setAttribute("data-ativa", "");
      if (!quadroLuz) quadroLuz = requestAnimationFrame(passoLuz);
    };
    const apagar = () => luz.removeAttribute("data-ativa");
    // Mouse saiu da janela (relatedTarget nulo).
    const sair = (e: PointerEvent) => {
      if (!e.relatedTarget) apagar();
    };
    // Toque em aparelho híbrido: a luz do mouse some até ele voltar.
    const tocar = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") apagar();
    };

    document.addEventListener("pointermove", mover, { passive: true });
    document.addEventListener("pointerout", sair);
    document.addEventListener("pointerdown", tocar, { passive: true });
    return () => {
      document.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerout", sair);
      document.removeEventListener("pointerdown", tocar);
      cancelAnimationFrame(quadroLuz);
      cancelAnimationFrame(quadroSpot);
    };
  }, []);

  return (
    <div ref={luzRef} aria-hidden className="luz-cursor">
      <span />
    </div>
  );
}
