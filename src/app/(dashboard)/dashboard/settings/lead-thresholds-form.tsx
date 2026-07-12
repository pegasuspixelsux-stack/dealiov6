"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLeadStageThresholdsAction } from "@/app/actions/lead-config";
import type { LeadStageThresholds } from "@/types";

export function LeadThresholdsForm({ initial }: { initial: LeadStageThresholds }) {
  const [values, setValues] = useState<LeadStageThresholds>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleChange(field: keyof LeadStageThresholds) {
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
      const result = await updateLeadStageThresholdsAction(values);
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
        <Label htmlFor="lt-fast-yellow">
          Recibido/Contactado/Negociación — amarillo después de (minutos)
        </Label>
        <Input
          id="lt-fast-yellow"
          type="number"
          value={values.fastStageYellowMinutes}
          onChange={handleChange("fastStageYellowMinutes")}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lt-fast-red">
          Recibido/Contactado/Negociación — rojo después de (minutos)
        </Label>
        <Input
          id="lt-fast-red"
          type="number"
          value={values.fastStageRedMinutes}
          onChange={handleChange("fastStageRedMinutes")}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lt-followup-yellow">
          Seguimiento — amarillo después de (días)
        </Label>
        <Input
          id="lt-followup-yellow"
          type="number"
          value={values.followUpYellowDays}
          onChange={handleChange("followUpYellowDays")}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lt-followup-red">
          Seguimiento — rojo después de (días)
        </Label>
        <Input
          id="lt-followup-red"
          type="number"
          value={values.followUpRedDays}
          onChange={handleChange("followUpRedDays")}
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
