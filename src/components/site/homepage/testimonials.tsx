import { Star } from "lucide-react";
import { Section } from "./section";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Testimonial {
  name: string;
  quote: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Jordan M.",
    quote:
      "The whole process was seamless — found my car, financed it, and drove off in under two hours.",
    rating: 5,
  },
  {
    name: "Priya S.",
    quote:
      "Trade-in valuation was spot on and way faster than I expected. Highly recommend.",
    rating: 5,
  },
  {
    name: "Marcus T.",
    quote:
      "Inventory quality is unmatched. Every car looked exactly like the photos.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <Section tone="dark">
      <h2 className="font-heading mb-8 text-2xl uppercase tracking-tight">
        What Drivers Are Saying
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((testimonial) => (
          <div key={testimonial.name} className="border border-white/10 p-6">
            <div className="mb-3 flex gap-1">
              {Array.from({ length: testimonial.rating }).map((_, index) => (
                <Star key={index} className="size-4 fill-white text-white" />
              ))}
            </div>
            <p className="text-white/80">&ldquo;{testimonial.quote}&rdquo;</p>
            <div className="mt-4 flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{testimonial.name}</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
