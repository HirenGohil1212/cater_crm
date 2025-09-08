
"use client";

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from '@/components/ui/sidebar';
import { DashboardSidebarContent } from './dashboard-sidebar-content';
import { DashboardHeader } from './dashboard-header';

export function SidebarLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  const segments = pathname.split('/').filter(Boolean);
  // segments[0] is 'dashboard', segments[1] is the role
  const role = segments.length > 1 && segments[0] === 'dashboard' ? segments[1] : 'consumer';

  const waiterRoles = ['waiter-steward', 'pro', 'senior-pro', 'captain-butler'];
  const determinedRole = waiterRoles.includes(role) ? 'waiter-steward' : role;


  return (
    <SidebarProvider>
        <Sidebar>
            <DashboardSidebarContent role={determinedRole} />
        </Sidebar>
        <SidebarInset>
            <DashboardHeader role={determinedRole} />
            <main className="p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
