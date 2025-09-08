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
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, DocumentData, QueryDocumentSnapshot, doc, getDoc } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";

type Order = {
  id: string;
  date: string;
  attendees: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  menuType: "veg" | "non-veg";
  userId: string;
  userName?: string;
};

async function getUserName(userId: string): Promise<string> {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data().name || "Unknown User";
    }
    return "Unknown User";
}


export function AllOrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const userOrdersPromises = querySnapshot.docs.map(async (docSnap: QueryDocumentSnapshot<DocumentData>) => {
            const data = docSnap.data();
            const userName = await getUserName(data.userId);
            return {
                id: docSnap.id,
                date: data.date,
                attendees: data.attendees,
                status: data.status,
                menuType: data.menuType,
                userId: data.userId,
                userName: userName,
            };
        });

        const userOrders = await Promise.all(userOrdersPromises);
        setOrders(userOrders as Order[]);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching all orders: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
        <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-4 items-center p-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                </div>
            ))}
        </div>
    )
  }
  
  if (orders.length === 0) {
    return <p className="text-center text-muted-foreground">No orders have been placed yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Event Date</TableHead>
          <TableHead>Attendees</TableHead>
          <TableHead>Menu</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.userName}</TableCell>
            <TableCell>{order.date}</TableCell>
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
