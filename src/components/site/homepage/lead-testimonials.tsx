import { Section } from "./section";
import { Testimonials } from "./testimonials";
import { LeadFooter } from "./lead-footer";

export function LeadTestimonials({ dealershipId }: { dealershipId: string }) {
  return (
    <Section tone="light" className="bg-[#eff1f3]">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <Testimonials />
        <LeadFooter dealershipId={dealershipId} />
      </div>
    </Section>
  );
}
