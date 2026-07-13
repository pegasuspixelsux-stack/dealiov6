import type { Vehicle, Lead } from "@/types";

export interface TrendMetric {
  value: number;
  vsLastMonth: number | null;
  vsLastYear: number | null;
}

export interface DashboardStats {
  vehiclesPublished: TrendMetric;
  vehiclesSold: TrendMetric;
  leadsReceived: TrendMetric & { today: number };
  leadsConverted: TrendMetric & { conversionPercent: number };
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isSameMonth(date: Date, reference: Date): boolean {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

function countInMonth(dates: Date[], reference: Date): number {
  return dates.filter((date) => isSameMonth(date, reference)).length;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function computeDashboardStats(
  vehicles: Vehicle[],
  leads: Lead[],
  now: Date = new Date()
): DashboardStats {
  const lastMonth = addMonths(now, -1);
  const lastYear = addMonths(now, -12);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const publishedNow = vehicles.filter((v) => v.status === "disponible").length;
  const createdDates = vehicles.map((v) => new Date(v.createdAt));
  const addedThisMonth = countInMonth(createdDates, now);
  const addedLastMonth = countInMonth(createdDates, lastMonth);
  const addedLastYear = countInMonth(createdDates, lastYear);

  const soldDates = vehicles
    .filter((v): v is Vehicle & { soldAt: string } => typeof v.soldAt === "string")
    .map((v) => new Date(v.soldAt));
  const soldThisMonth = countInMonth(soldDates, now);
  const soldLastMonth = countInMonth(soldDates, lastMonth);
  const soldLastYearCount = countInMonth(soldDates, lastYear);

  const leadCreatedDates = leads.map((l) => new Date(l.createdAt));
  const leadsThisMonth = countInMonth(leadCreatedDates, now);
  const leadsLastMonth = countInMonth(leadCreatedDates, lastMonth);
  const leadsLastYearCount = countInMonth(leadCreatedDates, lastYear);
  const leadsToday = leadCreatedDates.filter((date) => date >= todayStart).length;

  const wonUpdatedDates = leads
    .filter((l) => l.stage === "ganado")
    .map((l) => new Date(l.updatedAt));
  const convertedThisMonth = countInMonth(wonUpdatedDates, now);
  const convertedLastMonth = countInMonth(wonUpdatedDates, lastMonth);
  const convertedLastYear = countInMonth(wonUpdatedDates, lastYear);
  const conversionPercent =
    leadsThisMonth === 0 ? 0 : Math.round((convertedThisMonth / leadsThisMonth) * 100);

  return {
    vehiclesPublished: {
      value: publishedNow,
      vsLastMonth: percentChange(addedThisMonth, addedLastMonth),
      vsLastYear: percentChange(addedThisMonth, addedLastYear),
    },
    vehiclesSold: {
      value: soldThisMonth,
      vsLastMonth: percentChange(soldThisMonth, soldLastMonth),
      vsLastYear: percentChange(soldThisMonth, soldLastYearCount),
    },
    leadsReceived: {
      value: leadsThisMonth,
      vsLastMonth: percentChange(leadsThisMonth, leadsLastMonth),
      vsLastYear: percentChange(leadsThisMonth, leadsLastYearCount),
      today: leadsToday,
    },
    leadsConverted: {
      value: convertedThisMonth,
      vsLastMonth: percentChange(convertedThisMonth, convertedLastMonth),
      vsLastYear: percentChange(convertedThisMonth, convertedLastYear),
      conversionPercent,
    },
  };
}
