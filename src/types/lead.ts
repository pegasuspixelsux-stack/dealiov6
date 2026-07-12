import { z } from "zod";

export type LeadSource = "vehicle_inquiry" | "trade_in" | "general_inquiry";

export interface Lead {
  id: string;
  dealershipId: string;
  source: LeadSource;
  name: string;
  contact: string;
  message: string;
  createdAt: string;
}

export const leadSchema = z.object({
  source: z.enum(["vehicle_inquiry", "trade_in", "general_inquiry"]),
  name: z.string().min(1),
  contact: z.string().min(1),
  message: z.string().min(1),
});
