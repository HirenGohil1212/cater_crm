import type { ReactNode } from 'react';
import { SidebarLayout } from '@/components/sidebar-layout';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
