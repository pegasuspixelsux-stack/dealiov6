import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DealershipConfig } from "@/types";

export function Logo({
  dealership,
  className,
}: {
  dealership: DealershipConfig;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 font-semibold", className)}
    >
      {dealership.logoUrl ? (
        <Image
          src={dealership.logoUrl}
          alt={dealership.name}
          width={32}
          height={32}
          className="rounded"
        />
      ) : (
        <span
          className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-bold"
          aria-hidden
        >
          {dealership.name.charAt(0)}
        </span>
      )}
      <span>{dealership.logoText || dealership.name}</span>
    </Link>
  );
}
