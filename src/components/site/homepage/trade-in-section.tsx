import { Section } from "./section";
import { TradeIn } from "./trade-in";

export function TradeInSection() {
  return (
    <Section tone="light">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div>
          <h2 className="font-heading mb-2 text-2xl tracking-tight">
            Conocé el Valor de tu Vehículo
          </h2>
          <p className="text-[#0d0d0d]/70">
            Contanos sobre tu vehículo actual y te enviaremos una estimación.
          </p>
        </div>
        <TradeIn />
      </div>
    </Section>
  );
}
