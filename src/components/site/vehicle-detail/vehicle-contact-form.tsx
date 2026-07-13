"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createLeadAction } from "@/app/actions/leads";
import type { DealershipConfig, PreferredContact, Vehicle } from "@/types";

export function VehicleContactForm({
  vehicle,
  dealership,
}: {
  vehicle: Vehicle;
  dealership: DealershipConfig;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [preferredContact, setPreferredContact] =
    useState<PreferredContact>("whatsapp");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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
        message:
          message || `Interesado en ${vehicle.make} ${vehicle.model} ${vehicle.year}`,
        email: email || undefined,
        preferredContact,
      });

      if (result.success) {
        setSent(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Algo salió mal. Por favor intentá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-green-700">
        ¡Gracias! Recibimos tu consulta y te vamos a contactar pronto.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="font-heading text-lg tracking-tight">
        Solicitá información
      </h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="vc-name">Nombre</Label>
        <Input id="vc-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="vc-phone">Teléfono</Label>
        <Input id="vc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="vc-email">Email</Label>
        <Input id="vc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="vc-message">Mensaje</Label>
        <Textarea id="vc-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Medio de contacto preferido</Label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="preferredContact"
              checked={preferredContact === "whatsapp"}
              onChange={() => setPreferredContact("whatsapp")}
            />
            WhatsApp
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="preferredContact"
              checked={preferredContact === "email"}
              onChange={() => setPreferredContact("email")}
            />
            Email
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="preferredContact"
              checked={preferredContact === "phone"}
              onChange={() => setPreferredContact("phone")}
            />
            Teléfono
          </label>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar consulta"}
      </Button>
    </form>
  );
}
