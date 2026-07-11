import { Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DealershipConfig, Vehicle } from "@/types";

export function VehicleCard({
  vehicle,
  dealership,
  className,
}: {
  vehicle: Vehicle;
  dealership: DealershipConfig;
  className?: string;
}) {
  const message = encodeURIComponent(
    `Hola, me interesa el ${vehicle.make} ${vehicle.model} ${vehicle.year}.`
  );
  const whatsappHref = `https://wa.me/${dealership.whatsapp.replace(/[^\d]/g, "")}?text=${message}`;

  return (
    <div
      className={cn(
        "group overflow-hidden border border-white/10 transition-transform hover:-translate-y-1",
        className
      )}
    >
      {/* Placeholder imagery until real photography (vehicle.imageUrl) is wired in */}
      <div className="relative flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
        <Car className="size-12 text-white/20" strokeWidth={1} />
        <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4">
          <h3 className="font-heading text-lg tracking-wide text-white">
            {vehicle.make} {vehicle.model} {vehicle.year}
          </h3>
          <p className="text-sm text-white/70">
            {vehicle.mileage.toLocaleString()} km ·{" "}
            {vehicle.category === "new" ? "Nuevo" : "Usado"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 bg-white p-4 text-[#0d0d0d]">
        <p className="text-xl font-semibold">
          ${vehicle.price.toLocaleString()}
        </p>
        <Button
          size="sm"
          className="bg-[#0d0d0d] text-white hover:bg-[#0d0d0d]/80"
          render={<a href={whatsappHref}>Consultar</a>}
        />
      </div>
    </div>
  );
}
