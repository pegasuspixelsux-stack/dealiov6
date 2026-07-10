import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { ComingSoon, Forbidden } from "@/components/dashboard/coming-soon";

export default async function SalespeoplePage() {
  const session = await verifySession();
  if (!session || !can(session.role, "canManageSalespeople")) {
    return <Forbidden />;
  }
  return <ComingSoon title="Salespeople" />;
}
