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
        "group relative aspect-square w-full overflow-hidden transition-transform hover:-translate-y-1",
        className
      )}
    >
      {/* Placeholder imagery until real photography (vehicle.imageUrl) is wired in */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
        <Car className="size-12 text-white/20" strokeWidth={1} />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4">
        <h3 className="font-heading text-lg tracking-wide text-white">
          {vehicle.make} {vehicle.model} {vehicle.year}
        </h3>
        <p className="text-sm text-white/70">
          {vehicle.mileage.toLocaleString()} km ·{" "}
          {vehicle.category === "new" ? "Nuevo" : "Usado"}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xl font-semibold text-white">
            ${vehicle.price.toLocaleString()}
          </p>
          <Button
            size="sm"
            className="bg-white text-[#0d0d0d] hover:bg-white/80"
            render={<a href={whatsappHref}>Consultar</a>}
          />
        </div>
      </div>
    </div>
  );
}
