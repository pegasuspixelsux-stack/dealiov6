"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDealershipProfileAction } from "@/app/actions/dealership";
import type { DealershipConfig } from "@/types";

const DAY_FIELDS: { key: keyof DealershipConfig["hours"]; label: string }[] = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

export function DealershipProfileForm({
  initial,
}: {
  initial: DealershipConfig;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await updateDealershipProfileAction(formData);
      if (result.success) {
        setSaved(true);
        router.refresh();
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
        <Label htmlFor="dp-logo">Logo</Label>
        {initial.logoUrl && (
          <div className="relative size-12">
            <Image
              src={initial.logoUrl}
              alt={initial.name}
              fill
              className="rounded-md object-contain"
            />
          </div>
        )}
        <input id="dp-logo" name="logo" type="file" accept="image/*" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="dp-logo-text">Texto del logo (nav)</Label>
        <Input
          id="dp-logo-text"
          name="logoText"
          defaultValue={initial.logoText ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="dp-name">Nombre del concesionario</Label>
        <Input id="dp-name" name="name" defaultValue={initial.name} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="dp-address">Dirección</Label>
        <Input
          id="dp-address"
          name="address"
          defaultValue={initial.address}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="dp-whatsapp">WhatsApp</Label>
        <Input
          id="dp-whatsapp"
          name="whatsapp"
          defaultValue={initial.whatsapp}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="dp-email">Correo electrónico</Label>
        <Input
          id="dp-email"
          name="email"
          type="email"
          defaultValue={initial.email}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="dp-phone">Teléfono</Label>
        <Input
          id="dp-phone"
          name="phone"
          defaultValue={initial.phone}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Horarios</Label>
        <div className="grid grid-cols-2 gap-3">
          {DAY_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <Label htmlFor={`dp-hours-${key}`} className="text-xs font-normal text-muted-foreground">
                {label}
              </Label>
              <Input
                id={`dp-hours-${key}`}
                name={`hours.${key}`}
                defaultValue={initial.hours[key]}
              />
            </div>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Guardado.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
