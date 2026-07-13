import Link from "next/link";
import { Car } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatPrice, formatMonthlyPayment } from "@/lib/format-price";
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
      <Link
        href={`/inventory/${vehicle.id}`}
        aria-label={`Ver detalle de ${vehicle.make} ${vehicle.model} ${vehicle.year}`}
        className="absolute inset-0 z-10"
      />
      {vehicle.imageUrls.length > 0 ? (
        <Image
          src={vehicle.imageUrls[0]}
          alt={`${vehicle.make} ${vehicle.model}`}
          fill
          className="object-cover"
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            overlay && "bg-gradient-to-br from-neutral-800 to-neutral-950"
          )}
        >
          <Car
            className={cn("size-12", overlay ? "text-white/20" : "text-[#0d0d0d]/20")}
            strokeWidth={1}
          />
        </div>
      )}
      {!overlay && (
        <div className="absolute top-3 right-3 text-right">
          {vehicle.monthlyPayment ? (
            <>
              <p className="text-xl font-semibold text-[#0d0d0d]">
                {formatMonthlyPayment(vehicle.monthlyPayment)}
              </p>
              <p className="text-xs text-[#0d0d0d]/70">
                {formatPrice(vehicle.price)}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-[#0d0d0d]/70">A partir de</p>
              <p className="text-xl font-semibold text-[#0d0d0d]">
                {formatPrice(vehicle.price)}
              </p>
            </>
          )}
        </div>
      )}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 p-4",
          overlay && "bg-gradient-to-t from-black/85 via-black/50 to-transparent"
        )}
      >
        <h3
          className={cn(
            "font-heading tracking-wide",
            overlay ? "text-lg text-white" : "mt-2 text-sm text-[#0d0d0d]"
          )}
        >
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        <p className={cn("text-sm", overlay ? "text-white/70" : "text-[#0d0d0d]/70")}>
          {vehicle.mileage.toLocaleString()} km ·{" "}
          {vehicle.category === "new" ? "Nuevo" : "Usado"}
        </p>
        <div
          className={cn(
            "relative z-20 mt-3 flex items-center gap-3",
            overlay ? "justify-between" : "justify-end"
          )}
        >
          {overlay && (
            <div>
              {vehicle.monthlyPayment ? (
                <>
                  <p className="text-xl font-semibold text-white">
                    {formatMonthlyPayment(vehicle.monthlyPayment)}
                  </p>
                  <p className="text-xs text-white/70">
                    {formatPrice(vehicle.price)}
                  </p>
                </>
              ) : (
                <p className="text-xl font-semibold text-white">
                  {formatPrice(vehicle.price)}
                </p>
              )}
            </div>
          )}
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
