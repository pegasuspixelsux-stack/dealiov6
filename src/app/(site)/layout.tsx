import { headers } from "next/headers";
import { Header } from "@/components/site/header";
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
      <Header dealership={dealership} />
      <main className="flex-1">{children}</main>
      <Footer dealership={dealership} />
    </div>
  );
}
