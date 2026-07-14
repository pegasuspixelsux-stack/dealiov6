import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  tone: "dark" | "light";
  children: ReactNode;
  className?: string;
  id?: string;
  noMobilePadding?: boolean;
}

export function Section({
  tone,
  children,
  className,
  id,
  noMobilePadding = false,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "py-12 md:py-20",
        tone === "dark"
          ? "bg-[#0d0d0d] text-white"
          : "bg-transparent text-[#0d0d0d]",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-[1440px] md:px-[50px]",
          noMobilePadding ? "px-0" : "px-4"
        )}
      >
        {children}
      </div>
    </section>
  );
}
