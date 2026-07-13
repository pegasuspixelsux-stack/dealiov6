"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LEAD_STAGE_LABELS } from "@/types";
import type { Lead, LeadSource, LeadStageThresholds } from "@/types";
import { getLeadStaleness, type Staleness } from "@/lib/leads/staleness";
import { LeadDetailModal } from "./lead-detail-modal";

const STALENESS_COLORS: Record<Staleness, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  vehicle_inquiry: "Interés en vehículo",
  trade_in: "Canje",
  general_inquiry: "Consulta general",
};

const STALENESS_ORDER: Record<Staleness, number> = { red: 0, yellow: 1, green: 2 };

function daysWaiting(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
}

export function LeadsAttentionTable({
  leads,
  thresholds,
}: {
  leads: Lead[];
  thresholds: LeadStageThresholds;
}) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const waiting = leads
    .filter((lead) => lead.stage !== "ganado" && lead.stage !== "perdido")
    .map((lead) => ({
      lead,
      staleness: getLeadStaleness(lead.stage, lead.updatedAt, thresholds),
    }))
    .sort((a, b) => {
      const aOrder = a.staleness ? STALENESS_ORDER[a.staleness] : 3;
      const bOrder = b.staleness ? STALENESS_ORDER[b.staleness] : 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(a.lead.updatedAt).getTime() - new Date(b.lead.updatedAt).getTime();
    })
    .slice(0, 10);

  if (waiting.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay leads pendientes.</p>;
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Cliente</th>
            <th className="py-2 pr-4">Interés</th>
            <th className="py-2 pr-4">Origen</th>
            <th className="py-2 pr-4">Recibido</th>
            <th className="py-2 pr-4">Días esperando</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2 pr-4">Acción</th>
          </tr>
        </thead>
        <tbody>
          {waiting.map(({ lead, staleness }) => (
            <tr key={lead.id} className="border-b">
              <td className="py-2 pr-4">{lead.name}</td>
              <td className="line-clamp-1 max-w-48 py-2 pr-4">{lead.message}</td>
              <td className="py-2 pr-4">{SOURCE_LABELS[lead.source]}</td>
              <td className="py-2 pr-4">{new Date(lead.createdAt).toLocaleDateString()}</td>
              <td className="py-2 pr-4">{daysWaiting(lead.updatedAt)}</td>
              <td className="py-2 pr-4">
                <span className="flex items-center gap-2">
                  {staleness && (
                    <span className={`size-2 shrink-0 rounded-full ${STALENESS_COLORS[staleness]}`} />
                  )}
                  {LEAD_STAGE_LABELS[lead.stage]}
                </span>
              </td>
              <td className="py-2 pr-4">
                <Button size="sm" variant="outline" onClick={() => setSelectedLead(lead)}>
                  Abrir Lead
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </>
  );
}
