import Image from "next/image";
import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { Forbidden } from "@/components/dashboard/coming-soon";
import { getLeadStageThresholds } from "@/lib/leads/lead-config";
import { getBrands } from "@/lib/brands/brands";
import { LeadThresholdsForm } from "./lead-thresholds-form";
import { AddBrandForm } from "./add-brand-form";

export default async function SettingsPage() {
  const session = await verifySession();
  if (!session || !can(session.role, "canAccessConfig")) {
    return <Forbidden />;
  }

  const [thresholds, brands] = await Promise.all([
    getLeadStageThresholds(session.dealershipId),
    getBrands(session.dealershipId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Leads</h2>
        <LeadThresholdsForm initial={thresholds} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Marcas</h2>
        {brands.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay marcas todavía.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {brands.map((brand) => (
              <li key={brand.id} className="flex items-center gap-3">
                <div className="relative size-10 shrink-0">
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    className="rounded-md object-contain"
                  />
                </div>
                <span className="text-sm">{brand.name}</span>
              </li>
            ))}
          </ul>
        )}
        <AddBrandForm />
      </section>
    </div>
  );
}
