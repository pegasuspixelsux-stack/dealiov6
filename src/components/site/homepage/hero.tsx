import Image from "next/image";
import { ChevronDown } from "lucide-react";
import type { DealershipConfig } from "@/types";

export function Hero({ dealership }: { dealership: DealershipConfig }) {
  return (
    <section className="relative h-[700px] w-full overflow-hidden text-left text-white">
      <Image
        src="/images/Coastal%20Highway_1.png"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      <div className="relative mx-auto flex h-full w-full max-w-[1440px] items-end justify-start p-6 pb-20 md:p-[50px] md:pb-32">
        <div className="flex max-w-2xl flex-col items-start gap-2">
          <p className="text-sm font-medium tracking-widest text-white/70 uppercase">
            {dealership.name}
          </p>
          <h1 className="font-heading text-3xl tracking-tight sm:text-6xl">
            Tu Próximo Auto Empieza Aquí
          </h1>
          <p className="max-w-md text-lg text-white/70">
            Encontrá el auto que acompaña tu estilo de vida
          </p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-1 text-white/40">
        <span className="text-xs tracking-widest uppercase">Explorar</span>
        <ChevronDown className="size-4 animate-pulse" />
      </div>
    </section>
  );
}
