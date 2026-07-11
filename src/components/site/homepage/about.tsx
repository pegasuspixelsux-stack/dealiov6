import { Section } from "./section";
import type { DealershipConfig } from "@/types";

export function About({ dealership }: { dealership: DealershipConfig }) {
  return (
    <Section tone="light">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <h2 className="font-heading text-3xl uppercase tracking-tight sm:text-4xl">
          Hecho para quienes exigen más al volante.
        </h2>
        <p className="text-base leading-relaxed text-[#0d0d0d]/70">
          {dealership.name} selecciona un inventario de alto rendimiento
          respaldado por precios transparentes, financiación rápida y un
          equipo que trata cada test drive como el comienzo de una relación.
          Desde publicaciones de calidad de estudio hasta canjes sin
          complicaciones, cada parte de la experiencia está pensada para
          ponerte en el auto correcto, más rápido.
        </p>
      </div>
    </Section>
  );
}
