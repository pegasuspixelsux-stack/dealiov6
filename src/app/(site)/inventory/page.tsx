import { headers } from "next/headers";
import { getDealershipConfig, resolveDealershipId } from "@/lib/dealership/config";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { Section } from "@/components/site/homepage/section";
import { VehicleCard } from "@/components/site/homepage/vehicle-card";
import { InventorySearchForm } from "@/components/site/inventory/inventory-search-form";

function paramString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function InventoryPage(props: PageProps<"/inventory">) {
  const searchParams = await props.searchParams;

  const yearMin = paramString(searchParams.year_min);
  const yearMax = paramString(searchParams.year_max);
  const make = paramString(searchParams.make);
  const model = paramString(searchParams.model);
  const color = paramString(searchParams.color);
  const bodyType = paramString(searchParams.bodyType);
  const priceMin = paramString(searchParams.price_min);
  const priceMax = paramString(searchParams.price_max);
  const q = paramString(searchParams.q).toLowerCase();

  const headerList = await headers();
  const dealership = getDealershipConfig(
    resolveDealershipId(headerList.get("host"))
  );
  const vehicles = await getVehicles(dealership.id);

  const filtered = vehicles.filter((vehicle) => {
    if (make && vehicle.make.toLowerCase() !== make.toLowerCase()) return false;
    if (model && vehicle.model.toLowerCase() !== model.toLowerCase()) return false;
    if (color && vehicle.color.toLowerCase() !== color.toLowerCase()) return false;
    if (bodyType && vehicle.bodyType !== bodyType) return false;
    if (yearMin && vehicle.year < Number(yearMin)) return false;
    if (yearMax && vehicle.year > Number(yearMax)) return false;
    if (priceMin && vehicle.price < Number(priceMin)) return false;
    if (priceMax && vehicle.price > Number(priceMax)) return false;
    if (
      q &&
      !`${vehicle.make} ${vehicle.model} ${vehicle.year}`
        .toLowerCase()
        .includes(q)
    )
      return false;
    return true;
  });

  return (
    <Section tone="light">
      <h1 className="font-heading mb-6 text-2xl tracking-tight">
        Inventario
      </h1>
      <InventorySearchForm
        key={JSON.stringify([
          yearMin,
          yearMax,
          make,
          model,
          color,
          bodyType,
          priceMin,
          priceMax,
        ])}
        vehicles={vehicles}
        initialFilters={{
          yearMin,
          yearMax,
          make,
          model,
          color,
          bodyType,
          priceMin,
          priceMax,
        }}
      />
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
