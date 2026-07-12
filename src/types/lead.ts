import { z } from "zod";

export type LeadSource = "vehicle_inquiry" | "trade_in" | "general_inquiry";

export type LeadStage =
  | "recibido"
  | "contactado"
  | "seguimiento"
  | "negociacion"
  | "ganado"
  | "perdido";

export const LEAD_STAGES: LeadStage[] = [
  "recibido",
  "contactado",
  "seguimiento",
  "negociacion",
  "ganado",
  "perdido",
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  recibido: "Recibido",
  contactado: "Contactado",
  seguimiento: "Seguimiento",
  negociacion: "Negociación",
  ganado: "Ganado",
  perdido: "Perdido",
};

export const leadStageSchema = z.enum([
  "recibido",
  "contactado",
  "seguimiento",
  "negociacion",
  "ganado",
  "perdido",
]);

export interface Lead {
  id: string;
  dealershipId: string;
  source: LeadSource;
  name: string;
  contact: string;
  message: string;
  stage: LeadStage;
  createdAt: string;
  updatedAt: string;
}

export const leadSchema = z.object({
  source: z.enum(["vehicle_inquiry", "trade_in", "general_inquiry"]),
  name: z.string().min(1),
  contact: z.string().min(1),
  message: z.string().min(1),
});
