import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, MessageCircle } from "lucide-react";
import type { DealershipConfig } from "@/types";

export function Hero({ dealership }: { dealership: DealershipConfig }) {
  const whatsappHref = `https://wa.me/${dealership.whatsapp.replace(/[^\d]/g, "")}`;

  return (
    <section className="w-full bg-[#eff1f3]">
      <div className="mx-auto grid h-[90vh] min-h-[600px] max-w-[1440px] grid-cols-1 grid-rows-4 gap-3 p-4 md:grid-cols-12 md:grid-rows-6 md:gap-4 md:p-[50px]">
        {/* Photo tile */}
        <div className="relative row-start-1 row-end-2 flex flex-col justify-end overflow-hidden rounded-3xl p-6 text-white md:col-start-1 md:col-end-8 md:row-start-1 md:row-end-5 md:p-10">
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

        {/* Explore inventory CTA tile */}
        <Link
          href="/inventory"
          className="group row-start-2 row-end-3 flex flex-col justify-between rounded-3xl bg-[#f9f9f9] p-6 text-[#0d0d0d] transition-colors hover:bg-white md:col-start-8 md:col-end-13 md:row-start-1 md:row-end-4 md:p-8"
        >
          <ArrowUpRight className="size-8 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          <div>
            <p className="font-heading text-xl tracking-tight">Ver Inventario</p>
            <p className="mt-1 text-sm text-[#0d0d0d]/60">
              Explorá todos los modelos disponibles
            </p>
          </div>
        </Link>

        {/* Address / info tile */}
        <div className="row-start-3 row-end-4 flex flex-col justify-center gap-2 rounded-3xl bg-[#f9f9f9] p-6 text-[#0d0d0d] md:col-start-1 md:col-end-8 md:row-start-5 md:row-end-7 md:p-8">
          <div className="flex items-center gap-2 text-sm text-[#0d0d0d]/70">
            <MapPin className="size-4 shrink-0" />
            {dealership.address}
          </div>
          <div className="flex items-center gap-2 text-sm text-[#0d0d0d]/70">
            <MessageCircle className="size-4 shrink-0" />
            {dealership.phone}
          </div>
        </div>

        {/* WhatsApp CTA tile */}
        <Link
          href={whatsappHref}
          className="group row-start-4 row-end-5 flex flex-col justify-between rounded-3xl bg-[#0d0d0d] p-6 text-white transition-colors hover:bg-[#161616] md:col-start-8 md:col-end-13 md:row-start-4 md:row-end-7 md:p-8"
        >
          <MessageCircle className="size-8 text-[#25D366] transition-transform group-hover:scale-110" />
          <div>
            <p className="font-heading text-xl tracking-tight">Hablemos</p>
            <p className="mt-1 text-sm text-white/60">Consultá por WhatsApp</p>
          </div>
        </Link>
      </div>
    </section>
  );
}
