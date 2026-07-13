import { headers } from "next/headers";
import { getDealershipConfig, resolveDealershipId } from "@/lib/dealership/config";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { Section } from "@/components/site/homepage/section";
import { VehicleCard } from "@/components/site/homepage/vehicle-card";

export default async function InventoryPage(props: PageProps<"/inventory">) {
  const { make } = await props.searchParams;
  const makeFilter = Array.isArray(make) ? make[0] : make;

  const headerList = await headers();
  const dealership = getDealershipConfig(
    resolveDealershipId(headerList.get("host"))
  );
  const vehicles = await getVehicles(dealership.id);

  const filtered = makeFilter
    ? vehicles.filter(
        (vehicle) => vehicle.make.toLowerCase() === makeFilter.toLowerCase()
      )
    : vehicles;

  return (
    <Section tone="light">
      <h1 className="font-heading mb-6 text-2xl tracking-tight">
        Inventario
      </h1>
      {filtered.length === 0 ? (
        <p className="text-sm text-[#0d0d0d]/70">
          No hay vehículos disponibles.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              dealership={dealership}
              className="rounded-[12px]"
            />
          ))}
        </div>
      )}
    </Section>
  );
}
