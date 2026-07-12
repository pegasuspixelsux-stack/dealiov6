"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrandAction } from "@/app/actions/brands";

export function AddBrandForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await createBrandAction(formData);
      if (result.success) {
        form.reset();
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
        <Label htmlFor="brand-name">Nombre de la marca</Label>
        <Input id="brand-name" name="name" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="brand-logo">Logo</Label>
        <input
          id="brand-logo"
          name="logo"
          type="file"
          accept="image/*"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Agregando..." : "+ Agregar Marca"}
      </Button>
    </form>
  );
}
