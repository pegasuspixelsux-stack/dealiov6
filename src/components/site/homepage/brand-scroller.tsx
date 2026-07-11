"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Section } from "./section";

const BRANDS = [
  { label: "Toyota" },
  { label: "Honda" },
  { label: "Ford" },
  { label: "Chevrolet" },
  { label: "BMW" },
  { label: "Mercedes-Benz" },
  { label: "Audi" },
  { label: "Volkswagen" },
  { label: "Nissan" },
  { label: "Hyundai" },
];

export function BrandScroller() {
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
          Vehículos Nuevos
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Marcas anteriores"
            className="flex size-9 items-center justify-center rounded-full border border-[#0d0d0d]/10 text-[#0d0d0d] transition-colors hover:bg-[var(--ultima-surface-container)]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Siguientes marcas"
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
        {BRANDS.map((brand) => (
          <Link
            key={brand.label}
            href={`/inventory?make=${encodeURIComponent(brand.label)}`}
            className="group flex h-40 w-48 shrink-0 snap-start flex-col items-center justify-center gap-3 border border-[#0d0d0d]/10 bg-white p-4 text-center transition-colors hover:bg-[var(--ultima-surface-container)]"
          >
            <span className="flex size-14 items-center justify-center rounded-full border border-[#0d0d0d]/15 font-heading text-lg text-[#0d0d0d]/60 transition-colors group-hover:border-[#0d0d0d]/40 group-hover:text-[#0d0d0d]">
              {brand.label
                .split(/[\s-]+/)
                .map((word) => word.charAt(0))
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <span className="font-heading text-sm tracking-wide text-[#0d0d0d]">
              {brand.label}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
