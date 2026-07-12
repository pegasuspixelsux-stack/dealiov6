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
import { createLeadAction } from "@/app/actions/leads";
import type { DealershipConfig, Vehicle } from "@/types";

export function VehicleInquiryButton({
  vehicle,
  dealership,
  dark = false,
}: {
  vehicle: Vehicle;
  dealership: DealershipConfig;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const message = encodeURIComponent(
    `Hola, me interesa el ${vehicle.make} ${vehicle.model} ${vehicle.year}.`
  );
  const whatsappHref = `https://wa.me/${dealership.whatsapp.replace(/[^\d]/g, "")}?text=${message}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const result = await createLeadAction({
        dealershipId: dealership.id,
        source: "vehicle_inquiry",
        name,
        contact: phone,
        message: `Interesado en ${vehicle.make} ${vehicle.model} ${vehicle.year}`,
      });

      if (result.success) {
        setOpen(false);
        window.location.href = whatsappHref;
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className={
              dark
                ? "bg-[#0d0d0d] text-white hover:bg-[#0d0d0d]/80"
                : "bg-white text-[#0d0d0d] hover:bg-white/80"
            }
          >
            Consultar
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Consultar por este vehículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="vi-name">Nombre</Label>
            <Input
              id="vi-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="vi-phone">Número de WhatsApp</Label>
            <Input
              id="vi-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando..." : "Continuar a WhatsApp"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
