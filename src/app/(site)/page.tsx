import { headers } from "next/headers";
import { getDealershipConfig, resolveDealershipId } from "@/lib/dealership/config";
import { Hero } from "@/components/site/homepage/hero";
import { CategoriesScroller } from "@/components/site/homepage/categories-scroller";
import { TrendVehicles } from "@/components/site/homepage/trend-vehicles";
import { About } from "@/components/site/homepage/about";
import { InventoryGrid } from "@/components/site/homepage/inventory-grid";
import { FinanceCalculator } from "@/components/site/homepage/finance-calculator";
import { TradeInTestimonials } from "@/components/site/homepage/trade-in-testimonials";
import { LeadFooter } from "@/components/site/homepage/lead-footer";

export default async function HomePage() {
  const headerList = await headers();
  const dealership = getDealershipConfig(
    resolveDealershipId(headerList.get("host"))
  );

  return (
    <>
      <Hero dealership={dealership} />
      <CategoriesScroller />
      <TrendVehicles dealership={dealership} />
      <About dealership={dealership} />
      <InventoryGrid dealership={dealership} />
      <FinanceCalculator />
      <TradeInTestimonials />
      <LeadFooter />
    </>
  );
}
