"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowUpRight, Car, ChevronLeft, ChevronRight } from "lucide-react";
import { Section } from "./section";

const CATEGORIES = [
  { label: "Vehículos Nuevos" },
  { label: "Vehículos Usados" },
  { label: "Camionetas" },
  { label: "Sedanes" },
  { label: "Coupés" },
  { label: "Descapotables" },
];

export function CategoriesScroller() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const node = scrollerRef.current;
    if (!node) return;
    const amount = node.clientWidth * 0.8;
    node.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <Section tone="light">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl tracking-tight">
          Explorá por categoría
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Categorías anteriores"
            className="flex size-9 items-center justify-center rounded-full border border-[#0d0d0d]/10 text-[#0d0d0d] transition-colors hover:bg-[var(--ultima-surface-container)]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Siguientes categorías"
            className="flex size-9 items-center justify-center rounded-full border border-[#0d0d0d]/10 text-[#0d0d0d] transition-colors hover:bg-[var(--ultima-surface-container)]"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto"
      >
        {CATEGORIES.map((category) => (
          <Link
            key={category.label}
            href="/inventory"
            className="group relative flex h-40 w-48 shrink-0 snap-start flex-col items-center justify-center gap-2 border border-[#0d0d0d]/10 bg-white p-4 text-center transition-colors hover:bg-[var(--ultima-surface-container)]"
          >
            <ArrowUpRight className="absolute top-3 right-3 size-4 text-[#0d0d0d]/40 transition-colors group-hover:text-[#0d0d0d]" />
            <Car className="size-10 text-[#0d0d0d]/30" strokeWidth={1} />
            <span className="font-heading text-sm tracking-wide text-[#0d0d0d]">
              {category.label}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
