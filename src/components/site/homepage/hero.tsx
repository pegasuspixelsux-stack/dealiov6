import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/site/header";
import { HeroSearch } from "./hero-search";
import type { DealershipConfig } from "@/types";

export function Hero({ dealership }: { dealership: DealershipConfig }) {
  return (
    <section className="w-full bg-transparent">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-3 px-[10px] py-4 md:grid-cols-3 md:gap-4 md:p-[50px]">
        {/* Column 1: nav + search + photo, stacked */}
        <div className="flex h-[85vh] min-h-[560px] flex-col gap-3 md:h-[80vh] md:gap-4">
          <Header dealership={dealership} />
          <HeroSearch />

          <div className="relative flex-1 overflow-hidden rounded-[12px] text-white">
            <Image
              src="/images/Coastal%20Highway_1.png"
              alt=""
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="relative flex h-full flex-col justify-end p-6 md:p-8">
              <p className="text-sm font-medium tracking-widest text-white/70 uppercase">
                {dealership.name}
              </p>
              <h1 className="font-heading mt-2 text-3xl tracking-tight sm:text-4xl">
                Tu Próximo Auto Empieza Aquí
              </h1>
              <p className="mt-3 max-w-md text-base text-white/70">
                Encontrá el auto que acompaña tu estilo de vida
              </p>
            </div>
          </div>
        </div>

        {/* Column 2: Ver Inventario CTA */}
        <div className="flex h-auto min-h-[200px] flex-col items-start justify-between gap-4 rounded-[12px] border border-[#0d0d0d]/50 bg-transparent p-6 text-[#0d0d0d] md:h-[80vh] md:p-8">
          <p className="font-heading text-xl tracking-tight sm:text-2xl">
            ¿Buscás tu próximo auto?
          </p>
          <Link
            href="/inventory"
            className="shrink-0 rounded-full bg-[#0d0d0d] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#161616] sm:px-6"
          >
            Ver Inventario
          </Link>
        </div>

        {/* Column 3: Trade-in CTA */}
        <div className="flex h-auto min-h-[200px] flex-col items-start justify-between gap-4 rounded-[12px] border border-[#0d0d0d]/50 bg-transparent p-6 text-[#0d0d0d] md:h-[80vh] md:p-8">
          <p className="font-heading text-xl tracking-tight sm:text-2xl">
            Canjeá tu Auto
          </p>
          <Link
            href="/#trade-in"
            className="shrink-0 rounded-full bg-[#0d0d0d] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#161616] sm:px-6"
          >
            Cotizar
          </Link>
        </div>
      </div>
    </section>
  );
}
