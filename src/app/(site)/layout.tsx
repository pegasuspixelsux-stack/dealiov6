import { headers } from "next/headers";
import { SiteHeaderGate } from "@/components/site/site-header-gate";
import { Footer } from "@/components/site/footer";
import { getDealershipConfig, resolveDealershipId } from "@/lib/dealership/config";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const dealership = getDealershipConfig(
    resolveDealershipId(headerList.get("host"))
  );

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeaderGate dealership={dealership} />
      <main className="flex-1">{children}</main>
      <Footer dealership={dealership} />
    </div>
  );
}
