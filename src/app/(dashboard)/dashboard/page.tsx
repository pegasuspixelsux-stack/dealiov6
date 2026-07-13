import { verifySession } from "@/lib/auth/dal";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { getLeads } from "@/lib/leads/leads";
import { getInventorySettings } from "@/lib/vehicles/inventory-config";
import { getLeadStageThresholds } from "@/lib/leads/lead-config";
import { computeDashboardStats } from "@/lib/dashboard/stats";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { VehiclesAttentionTable } from "@/components/dashboard/vehicles-attention-table";
import { LeadsAttentionTable } from "@/components/dashboard/leads-attention-table";
import { QuickActions } from "@/components/dashboard/quick-actions";

export default async function DashboardHomePage() {
  const session = await verifySession();
  if (!session) return null;

  const [vehicles, leads, inventorySettings, leadThresholds] = await Promise.all([
    getVehicles(session.dealershipId),
    getLeads(session.dealershipId),
    getInventorySettings(session.dealershipId),
    getLeadStageThresholds(session.dealershipId),
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

      <QuickActions />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Vehículos Publicados Hace Más Tiempo</h2>
        <VehiclesAttentionTable
          vehicles={vehicles}
          staleListingDays={inventorySettings.staleListingDays}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Leads Esperando Hace Más Tiempo</h2>
        <LeadsAttentionTable leads={leads} thresholds={leadThresholds} />
      </section>
    </div>
  );
}
