"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/site/header";
import type { DealershipConfig } from "@/types";

export function SiteHeaderGate({ dealership }: { dealership: DealershipConfig }) {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <Header dealership={dealership} />;
}
