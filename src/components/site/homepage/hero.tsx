import Image from "next/image";
import type { DealershipConfig } from "@/types";

export function Hero({ dealership }: { dealership: DealershipConfig }) {
  return (
    <section className="w-full bg-[#eff1f3]">
      <div className="mx-auto h-[90vh] min-h-[600px] max-w-[1440px] p-4 md:p-[50px]">
        <div className="relative flex h-full w-full flex-col justify-end overflow-hidden rounded-[12px] p-6 text-white md:p-10">
          <Image
            src="/images/Coastal%20Highway_1.png"
            alt=""
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <p className="relative text-sm font-medium tracking-widest text-white/70 uppercase">
            {dealership.name}
          </p>
          <h1 className="font-heading relative mt-2 text-4xl tracking-tight sm:text-6xl">
            Tu Próximo Auto Empieza Aquí
          </h1>
          <p className="relative mt-3 max-w-md text-lg text-white/70">
            Encontrá el auto que acompaña tu estilo de vida
          </p>
        </div>
      </div>
    </section>
  );
}
