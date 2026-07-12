import { verifySession } from "@/lib/auth/dal";
import { getLeads } from "@/lib/leads/leads";
import type { LeadSource } from "@/types";

const SOURCE_LABELS: Record<LeadSource, string> = {
  vehicle_inquiry: "Interés en vehículo",
  trade_in: "Canje",
  general_inquiry: "Consulta general",
};

export default async function LeadsPage() {
  const session = await verifySession();
  if (!session) return null;

  const leads = await getLeads(session.dealershipId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Leads</h1>

      {leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leads yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Nombre</th>
              <th className="py-2 pr-4">Contacto</th>
              <th className="py-2 pr-4">Origen</th>
              <th className="py-2 pr-4">Mensaje</th>
              <th className="py-2 pr-4">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b">
                <td className="py-2 pr-4">{lead.name}</td>
                <td className="py-2 pr-4">{lead.contact}</td>
                <td className="py-2 pr-4">{SOURCE_LABELS[lead.source]}</td>
                <td className="py-2 pr-4">{lead.message}</td>
                <td className="py-2 pr-4">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
