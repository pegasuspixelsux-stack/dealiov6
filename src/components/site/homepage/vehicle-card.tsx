import { Car } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { DealershipConfig, Vehicle } from "@/types";
import { VehicleInquiryButton } from "./vehicle-inquiry-button";

export function VehicleCard({
  vehicle,
  dealership,
  className,
  overlay = true,
}: {
  vehicle: Vehicle;
  dealership: DealershipConfig;
  className?: string;
  overlay?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative aspect-square w-full overflow-hidden transition-transform hover:-translate-y-1",
        className
      )}
    >
      {vehicle.imageUrls.length > 0 ? (
        <Image
          src={vehicle.imageUrls[0]}
          alt={`${vehicle.make} ${vehicle.model}`}
          fill
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950">
          <Car className="size-12 text-white/20" strokeWidth={1} />
        </div>
      )}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-4",
          overlay
            ? "bg-gradient-to-t from-black/85 via-black/50 to-transparent"
            : "bg-white"
        )}
      >
        <h3
          className={cn(
            "font-heading text-lg tracking-wide",
            overlay ? "text-white" : "text-[#0d0d0d]"
          )}
        >
          {vehicle.make} {vehicle.model} {vehicle.year}
        </h3>
        <p className={cn("text-sm", overlay ? "text-white/70" : "text-[#0d0d0d]/70")}>
          {vehicle.mileage.toLocaleString()} km ·{" "}
          {vehicle.category === "new" ? "Nuevo" : "Usado"}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p
            className={cn(
              "text-xl font-semibold",
              overlay ? "text-white" : "text-[#0d0d0d]"
            )}
          >
            ${vehicle.price.toLocaleString()}
          </p>
          <VehicleInquiryButton
            vehicle={vehicle}
            dealership={dealership}
            dark={!overlay}
          />
        </div>
      </div>
    </div>
  );
}
