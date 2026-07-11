import Link from "next/link";
import { Section } from "./section";
import { VehicleCard } from "./vehicle-card";
import { Button } from "@/components/ui/button";
import { MOCK_VEHICLES } from "@/lib/vehicles/mock-data";
import type { DealershipConfig } from "@/types";

export function InventoryGrid({
  dealership,
}: {
  dealership: DealershipConfig;
}) {
  return (
    <Section tone="light">
      <h2 className="font-heading mb-6 text-2xl tracking-tight">
        Vehículos Usados
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_VEHICLES.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            dealership={dealership}
            className="rounded-[12px]"
          />
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Button
          size="lg"
          className="bg-[#0d0d0d] text-white hover:bg-[#0d0d0d]/80"
          render={<Link href="/inventory">Ver Todo el Inventario</Link>}
        />
      </div>
    </Section>
  );
}
