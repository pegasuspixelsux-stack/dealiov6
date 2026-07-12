"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Section } from "./section";
import type { Brand } from "@/types";

export function BrandScroller({ brands }: { brands: Brand[] }) {
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

  if (brands.length === 0) return null;

  return (
    <Section tone="light">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl tracking-tight">
          Comprá por Marca
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
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/inventory?make=${encodeURIComponent(brand.name)}`}
            className="group relative h-40 w-48 shrink-0 snap-start overflow-hidden bg-white transition-colors hover:bg-[var(--ultima-surface-container)]"
          >
            <Image
              src={brand.logoUrl}
              alt={brand.name}
              fill
              className="object-contain p-4"
            />
          </Link>
        ))}
      </div>
    </Section>
  );
}
