"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateLeadStageAction } from "@/app/actions/leads";
import { LEAD_STAGES, LEAD_STAGE_LABELS } from "@/types";
import type { Lead, LeadSource, LeadStage } from "@/types";

const SOURCE_LABELS: Record<LeadSource, string> = {
  vehicle_inquiry: "Interés en vehículo",
  trade_in: "Canje",
  general_inquiry: "Consulta general",
};

export function LeadDetailModal({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<LeadStage>(lead.stage);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      const result = await updateLeadStageAction(lead.id, stage);
      if (result.success) {
        router.refresh();
        onClose();
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lead.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Contacto</p>
            <p>{lead.contact}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Origen</p>
            <p>{SOURCE_LABELS[lead.source]}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Mensaje</p>
            <p>{lead.message}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Creado</p>
            <p>{new Date(lead.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Última actualización</p>
            <p>{new Date(lead.updatedAt).toLocaleString()}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ld-stage">Etapa</Label>
            <select
              id="ld-stage"
              value={stage}
              onChange={(event) => setStage(event.target.value as LeadStage)}
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              {LEAD_STAGES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
