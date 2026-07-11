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
import { createVehicleAction } from "./actions";

export function AddVehicleModal() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await createVehicleAction(formData);

    if (result.success) {
      setOpen(false);
      event.currentTarget.reset();
    } else {
      setError(result.error);
    }
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Add New Car</Button>} />
      <DialogContent>
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
              <Label htmlFor="av-year">Year</Label>
              <Input id="av-year" name="year" type="number" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="av-price">Price</Label>
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
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="av-imageUrl">Image URL</Label>
            <Input id="av-imageUrl" name="imageUrl" type="url" required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" />
            Featured
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
