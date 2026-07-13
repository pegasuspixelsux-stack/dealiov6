import { verifySession } from "@/lib/auth/dal";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { getLeads } from "@/lib/leads/leads";
import { computeDashboardStats } from "@/lib/dashboard/stats";
import { KpiCard } from "@/components/dashboard/kpi-card";

export default async function DashboardHomePage() {
  const session = await verifySession();
  if (!session) return null;

  const [vehicles, leads] = await Promise.all([
    getVehicles(session.dealershipId),
    getLeads(session.dealershipId),
  ]);
  const stats = computeDashboardStats(vehicles, leads);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {session.name}</h1>
        <p className="text-muted-foreground">
          Role: <span className="capitalize">{session.role}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Vehículos Publicados"
          value={stats.vehiclesPublished.value}
          vsLastMonth={stats.vehiclesPublished.vsLastMonth}
          vsLastYear={stats.vehiclesPublished.vsLastYear}
        />
        <KpiCard
          label="Vehículos Vendidos"
          value={stats.vehiclesSold.value}
          vsLastMonth={stats.vehiclesSold.vsLastMonth}
          vsLastYear={stats.vehiclesSold.vsLastYear}
        />
        <KpiCard
          label="Leads Recibidos"
          value={stats.leadsReceived.value}
          vsLastMonth={stats.leadsReceived.vsLastMonth}
          vsLastYear={stats.leadsReceived.vsLastYear}
          suffix={`(hoy: ${stats.leadsReceived.today})`}
        />
        <KpiCard
          label="Leads Convertidos"
          value={stats.leadsConverted.value}
          vsLastMonth={stats.leadsConverted.vsLastMonth}
          vsLastYear={stats.leadsConverted.vsLastYear}
          suffix={`(${stats.leadsConverted.conversionPercent}%)`}
        />
      </div>
    </div>
  );
}
