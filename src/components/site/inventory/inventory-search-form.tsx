"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BODY_TYPE_LABELS, type BodyType, type Vehicle } from "@/types";

const BODY_TYPES = Object.keys(BODY_TYPE_LABELS) as BodyType[];

export interface InventoryFilters {
  yearMin: string;
  yearMax: string;
  make: string;
  model: string;
  color: string;
  bodyType: string;
  priceMin: string;
  priceMax: string;
}

export function InventorySearchForm({
  vehicles,
  initialFilters,
}: {
  vehicles: Vehicle[];
  initialFilters: InventoryFilters;
}) {
  const router = useRouter();
  const [make, setMake] = useState(initialFilters.make);

  const makes = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.make))).sort(),
    [vehicles]
  );

  const models = useMemo(() => {
    const source = make
      ? vehicles.filter((v) => v.make.toLowerCase() === make.toLowerCase())
      : vehicles;
    return Array.from(new Set(source.map((v) => v.model))).sort();
  }, [vehicles, make]);

  const colors = useMemo(
    () =>
      Array.from(
        new Set(vehicles.map((v) => v.color).filter((c) => c.length > 0))
      ).sort(),
    [vehicles]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const key of [
      "year_min",
      "year_max",
      "make",
      "model",
      "color",
      "bodyType",
      "price_min",
      "price_max",
    ]) {
      const value = formData.get(key);
      if (typeof value === "string" && value.trim() !== "") {
        params.set(key, value);
      }
    }

    router.push(`/inventory?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 grid grid-cols-2 gap-4 border border-[#0d0d0d]/10 p-4 sm:grid-cols-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="is-year-min">Año desde</Label>
        <Input
          id="is-year-min"
          name="year_min"
          type="number"
          defaultValue={initialFilters.yearMin}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="is-year-max">Año hasta</Label>
        <Input
          id="is-year-max"
          name="year_max"
          type="number"
          defaultValue={initialFilters.yearMax}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="is-make">Marca</Label>
        <select
          id="is-make"
          name="make"
          value={make}
          onChange={(event) => setMake(event.target.value)}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">Todas</option>
          {makes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="is-model">Modelo</Label>
        <select
          key={make}
          id="is-model"
          name="model"
          defaultValue={initialFilters.model}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">Todos</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="is-color">Color</Label>
        <select
          id="is-color"
          name="color"
          defaultValue={initialFilters.color}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">Todos</option>
          {colors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="is-body-type">Tipo</Label>
        <select
          id="is-body-type"
          name="bodyType"
          defaultValue={initialFilters.bodyType}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">Todos</option>
          {BODY_TYPES.map((type) => (
            <option key={type} value={type}>
              {BODY_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="is-price-min">Precio desde (US$)</Label>
        <Input
          id="is-price-min"
          name="price_min"
          type="number"
          defaultValue={initialFilters.priceMin}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="is-price-max">Precio hasta (US$)</Label>
        <Input
          id="is-price-max"
          name="price_max"
          type="number"
          defaultValue={initialFilters.priceMax}
        />
      </div>
      <div className="col-span-2 flex items-end gap-3 sm:col-span-4">
        <Button type="submit">Buscar</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/inventory")}>
          Limpiar filtros
        </Button>
      </div>
    </form>
  );
}
