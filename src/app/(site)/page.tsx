import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { getDealershipConfig, resolveDealershipId } from "@/lib/dealership/config";

export default async function HomePage() {
  const headerList = await headers();
  const dealership = getDealershipConfig(
    resolveDealershipId(headerList.get("host"))
  );

  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        {dealership.name}
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Foundation homepage placeholder — inventory, financing, and testimonials
        sections land in a follow-up plan.
      </p>
      <div className="flex gap-3">
        <Button
          size="lg"
          render={
            <a href={`https://wa.me/${dealership.whatsapp.replace(/[^\d]/g, "")}`}>
              Chat on WhatsApp
            </a>
          }
        />
        <Button
          variant="outline"
          size="lg"
          render={<a href={`tel:${dealership.phone}`}>Call {dealership.phone}</a>}
        />
      </div>
    </section>
  );
}
