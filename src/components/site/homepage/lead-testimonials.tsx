import { Section } from "./section";
import { Testimonials } from "./testimonials";
import { LeadFooter } from "./lead-footer";

export function LeadTestimonials() {
  return (
    <Section tone="light" className="bg-[#6adaf4]">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <Testimonials />
        <LeadFooter />
      </div>
    </Section>
  );
}
