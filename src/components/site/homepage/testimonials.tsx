"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
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

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % TESTIMONIALS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-heading text-2xl tracking-tight">
          Lo Que Dicen Nuestros Clientes
        </h2>
      </div>

      <div key={testimonial.name} className="border border-[#0d0d0d]/10 p-6">
        <div className="mb-3 flex gap-1">
          {Array.from({ length: testimonial.rating }).map((_, starIndex) => (
            <Star
              key={starIndex}
              className="size-4 fill-[var(--ultima-tertiary)] text-[var(--ultima-tertiary)]"
            />
          ))}
        </div>
        <p className="text-[#0d0d0d]/80">&ldquo;{testimonial.quote}&rdquo;</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center">
            <Avatar>
              <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <Avatar className="-ml-4 border-2 border-white">
              <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          <span className="text-sm font-medium">{testimonial.name}</span>
        </div>
      </div>

      <div className="flex justify-center gap-2">
        {TESTIMONIALS.map((item, itemIndex) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setIndex(itemIndex)}
            aria-label={`Ir al testimonio de ${item.name}`}
            className={`size-2 rounded-full transition-colors ${
              itemIndex === index ? "bg-[#0d0d0d]" : "bg-[#0d0d0d]/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
