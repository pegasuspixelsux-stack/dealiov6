import Link from "next/link";
import { Section } from "./section";

const CATEGORIES = [
  { label: "New Vehicles" },
  { label: "Used Vehicles" },
  { label: "SUVs" },
  { label: "Sedans" },
  { label: "Coupes" },
  { label: "Convertibles" },
];

export function CategoriesScroller() {
  return (
    <Section tone="light">
      <h2 className="font-heading mb-6 text-2xl uppercase tracking-tight">
        Browse by Category
      </h2>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
        {CATEGORIES.map((category) => (
          <Link
            key={category.label}
            href="/inventory"
            className="font-heading flex h-32 w-48 shrink-0 snap-start items-center justify-center border border-[#0d0d0d]/10 bg-white text-center uppercase tracking-wide transition-colors hover:bg-[#0d0d0d] hover:text-white"
          >
            {category.label}
          </Link>
        ))}
      </div>
    </Section>
  );
}
