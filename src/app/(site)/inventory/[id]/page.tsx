import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getDealershipConfig, resolveDealershipId } from "@/lib/dealership/config";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { Section } from "@/components/site/homepage/section";
import { VehicleInquiryButton } from "@/components/site/homepage/vehicle-inquiry-button";
import { PhotoGallery } from "@/components/site/vehicle-detail/photo-gallery";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format-price";
import {
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
  type VehicleStatus,
} from "@/types";

const STATUS_BADGE_VARIANT: Record<
  VehicleStatus,
  "default" | "secondary" | "outline"
> = {
  disponible: "default",
  reservado: "secondary",
  vendido: "outline",
};

export default async function VehicleDetailPage(
  props: PageProps<"/inventory/[id]">
) {
  const { id } = await props.params;
  const headerList = await headers();
  const dealership = getDealershipConfig(
    resolveDealershipId(headerList.get("host"))
  );
  const vehicles = await getVehicles(dealership.id);
  const vehicle = vehicles.find((v) => v.id === id);

  if (!vehicle) {
    notFound();
  }

  return (
    <Section tone="light">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[65fr_35fr]">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h1 className="font-heading text-3xl tracking-tight">
              {vehicle.make} {vehicle.model} {vehicle.version} {vehicle.year}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#0d0d0d]/70">
              <span>{vehicle.make}</span>
              <span>{vehicle.model}</span>
              <span>{vehicle.year}</span>
              <span>{vehicle.mileage.toLocaleString()} km</span>
              <span>{FUEL_LABELS[vehicle.fuel]}</span>
              <span>{TRANSMISSION_LABELS[vehicle.transmission]}</span>
              {vehicle.location && <span>{vehicle.location}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={STATUS_BADGE_VARIANT[vehicle.status]}>
                {VEHICLE_STATUS_LABELS[vehicle.status]}
              </Badge>
              {vehicle.financingAvailable && (
                <Badge variant="outline">Financiación disponible</Badge>
              )}
              <span className="font-heading text-2xl text-[#0d0d0d]">
                {formatPrice(vehicle.price)}
              </span>
            </div>
          </div>

          <PhotoGallery
            images={vehicle.imageUrls}
            alt={`${vehicle.make} ${vehicle.model}`}
          />

          {vehicle.description && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-xl tracking-tight">
                Descripción
              </h2>
              <p className="text-sm leading-relaxed text-[#0d0d0d]/80">
                {vehicle.description}
              </p>
            </div>
          )}

          {vehicle.features.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-xl tracking-tight">
                Equipamiento
              </h2>
              <div className="flex flex-wrap gap-2">
                {vehicle.features.map((feature) => (
                  <Badge key={feature} variant="outline">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <VehicleInquiryButton vehicle={vehicle} dealership={dealership} dark />
        </div>
      </div>
    </Section>
  );
}
