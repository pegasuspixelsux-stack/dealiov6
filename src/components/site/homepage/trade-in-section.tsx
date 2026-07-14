import { Section } from "./section";
import { TradeIn } from "./trade-in";

export function TradeInSection({ dealershipId }: { dealershipId: string }) {
  return (
    <Section tone="light" id="trade-in">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div>
          <h2 className="font-heading mb-2 text-2xl tracking-tight">
            Usá tu Vehículo Actual como Anticipo
          </h2>
          <p className="text-lg leading-relaxed text-[#0d0d0d]/70">
            Canjeá tu vehículo actual y usá su valor como anticipo para tu
            próximo auto, ya sea uno nuevo o un usado en mejores
            condiciones.
          </p>
        </div>
        <div>
          <h2 className="font-heading mb-2 text-2xl tracking-tight">
            Conocé el Valor de tu Vehículo
          </h2>
          <p className="mb-8 text-[#0d0d0d]/70">
            Contanos sobre tu vehículo actual y te enviaremos una
            estimación.
          </p>
          <TradeIn dealershipId={dealershipId} />
        </div>
      </div>
    </Section>
  );
}
