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
    <Section tone="dark">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl uppercase tracking-tight">
          Trend Vehicles
        </h2>
        <Button
          variant="outline"
          className="border-white text-white hover:bg-white hover:text-black"
          render={<Link href="/inventory">See All Inventory</Link>}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            dealership={dealership}
          />
        ))}
      </div>
    </Section>
  );
}
