"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
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
  const [index, setIndex] = useState(0);
  const testimonial = TESTIMONIALS[index];

  const go = (direction: "prev" | "next") => {
    setIndex((current) => {
      if (direction === "next") return (current + 1) % TESTIMONIALS.length;
      return (current - 1 + TESTIMONIALS.length) % TESTIMONIALS.length;
    });
  };

  return (
    <Section tone="dark">
      <div className="grid grid-cols-1 items-center gap-8">
        <div>
          <h2 className="font-heading text-2xl tracking-tight">
            Lo Que Dicen Nuestros Clientes
          </h2>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => go("prev")}
              aria-label="Testimonio anterior"
              className="flex size-9 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go("next")}
              aria-label="Siguiente testimonio"
              className="flex size-9 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="mt-6 flex gap-2">
            {TESTIMONIALS.map((item, itemIndex) => (
              <button
                key={item.name}
                type="button"
                onClick={() => setIndex(itemIndex)}
                aria-label={`Ir al testimonio de ${item.name}`}
                className={`size-2 rounded-full transition-colors ${
                  itemIndex === index ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        <div key={testimonial.name} className="border border-white/10 p-6">
          <div className="mb-3 flex gap-1">
            {Array.from({ length: testimonial.rating }).map((_, starIndex) => (
              <Star
                key={starIndex}
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
      </div>
    </Section>
  );
}
