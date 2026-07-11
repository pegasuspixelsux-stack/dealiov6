import { Section } from "./section";
import { Testimonials } from "./testimonials";
import { TradeIn } from "./trade-in";

export function TradeInTestimonials() {
  return (
    <Section tone="light">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <Testimonials />
        <TradeIn />
      </div>
    </Section>
  );
}
