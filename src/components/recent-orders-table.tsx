
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";

type Order = {
  id: string;
  date: string;
  attendees: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  menuType: "veg" | "non-veg";
};


export function RecentOrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };

    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("userId", "==", user.uid), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userOrders = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            return {
                id: doc.id,
                date: data.date,
                attendees: data.attendees,
                status: data.status,
                menuType: data.menuType,
            };
        }) as Order[];
        setOrders(userOrders);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching orders: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
        <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between items-center p-2">
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-5 w-1/4" />
                    <Skeleton className="h-5 w-1/6" />
                </div>
            ))}
        </div>
    )
  }
  
  if (!user) {
    return <p className="text-center text-muted-foreground">Please log in to see your orders.</p>
  }
  
  if (orders.length === 0) {
    return <p className="text-center text-muted-foreground">You haven't placed any orders yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event Date</TableHead>
          <TableHead>Attendees</TableHead>
          <TableHead>Menu</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.date}</TableCell>
            <TableCell>{order.attendees}</TableCell>
            <TableCell>
              <Badge variant={order.menuType === 'veg' ? 'secondary' : 'outline'}>
                {order.menuType === 'veg' ? 'Veg' : 'Non-Veg'}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Badge
                variant={
                  order.status === "Confirmed"
                    ? "default"
                    : order.status === "Pending"
                    ? "destructive"
                    : "secondary"
                }
              >
                {order.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
