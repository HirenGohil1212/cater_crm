
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Activity, CreditCard, DollarSign, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

type Order = {
    id: string;
    date: string;
    attendees: number;
    status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
    menuType: "veg" | "non-veg";
    createdAt: any; 
};

type Stats = {
    totalSpent: number;
    upcomingEvents: number;
    pendingOrders: number;
    recentActivity: {
        status: string;
        date: string;
    } | null;
};

export function ConsumerStats() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("userId", "==", user.uid));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const userOrders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            
            // Sort by creation date to find the most recent
            userOrders.sort((a,b) => {
                if (a.createdAt && b.createdAt) {
                    return b.createdAt.toMillis() - a.createdAt.toMillis()
                }
                return 0;
            });

            const newStats: Stats = {
                totalSpent: 0,
                upcomingEvents: 0,
                pendingOrders: 0,
                recentActivity: null,
            };

            const now = new Date();

            userOrders.forEach(order => {
                // Calculate total spent based on completed events (assuming $20 per attendee for calculation)
                if (order.status === "Completed") {
                    newStats.totalSpent += order.attendees * 20;
                }

                // Calculate upcoming events
                if (order.status === "Confirmed" && new Date(order.date) > now) {
                    newStats.upcomingEvents++;
                }
                
                // Calculate pending orders
                if (order.status === "Pending") {
                    newStats.pendingOrders++;
                }
            });

            // Set recent activity
            if (userOrders.length > 0) {
                const mostRecentOrder = userOrders[0];
                newStats.recentActivity = {
                    status: mostRecentOrder.status,
                    date: format(new Date(mostRecentOrder.date), "PPP"),
                };
            }

            setStats(newStats);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching stats:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><Skeleton className="h-4 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-4 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-4 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-4 w-2/3" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
            </div>
        )
    }

    if (!stats) {
         return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">$0.00</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">0</div></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">0</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">No activity</div></CardContent>
                </Card>
            </div>
        )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Spent
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              Based on completed events
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.upcomingEvents}</div>
            <p className="text-xs text-muted-foreground">
              Confirmed and upcoming
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.recentActivity ? (
                <>
                    <div className="text-2xl font-bold">{stats.recentActivity.status}</div>
                    <p className="text-xs text-muted-foreground">
                    Order for {stats.recentActivity.date}
                    </p>
                </>
            ) : (
                <div className="text-2xl font-bold">No Activity</div>
            )}
          </CardContent>
        </Card>
      </div>
    )
}
