import { verifySession } from "@/lib/auth/dal";
import { getLeads } from "@/lib/leads/leads";
import { getLeadStageThresholds } from "@/lib/leads/lead-config";
import { PipelineBoard } from "./pipeline-board";

export default async function PipelinePage() {
  const session = await verifySession();
  if (!session) return null;

  const [leads, thresholds] = await Promise.all([
    getLeads(session.dealershipId),
    getLeadStageThresholds(session.dealershipId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Pipeline</h1>
      <PipelineBoard leads={leads} thresholds={thresholds} />
    </div>
  );
}
