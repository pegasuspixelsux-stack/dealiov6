import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { Forbidden } from "@/components/dashboard/coming-soon";
import { getLeadStageThresholds } from "@/lib/leads/lead-config";
import { LeadThresholdsForm } from "./lead-thresholds-form";

export default async function SettingsPage() {
  const session = await verifySession();
  if (!session || !can(session.role, "canAccessConfig")) {
    return <Forbidden />;
  }

  const thresholds = await getLeadStageThresholds(session.dealershipId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Leads</h2>
        <LeadThresholdsForm initial={thresholds} />
      </section>
    </div>
  );
}
