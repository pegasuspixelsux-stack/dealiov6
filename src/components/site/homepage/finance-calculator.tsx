"use client";

import { useMemo, useState } from "react";
import { Section } from "./section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format-price";

export function FinanceCalculator() {
  const [price, setPrice] = useState(50000);
  const [downPayment, setDownPayment] = useState(5000);
  const [apr, setApr] = useState(6);
  const [termMonths, setTermMonths] = useState(60);

  const monthlyPayment = useMemo(() => {
    const principal = Math.max(price - downPayment, 0);
    const monthlyRate = apr / 100 / 12;

    if (monthlyRate === 0) {
      return termMonths > 0 ? principal / termMonths : 0;
    }

    const factor = Math.pow(1 + monthlyRate, termMonths);
    return (principal * (monthlyRate * factor)) / (factor - 1);
  }, [price, downPayment, apr, termMonths]);

  return (
    <Section tone="light" className="bg-[#eff1f3]">
      <h2 className="font-heading mb-6 text-2xl tracking-tight">
        Calculadora de Financiación
      </h2>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fc-price">
              Precio del Vehículo (US$)
            </Label>
            <Input
              id="fc-price"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fc-down">
              Anticipo (US$)
            </Label>
            <Input
              id="fc-down"
              type="number"
              min={0}
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fc-apr">
              Tasa de Interés Anual (%)
            </Label>
            <Input
              id="fc-apr"
              type="number"
              min={0}
              step={0.1}
              value={apr}
              onChange={(e) => setApr(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fc-term">
              Plazo (meses)
            </Label>
            <Input
              id="fc-term"
              type="number"
              min={1}
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value) || 1)}
            />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 border border-[#0d0d0d]/10 p-8 text-center">
          <p className="text-sm uppercase tracking-wide text-[#0d0d0d]/60">
            Cuota Mensual Estimada
          </p>
          <p
            data-testid="monthly-payment"
            className="font-heading text-5xl text-[#0d0d0d]"
          >
            {formatPrice(Math.round(monthlyPayment))}
          </p>
        </div>
      </div>
    </Section>
  );
}
