import Link from "next/link";
import { Section } from "./section";
import { VehicleCard } from "./vehicle-card";
import { Button } from "@/components/ui/button";
import type { DealershipConfig, Vehicle } from "@/types";

export function TrendVehicles({
  dealership,
  vehicles,
}: {
  dealership: DealershipConfig;
  vehicles: Vehicle[];
}) {
  const featured = vehicles.filter((vehicle) => vehicle.featured);

  return (
    <Section tone="light">
      <h2 className="font-heading mb-6 text-2xl tracking-tight">
        Vehículos 0km
      </h2>
      <div className="scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto">
        {featured.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            dealership={dealership}
            className="w-72 shrink-0 snap-start rounded-[12px]"
            overlay={false}
          />
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Button
          variant="outline"
          className="border-[#0d0d0d] text-[#0d0d0d] hover:bg-[#0d0d0d] hover:text-white"
          render={<Link href="/inventory">Ver Todo el Inventario</Link>}
        />
      </div>
    </Section>
  );
}
