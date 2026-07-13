"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateInventorySettingsAction } from "@/app/actions/inventory-config";
import type { InventorySettings } from "@/types";

export function InventorySettingsForm({ initial }: { initial: InventorySettings }) {
  const [values, setValues] = useState<InventorySettings>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleChange(field: keyof InventorySettings) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: Number(event.target.value) }));
      setSaved(false);
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    try {
      const result = await updateInventorySettingsAction(values);
      if (result.success) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Algo salió mal. Por favor intentá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="is-stale-days">
          Marcar como atrasado después de (días)
        </Label>
        <Input
          id="is-stale-days"
          type="number"
          value={values.staleListingDays}
          onChange={handleChange("staleListingDays")}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Guardado.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
