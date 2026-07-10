"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Users,
  BarChart3,
  UserCog,
  Settings,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { can } from "@/lib/auth/permissions";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: (role: Role) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, visible: () => true },
  { href: "/dashboard/inventory", label: "Inventory", icon: Car, visible: () => true },
  { href: "/dashboard/leads", label: "Leads", icon: Users, visible: () => true },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, visible: () => true },
  {
    href: "/dashboard/salespeople",
    label: "Salespeople",
    icon: UserCog,
    visible: (role) => can(role, "canManageSalespeople"),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    visible: (role) => can(role, "canAccessConfig"),
  },
];

function NavList({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      {NAV_ITEMS.filter((item) => item.visible(role)).map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:block">
      <NavList role={role} />
    </aside>
  );
}

/** Mobile-only hamburger trigger + slide-out nav, meant to live inside the Topbar. */
export function MobileNav({ role }: { role: Role }) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="size-5" />
            <span className="sr-only">Open navigation</span>
          </Button>
        }
      />
      <SheetContent side="left" className="w-60 p-0">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <NavList role={role} />
      </SheetContent>
    </Sheet>
  );
}
