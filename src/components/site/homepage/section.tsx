import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  tone: "dark" | "light";
  children: ReactNode;
  className?: string;
}

export function Section({ tone, children, className }: SectionProps) {
  return (
    <section
      className={cn(
        "py-12 md:py-20",
        tone === "dark"
          ? "bg-[#0d0d0d] text-white"
          : "bg-transparent text-[#0d0d0d]",
        className
      )}
    >
      <div className="mx-auto max-w-6xl px-4">{children}</div>
    </section>
  );
}
