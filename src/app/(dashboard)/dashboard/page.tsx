import { verifySession } from "@/lib/auth/dal";

export default async function DashboardHomePage() {
  const session = await verifySession();
  if (!session) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome, {session.name}</h1>
      <p className="text-muted-foreground">
        Role: <span className="capitalize">{session.role}</span>
      </p>
    </div>
  );
}
