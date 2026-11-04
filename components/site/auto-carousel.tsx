"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { Pause, Play } from "lucide-react";
import { Children, type ReactNode, useEffect, useMemo, useState } from "react";

/**
 * Carrossel automático simples (parceiros e equipe de cada núcleo).
 * Respeita prefers-reduced-motion e tem botão de pausar (WCAG 2.2.2).
 */
export function AutoCarousel({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const itens = Children.toArray(children);
  const [reduzir, setReduzir] = useState(false);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduzir(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const autoplayAtivo = !reduzir && itens.length > 1;
  const plugins = useMemo(
    () => (autoplayAtivo ? [Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })] : []),
    [autoplayAtivo],
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: itens.length > 1, align: "start", dragFree: true }, plugins);

  // Quando todos os itens cabem na tela o Embla tem 1 só posição e o plugin de
  // autoplay não inicializa (chamar play() nesse estado quebra a página).
  const [rola, setRola] = useState(false);
  useEffect(() => {
    if (!emblaApi) return;
    const atualizar = () => setRola(emblaApi.scrollSnapList().length > 1);
    atualizar();
    emblaApi.on("reInit", atualizar);
    return () => {
      emblaApi.off("reInit", atualizar);
    };
  }, [emblaApi]);

  function alternarPausa() {
    const autoplay = emblaApi?.plugins().autoplay;
    if (!autoplay || !rola) return;
    if (pausado) autoplay.play();
    else autoplay.stop();
    setPausado(!pausado);
  }

  return (
    <div role="region" aria-roledescription="carrossel" aria-label={rotulo}>
      <div className="overflow-hidden" ref={emblaRef}>
        <ul className="flex">
          {itens.map((item, i) => (
            <li key={i} className="min-w-0 shrink-0 grow-0 basis-[72%] pr-4 sm:basis-[46%]">
              {item}
            </li>
          ))}
        </ul>
      </div>
      {autoplayAtivo && rola ? (
        <button
          type="button"
          onClick={alternarPausa}
          className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          {pausado ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
          {pausado ? "Retomar" : "Pausar"} rolagem
        </button>
      ) : null}
    </div>
  );
}
