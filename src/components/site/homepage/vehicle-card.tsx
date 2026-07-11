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
        "group overflow-hidden border border-white/10 bg-black transition-transform hover:-translate-y-1",
        className
      )}
    >
      {/* Placeholder imagery until real photography (vehicle.imageUrl) is wired in */}
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
        <Car className="size-12 text-white/20" strokeWidth={1} />
      </div>
      <div className="flex flex-col gap-1 p-4 text-white">
        <h3 className="font-heading text-lg uppercase tracking-wide">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        <p className="text-sm text-white/60">
          {vehicle.mileage.toLocaleString()} km ·{" "}
          {vehicle.category === "new" ? "Nuevo" : "Usado"}
        </p>
        <p className="mt-2 text-xl font-semibold">
          ${vehicle.price.toLocaleString()}
        </p>
        <Button
          size="sm"
          className="mt-3 bg-white text-black hover:bg-white/80"
          render={<a href={whatsappHref}>Consultar</a>}
        />
      </div>
    </div>
  );
}
