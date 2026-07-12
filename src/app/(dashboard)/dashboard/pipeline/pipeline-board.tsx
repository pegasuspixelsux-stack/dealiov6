"use client";

import { useState } from "react";
import { LEAD_STAGES, LEAD_STAGE_LABELS } from "@/types";
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

export function PipelineBoard({
  leads,
  thresholds,
}: {
  leads: Lead[];
  thresholds: LeadStageThresholds;
}) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STAGES.map((stage) => {
          const stageLeads = leads.filter((lead) => lead.stage === stage);
          return (
            <div key={stage} className="flex w-64 shrink-0 flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {LEAD_STAGE_LABELS[stage]} ({stageLeads.length})
              </h2>
              <div className="flex flex-col gap-2">
                {stageLeads.map((lead) => {
                  const staleness = getLeadStaleness(lead.stage, lead.updatedAt, thresholds);
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSelectedLead(lead)}
                      className="flex flex-col gap-1 rounded-md border p-3 text-left text-sm hover:bg-accent"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{lead.name}</span>
                        {staleness && (
                          <span
                            className={`size-2 shrink-0 rounded-full ${STALENESS_COLORS[staleness]}`}
                          />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {SOURCE_LABELS[lead.source]}
                      </span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {lead.message}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </>
  );
}
