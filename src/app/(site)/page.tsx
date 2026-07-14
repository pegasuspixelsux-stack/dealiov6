import { headers } from "next/headers";
import { getDealershipConfig, resolveDealershipId } from "@/lib/dealership/config";
import { getVehicles } from "@/lib/vehicles/vehicles";
import { getBrands } from "@/lib/brands/brands";
import { Hero } from "@/components/site/homepage/hero";
import { BrandScroller } from "@/components/site/homepage/brand-scroller";
import { TrendVehicles } from "@/components/site/homepage/trend-vehicles";
import { About } from "@/components/site/homepage/about";
import { InventoryGrid } from "@/components/site/homepage/inventory-grid";
import { FinanceCalculator } from "@/components/site/homepage/finance-calculator";
import { TradeInSection } from "@/components/site/homepage/trade-in-section";
import { LeadTestimonials } from "@/components/site/homepage/lead-testimonials";
import { WhatsAppFab } from "@/components/site/homepage/whatsapp-fab";

export default async function HomePage() {
  const headerList = await headers();
  const dealership = await getDealershipConfig(
    resolveDealershipId(headerList.get("host"))
  );
  const [vehicles, brands] = await Promise.all([
    getVehicles(dealership.id),
    getBrands(dealership.id),
  ]);

  return (
    <>
      <Hero dealership={dealership} />
      <BrandScroller brands={brands} />
      <TrendVehicles dealership={dealership} vehicles={vehicles} />
      <About dealership={dealership} />
      <InventoryGrid dealership={dealership} vehicles={vehicles} />
      <FinanceCalculator />
      <TradeInSection dealershipId={dealership.id} />
      <LeadTestimonials dealershipId={dealership.id} />
      <WhatsAppFab dealership={dealership} />
    </>
  );
}
