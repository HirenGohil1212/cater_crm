"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Building2,
  Calculator,
  CalendarCheck,
  ClipboardUser,
  LayoutDashboard,
  LogOut,
  MapPin,
  Settings,
  Shield,
  ShoppingCart,
  TrendingUp,
  User,
  UserCog,
  UtensilsCrossed
} from "lucide-react";
import { capitalize } from "@/lib/utils";

interface DashboardSidebarContentProps {
  role: string;
}

const navItems: { [key: string]: { href: string, label: string, icon: React.ElementType }[] } = {
  consumer: [
    { href: "/dashboard/consumer", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/consumer/orders", label: "My Orders", icon: ShoppingCart },
  ],
  waiter: [
    { href: "/dashboard/waiter", label: "Availability", icon: CalendarCheck },
  ],
  supervisor: [
    { href: "/dashboard/supervisor", label: "Staff Location", icon: MapPin },
  ],
  sales: [
    { href: "/dashboard/sales", label: "Client Management", icon: Building2 },
  ],
  hr: [
    { href: "/dashboard/hr", label: "Staff Agreements", icon: ClipboardUser },
  ],
  accountant: [
    { href: "/dashboard/accountant", label: "Accounting", icon: Calculator },
  ],
  admin: [
    { href: "/dashboard/admin", label: "System Admin", icon: Shield },
  ],
};

export function DashboardSidebarContent({ role }: DashboardSidebarContentProps) {
  const pathname = usePathname();
  const currentNavItems = navItems[role as keyof typeof navItems] || [];

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <UtensilsCrossed className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-sidebar-foreground">EventPro</h2>
                <p className="text-xs text-sidebar-foreground/70 -mt-1">{capitalize(role)} View</p>
            </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {currentNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
            <SidebarMenuItem>
                <Link href="#" passHref>
                    <SidebarMenuButton tooltip="Settings">
                        <Settings/>
                        <span>Settings</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/" passHref>
                    <SidebarMenuButton tooltip="Logout">
                        <LogOut/>
                        <span>Logout</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
