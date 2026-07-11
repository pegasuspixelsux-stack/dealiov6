import Link from "next/link";
import { ArrowUpRight, Car } from "lucide-react";
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
  return (
    <Section tone="light">
      <h2 className="font-heading mb-6 text-2xl lowercase tracking-tight">
        Explorá por categoría
      </h2>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
        {CATEGORIES.map((category) => (
          <Link
            key={category.label}
            href="/inventory"
            className="group relative flex h-40 w-48 shrink-0 snap-start flex-col items-center justify-center gap-2 border border-[#0d0d0d]/10 bg-white p-4 text-center transition-colors hover:bg-[var(--ultima-surface-container)]"
          >
            <ArrowUpRight className="absolute top-3 right-3 size-4 text-[#0d0d0d]/40 transition-colors group-hover:text-[#0d0d0d]" />
            <Car className="size-10 text-[#0d0d0d]/30" strokeWidth={1} />
            <span className="font-heading text-sm lowercase tracking-wide text-[#0d0d0d]">
              {category.label}
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}
