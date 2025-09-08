
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
  Clipboard,
  LayoutDashboard,
  LogOut,
  MapPin,
  Settings,
  Shield,
  ShoppingCart,
  TrendingUp,
  UserCog,
  UtensilsCrossed,
  Users,
  Calendar,
  DollarSign,
  BarChart,
  User,
  FileText,
  LifeBuoy,
} from "lucide-react";
import { capitalize } from "@/lib/utils";

interface DashboardSidebarContentProps {
  role: string;
}

const navItems: { [key: string]: { href: string, label: string, icon: React.ElementType }[] } = {
  consumer: [
    { href: "/dashboard/consumer", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/consumer/orders", label: "My Orders", icon: ShoppingCart },
    { href: "/dashboard/consumer/billing", label: "Billing", icon: FileText },
    { href: "/dashboard/consumer/support", label: "Support", icon: LifeBuoy },
  ],
  'waiter': [
    { href: "/dashboard/waiter", label: "Dashboard", icon: LayoutDashboard },
  ],
  supervisor: [
    { href: "/dashboard/supervisor", label: "Staff Location", icon: MapPin },
  ],
  sales: [
    { href: "/dashboard/sales", label: "Sales Dashboard", icon: TrendingUp },
  ],
  hr: [
    { href: "/dashboard/hr", label: "HR Dashboard", icon: Users },
  ],
  accountant: [
    { href: "/dashboard/accountant", label: "Accounting", icon: Calculator },
  ],
  'operational-manager': [
      { href: "/dashboard/operational-manager", label: "Event Staffing", icon: Shield },
  ],
  admin: [
    { href: "/dashboard/admin", label: "Admin Dashboard", icon: Shield },
    { href: "/dashboard/admin/users", label: "Users", icon: User },
    { href: "/dashboard/admin/staff", label: "Staff", icon: Users },
    { href: "/dashboard/admin/events", label: "Events", icon: Calendar },
    { href: "/dashboard/admin/billing", label: "Billing", icon: DollarSign },
    { href: "/dashboard/admin/reports", label: "Reports", icon: BarChart },
  ],
};

export function DashboardSidebarContent({ role }: DashboardSidebarContentProps) {
  const pathname = usePathname();
  
  // Handle different waiter roles by mapping them to a single 'waiter' key
  const waiterRoles = ['waiter-steward', 'pro', 'senior-pro', 'captain-butler'];
  const navRole = waiterRoles.includes(role) ? 'waiter' : role;

  const currentNavItems = navItems[navRole as keyof typeof navItems] || [];

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <UtensilsCrossed className="h-6 w-6 text-primary" />
            </div>
            <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-sidebar-foreground">EventPro</h2>
                <p className="text-xs text-sidebar-foreground/70 -mt-1">{capitalize(role.replace('-', ' '))} View</p>
            </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {currentNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href)}
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
