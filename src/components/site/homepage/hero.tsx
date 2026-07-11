import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { DealershipConfig } from "@/types";

export function Hero({ dealership }: { dealership: DealershipConfig }) {
  return (
    <section className="relative flex h-[700px] w-full items-center justify-center overflow-hidden px-4 text-center text-white">
      <Image
        src="/images/Coastal%20Highway_1.png"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      <div className="relative flex max-w-2xl flex-col items-center gap-6">
        <h1 className="font-heading text-5xl tracking-tight sm:text-6xl">
          {dealership.name}
        </h1>
        <p className="text-lg text-white/70">
          Vehículos de alta gama. Experiencia de alto octanaje.
        </p>
        <Button
          size="lg"
          className="bg-white text-black hover:bg-white/80"
          render={
            <a
              href={`https://wa.me/${dealership.whatsapp.replace(/[^\d]/g, "")}`}
            >
              Chatear por WhatsApp
            </a>
          }
        />
      </div>
    </section>
  );
}
