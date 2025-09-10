
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
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export function SidebarLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState('consumer');
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setRole(userDocSnap.data().role || 'consumer');
        }
      } else {
        setRole('consumer'); // Default or guest role
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <SidebarProvider>
        <Sidebar>
            <DashboardSidebarContent role={role} />
        </Sidebar>
        <SidebarInset>
            <DashboardHeader role={role} />
            <main className="p-4 sm:p-6 lg:p-8">
                {children}
            </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
