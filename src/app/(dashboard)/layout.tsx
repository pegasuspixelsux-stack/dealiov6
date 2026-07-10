import { redirect } from "next/navigation";
import { verifySession } from "@/lib/auth/dal";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh">
      <Sidebar role={session.role} />
      <div className="flex flex-1 flex-col">
        <Topbar user={session} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
