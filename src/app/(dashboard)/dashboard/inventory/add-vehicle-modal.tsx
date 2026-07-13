"use client";

import { useState, type FormEvent } from "react";
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
import { createVehicleAction } from "./actions";

export function AddVehicleModal() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await createVehicleAction(formData);
      if (result.success) {
        setOpen(false);
        form.reset();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add New Car</Button>} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Car</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-make">Make</Label>
              <Input id="av-make" name="make" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-model">Model</Label>
              <Input id="av-model" name="model" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-version">Version</Label>
              <Input id="av-version" name="version" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-year">Year</Label>
              <Input id="av-year" name="year" type="number" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-price">Price (US$)</Label>
              <Input id="av-price" name="price" type="number" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-mileage">Mileage</Label>
              <Input id="av-mileage" name="mileage" type="number" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-category">Category</Label>
              <select
                id="av-category"
                name="category"
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-fuel">Fuel</Label>
              <select
                id="av-fuel"
                name="fuel"
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
              <Label htmlFor="av-transmission">Transmission</Label>
              <select
                id="av-transmission"
                name="transmission"
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="manual">Manual</option>
                <option value="automatica">Automática</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-status">Status</Label>
              <select
                id="av-status"
                name="status"
                required
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="disponible">Disponible</option>
                <option value="reservado">Reservado</option>
                <option value="vendido">Vendido</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-location">Location</Label>
              <Input id="av-location" name="location" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-color">Color</Label>
              <Input id="av-color" name="color" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-body-type">Body Type</Label>
              <select
                id="av-body-type"
                name="bodyType"
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
            <Label htmlFor="av-description">Description</Label>
            <Textarea id="av-description" name="description" rows={3} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Features</Label>
            <div className="grid grid-cols-2 gap-2">
              {VEHICLE_FEATURES.map((feature) => (
                <label key={feature} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="features" value={feature} />
                  {feature}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="av-photos">Photos (up to 8)</Label>
            <input
              id="av-photos"
              name="photos"
              type="file"
              accept="image/*"
              multiple
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="financingAvailable" />
            Financing available
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Adding..." : "Add Car"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
