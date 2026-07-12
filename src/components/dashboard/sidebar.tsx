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
  LogOut,
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
import { useLogout } from "@/hooks/use-logout";
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
];

const SETTINGS_ITEM: NavItem = {
  href: "/dashboard/settings",
  label: "Settings",
  icon: Settings,
  visible: (role) => can(role, "canAccessConfig"),
};

function NavLink({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
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
}

function NavList({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.filter((item) => item.visible(role)).map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={pathname === item.href}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-1 border-t pt-4">
        {SETTINGS_ITEM.visible(role) && (
          <NavLink
            item={SETTINGS_ITEM}
            isActive={pathname === SETTINGS_ITEM.href}
            onNavigate={onNavigate}
          />
        )}
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="size-4 shrink-0" />
          Log out
        </button>
      </div>
    </nav>
  );
}

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 border-r bg-sidebar md:block">
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
