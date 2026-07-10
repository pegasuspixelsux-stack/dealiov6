import { Section } from "./section";
import type { DealershipConfig } from "@/types";

export function About({ dealership }: { dealership: DealershipConfig }) {
  return (
    <Section tone="light">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <h2 className="font-heading text-3xl uppercase tracking-tight sm:text-4xl">
          Built for drivers who demand more.
        </h2>
        <p className="text-base leading-relaxed text-[#0d0d0d]/70">
          {dealership.name} curates a high-performance inventory backed by
          transparent pricing, fast financing, and a team that treats every
          test drive like the start of a partnership. From studio-quality
          listings to hassle-free trade-ins, every part of the experience is
          engineered around getting you into the right car, faster.
        </p>
      </div>
    </Section>
  );
}
