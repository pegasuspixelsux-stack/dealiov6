function formatTrend(value: number | null): string {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value}%`;
}

export function KpiCard({
  label,
  value,
  vsLastMonth,
  vsLastYear,
  suffix,
}: {
  label: string;
  value: number;
  vsLastMonth: number | null;
  vsLastYear: number | null;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold">
        {value}
        {suffix && (
          <span className="ml-1 text-base font-normal text-muted-foreground">
            {suffix}
          </span>
        )}
      </p>
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        <span>{formatTrend(vsLastMonth)} vs. mes pasado</span>
        <span>{formatTrend(vsLastYear)} vs. año pasado</span>
      </div>
    </div>
  );
}
