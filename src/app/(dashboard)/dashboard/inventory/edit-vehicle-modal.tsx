"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VEHICLE_FEATURES, BODY_TYPE_LABELS } from "@/types";
import type { Vehicle } from "@/types";
import { updateVehicleAction } from "./actions";

export function EditVehicleModal({ vehicle }: { vehicle: Vehicle }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keptPhotos, setKeptPhotos] = useState<string[]>(vehicle.imageUrls);

  function removePhoto(url: string) {
    setKeptPhotos((current) => current.filter((u) => u !== url));
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      // DialogContent unmounts on close, so its defaultValue-based fields
      // reset automatically — but this outer component never unmounts, so
      // keptPhotos (plain React state) would otherwise carry stale removals
      // and additions across separate edit sessions for the same vehicle.
      setKeptPhotos(vehicle.imageUrls);
      setError(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    keptPhotos.forEach((url) => formData.append("existingImageUrls", url));

    try {
      const result = await updateVehicleAction(vehicle.id, formData);
      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline">Edit</Button>} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Car</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-make-${vehicle.id}`}>Make</Label>
              <Input id={`ev-make-${vehicle.id}`} name="make" defaultValue={vehicle.make} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-model-${vehicle.id}`}>Model</Label>
              <Input id={`ev-model-${vehicle.id}`} name="model" defaultValue={vehicle.model} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-version-${vehicle.id}`}>Version</Label>
              <Input id={`ev-version-${vehicle.id}`} name="version" defaultValue={vehicle.version} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-year-${vehicle.id}`}>Year</Label>
              <Input id={`ev-year-${vehicle.id}`} name="year" type="number" defaultValue={vehicle.year} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-price-${vehicle.id}`}>Price (US$)</Label>
              <Input id={`ev-price-${vehicle.id}`} name="price" type="number" defaultValue={vehicle.price} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-monthly-payment-${vehicle.id}`}>
                Monthly Payment (US$, optional)
              </Label>
              <Input
                id={`ev-monthly-payment-${vehicle.id}`}
                name="monthlyPayment"
                type="number"
                defaultValue={vehicle.monthlyPayment ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-mileage-${vehicle.id}`}>Mileage</Label>
              <Input id={`ev-mileage-${vehicle.id}`} name="mileage" type="number" defaultValue={vehicle.mileage} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-category-${vehicle.id}`}>Category</Label>
              <select
                id={`ev-category-${vehicle.id}`}
                name="category"
                defaultValue={vehicle.category}
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-fuel-${vehicle.id}`}>Fuel</Label>
              <select
                id={`ev-fuel-${vehicle.id}`}
                name="fuel"
                defaultValue={vehicle.fuel}
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="nafta">Nafta</option>
                <option value="diesel">Diesel</option>
                <option value="hibrido">Híbrido</option>
                <option value="electrico">Eléctrico</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-transmission-${vehicle.id}`}>Transmission</Label>
              <select
                id={`ev-transmission-${vehicle.id}`}
                name="transmission"
                defaultValue={vehicle.transmission}
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="manual">Manual</option>
                <option value="automatica">Automática</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-status-${vehicle.id}`}>Status</Label>
              <select
                id={`ev-status-${vehicle.id}`}
                name="status"
                defaultValue={vehicle.status}
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="disponible">Disponible</option>
                <option value="reservado">Reservado</option>
                <option value="vendido">Vendido</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-location-${vehicle.id}`}>Location</Label>
              <Input id={`ev-location-${vehicle.id}`} name="location" defaultValue={vehicle.location} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-color-${vehicle.id}`}>Color</Label>
              <Input id={`ev-color-${vehicle.id}`} name="color" defaultValue={vehicle.color} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`ev-body-type-${vehicle.id}`}>Body Type</Label>
              <select
                id={`ev-body-type-${vehicle.id}`}
                name="bodyType"
                defaultValue={vehicle.bodyType}
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                {Object.entries(BODY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`ev-description-${vehicle.id}`}>Description</Label>
            <Textarea
              id={`ev-description-${vehicle.id}`}
              name="description"
              defaultValue={vehicle.description}
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Features</Label>
            <div className="grid grid-cols-2 gap-2">
              {VEHICLE_FEATURES.map((feature) => (
                <label key={feature} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="features"
                    value={feature}
                    defaultChecked={vehicle.features.includes(feature)}
                  />
                  {feature}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Current Photos</Label>
            {keptPhotos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No photos kept — add at least one below.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {keptPhotos.map((url) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-md">
                    <Image src={url} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`ev-photos-${vehicle.id}`}>Add Photos</Label>
            <input
              id={`ev-photos-${vehicle.id}`}
              name="newPhotos"
              type="file"
              accept="image/*"
              multiple
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" defaultChecked={vehicle.featured} />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="financingAvailable"
              defaultChecked={vehicle.financingAvailable}
            />
            Financing available
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
