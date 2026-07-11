import Link from "next/link";
import { Section } from "./section";
import { VehicleCard } from "./vehicle-card";
import { Button } from "@/components/ui/button";
import { MOCK_VEHICLES } from "@/lib/vehicles/mock-data";
import type { DealershipConfig } from "@/types";

export function TrendVehicles({
  dealership,
}: {
  dealership: DealershipConfig;
}) {
  const featured = MOCK_VEHICLES.filter((vehicle) => vehicle.featured);

  return (
    <Section tone="light">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl tracking-tight">
          Vehículos Usados
        </h2>
        <Button
          variant="outline"
          className="border-[#0d0d0d] text-[#0d0d0d] hover:bg-[#0d0d0d] hover:text-white"
          render={<Link href="/inventory">Ver Todo el Inventario</Link>}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            dealership={dealership}
            className="rounded-[12px]"
          />
        ))}
      </div>
    </Section>
  );
}
