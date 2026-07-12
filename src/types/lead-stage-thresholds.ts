import { z } from "zod";

export interface LeadStageThresholds {
  fastStageYellowMinutes: number;
  fastStageRedMinutes: number;
  followUpYellowDays: number;
  followUpRedDays: number;
}

export const DEFAULT_LEAD_STAGE_THRESHOLDS: LeadStageThresholds = {
  fastStageYellowMinutes: 15,
  fastStageRedMinutes: 60,
  followUpYellowDays: 3,
  followUpRedDays: 7,
};

export const leadStageThresholdsSchema = z.object({
  fastStageYellowMinutes: z.number().positive(),
  fastStageRedMinutes: z.number().positive(),
  followUpYellowDays: z.number().positive(),
  followUpRedDays: z.number().positive(),
});
