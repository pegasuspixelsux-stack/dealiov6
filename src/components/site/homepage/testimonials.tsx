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
    name: "Martín G.",
    quote:
      "Todo el proceso fue impecable: encontré mi auto, lo financié y me lo llevé en menos de dos horas.",
    rating: 5,
  },
  {
    name: "Lucía R.",
    quote:
      "La tasación de mi usado fue justa y mucho más rápida de lo que esperaba. Totalmente recomendable.",
    rating: 5,
  },
  {
    name: "Nicolás F.",
    quote:
      "La calidad del inventario es inigualable. Cada auto era exactamente como en las fotos.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <Section tone="dark">
      <h2 className="font-heading mb-8 text-2xl lowercase tracking-tight">
        Lo Que Dicen Nuestros Clientes
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((testimonial) => (
          <div key={testimonial.name} className="border border-white/10 p-6">
            <div className="mb-3 flex gap-1">
              {Array.from({ length: testimonial.rating }).map((_, index) => (
                <Star
                  key={index}
                  className="size-4 fill-[var(--ultima-tertiary)] text-[var(--ultima-tertiary)]"
                />
              ))}
            </div>
            <p className="text-white/80">&ldquo;{testimonial.quote}&rdquo;</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center">
                <Avatar>
                  <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <Avatar className="-ml-4 border-2 border-[#0d0d0d]">
                  <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-sm font-medium">{testimonial.name}</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
