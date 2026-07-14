import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/site/header";
import { HeroSearch } from "./hero-search";
import type { DealershipConfig } from "@/types";

export function Hero({ dealership }: { dealership: DealershipConfig }) {
  return (
    <section className="w-full bg-[#eff1f3]">
      <Header dealership={dealership} sticky={false} />
      <HeroSearch />

      <div className="mx-auto flex h-[90vh] min-h-[600px] max-w-[1440px] flex-col gap-3 p-4 pt-0 md:gap-4 md:px-[50px] md:pb-[50px]">
        <div className="relative flex flex-1 flex-col justify-end overflow-hidden rounded-[12px] p-6 text-white md:p-10">
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

        <div className="flex shrink-0 items-center justify-between gap-4 rounded-[12px] bg-[#0d0d0d] p-6 text-white md:p-8">
          <p className="font-heading text-xl tracking-tight sm:text-2xl">
            ¿Buscás tu próximo auto?
          </p>
          <Link
            href="/inventory"
            className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0d0d0d] transition-colors hover:bg-white/85 sm:px-6"
          >
            Ver Inventario
          </Link>
        </div>
      </div>
    </section>
  );
}
