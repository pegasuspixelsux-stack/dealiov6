import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { ComingSoon, Forbidden } from "@/components/dashboard/coming-soon";

export default async function SettingsPage() {
  const session = await verifySession();
  if (!session || !can(session.role, "canAccessConfig")) {
    return <Forbidden />;
  }
  return <ComingSoon title="Settings" />;
}
