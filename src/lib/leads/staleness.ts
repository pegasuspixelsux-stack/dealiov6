import type { LeadStage, LeadStageThresholds } from "@/types";

export type Staleness = "green" | "yellow" | "red";

export function getLeadStaleness(
  stage: LeadStage,
  updatedAt: string,
  thresholds: LeadStageThresholds
): Staleness | null {
  if (stage === "ganado" || stage === "perdido") return null;

  const minutesSinceUpdate = (Date.now() - new Date(updatedAt).getTime()) / 60_000;

  if (stage === "seguimiento") {
    const daysSinceUpdate = minutesSinceUpdate / (60 * 24);
    if (daysSinceUpdate <= thresholds.followUpYellowDays) return "green";
    if (daysSinceUpdate <= thresholds.followUpRedDays) return "yellow";
    return "red";
  }

  if (minutesSinceUpdate <= thresholds.fastStageYellowMinutes) return "green";
  if (minutesSinceUpdate <= thresholds.fastStageRedMinutes) return "yellow";
  return "red";
}
