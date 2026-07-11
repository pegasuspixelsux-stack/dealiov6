"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Section } from "./section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TradeInFormState {
  year: string;
  make: string;
  model: string;
  mileage: string;
  name: string;
  email: string;
}

const INITIAL_STATE: TradeInFormState = {
  year: "",
  make: "",
  model: "",
  mileage: "",
  name: "",
  email: "",
};

function validate(state: TradeInFormState): string | null {
  if (!state.year || !state.make || !state.model || !state.mileage) {
    return "Por favor completá el año, marca, modelo y kilometraje de tu vehículo.";
  }
  if (!state.name) {
    return "Por favor ingresá tu nombre.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
    return "Por favor ingresá un correo electrónico válido.";
  }
  return null;
}

export function TradeIn() {
  const [form, setForm] = useState<TradeInFormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(field: keyof TradeInFormState) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    // Placeholder submission: no Lead model/Firestore write exists yet.
    // A future Leads feature wires this into a real Lead record.
    setError(null);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Section tone="light" className="bg-[#edf2fb]">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-2xl tracking-tight">
            ¡Gracias! Nos pondremos en contacto.
          </h2>
          <p className="mt-2 text-[#0d0d0d]/70">
            Un integrante de nuestro equipo de canjes se pondrá en contacto
            pronto con el valor estimado de tu vehículo.
          </p>
        </div>
      </Section>
    );
  }

  return (
    <Section tone="light" className="bg-[#edf2fb]">
      <div className="mx-auto max-w-xl">
        <h2 className="font-heading mb-2 text-2xl tracking-tight">
          Conocé el Valor de tu Vehículo
        </h2>
        <p className="mb-6 text-[#0d0d0d]/70">
          Contanos sobre tu vehículo actual y te enviaremos una estimación.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ti-year">Año</Label>
              <Input
                id="ti-year"
                value={form.year}
                onChange={handleChange("year")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ti-mileage">Kilometraje</Label>
              <Input
                id="ti-mileage"
                value={form.mileage}
                onChange={handleChange("mileage")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ti-make">Marca</Label>
              <Input
                id="ti-make"
                value={form.make}
                onChange={handleChange("make")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ti-model">Modelo</Label>
              <Input
                id="ti-model"
                value={form.model}
                onChange={handleChange("model")}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ti-name">Tu Nombre</Label>
            <Input
              id="ti-name"
              value={form.name}
              onChange={handleChange("name")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ti-email">Correo Electrónico</Label>
            <Input
              id="ti-email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            className="bg-[#0d0d0d] text-white hover:bg-[#0d0d0d]/80"
          >
            Obtener mi Estimación
          </Button>
        </form>
      </div>
    </Section>
  );
}
