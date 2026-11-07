"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Nucleo } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Carrossel de núcleos da página inicial.
 * Autoplay só quando o usuário não pediu movimento reduzido; pausa ao interagir.
 */
export function NucleosCarousel({ nucleos }: { nucleos: Nucleo[] }) {
  const [reduzirMovimento, setReduzirMovimento] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduzirMovimento(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const plugins = useMemo(
    () => (reduzirMovimento ? [] : [Autoplay({ delay: 6000, stopOnInteraction: true, stopOnMouseEnter: true })]),
    [reduzirMovimento],
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" }, plugins);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect).off("reInit", onSelect);
    };
  }, [emblaApi]);

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div
      role="region"
      aria-roledescription="carrossel"
      aria-label="Núcleos de estudo"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {nucleos.map((n, i) => (
            <article
              key={n.slug}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${nucleos.length}: ${n.nome}`}
              className="min-w-0 shrink-0 grow-0 basis-full pr-6 md:basis-[78%] lg:basis-[62%]"
            >
              <div className="relative h-full overflow-hidden rounded-[2rem_2rem_0.5rem_2rem] border border-border bg-card p-8 sm:p-12">
                {n.area ? <span className="pill bg-secondary text-secondary-foreground">{n.area}</span> : null}
                <h3 className="mt-8 text-[clamp(4rem,2.5rem+6vw,8rem)] leading-[0.9] text-foreground">
                  {n.nome}
                </h3>
                <p className="mt-6 max-w-[48ch] text-lg text-muted-foreground">{n.descricao}</p>
                <Link
                  href={`/nucleos#${n.slug}`}
                  className="mt-10 inline-flex items-center gap-2 text-[0.9375rem] font-normal text-ink-accent underline-offset-4 hover:underline"
                >
                  Conhecer o núcleo {n.nome}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={prev}
          className="inline-flex size-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary"
          aria-label="Núcleo anterior"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={next}
          className="inline-flex size-11 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary"
          aria-label="Próximo núcleo"
        >
          <ArrowRight className="size-4" aria-hidden />
        </button>
        <div className="ml-2 flex">
          {nucleos.map((n, i) => (
            // Botão de 24px de altura (WCAG 2.5.8); a pílula visual é o span interno.
            <button
              key={n.slug}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Ir para ${n.nome}`}
              aria-current={selected === i ? "true" : undefined}
              className="group relative flex h-6 min-w-6 items-center justify-center px-1"
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  selected === i ? "w-8 bg-primary" : "w-3 bg-border group-hover:bg-muted-foreground",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
