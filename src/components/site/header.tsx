import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import type { DealershipConfig } from "@/types";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/inventory", label: "Inventario" },
  { href: "/contact", label: "Contacto" },
];

export function Header({ dealership }: { dealership: DealershipConfig }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo dealership={dealership} />

        <nav className="hidden gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button
          className="hidden md:inline-flex"
          render={<Link href="/login">Iniciar sesión</Link>}
        />

        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            }
          />
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>
                <Logo dealership={dealership} />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 px-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium"
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/login" className="text-sm font-medium">
                Iniciar sesión
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
