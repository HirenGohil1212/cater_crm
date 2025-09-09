
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
import { collection, query, onSnapshot, orderBy, DocumentData, QueryDocumentSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Users, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

type Order = {
  id: string;
  date: string;
  attendees: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  menuType: "veg" | "non-veg";
  userId: string;
  userName?: string;
  createdAt: any;
};

async function getUserName(userId: string): Promise<string> {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data().name || "Unknown User";
    }
    return "Unknown User";
}


export function AllOrdersTableManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { toast } = useToast();

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
                createdAt: data.createdAt,
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

  const handleConfirmOrder = async (orderId: string) => {
    setConfirmingId(orderId);
    const orderRef = doc(db, 'orders', orderId);
    try {
        await updateDoc(orderRef, {
            status: 'Confirmed'
        });
        toast({
            title: "Order Confirmed",
            description: "The client will be notified and you can now assign staff."
        });
    } catch(e) {
        console.error("Failed to confirm order: ", e);
        toast({
            title: "Confirmation Failed",
            description: "Could not update the order status. Please try again.",
            variant: "destructive"
        })
    } finally {
        setConfirmingId(null);
    }
  }

  if (loading) {
    return (
        <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4 items-center p-2">
                    <Skeleton className="h-5 w-full" />
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
    return <p className="text-center text-muted-foreground py-12">No orders have been placed yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Event Date</TableHead>
          <TableHead>Attendees</TableHead>
          <TableHead>Menu</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
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
            <TableCell>
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
             <TableCell className="text-right">
                {order.status === 'Pending' ? (
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleConfirmOrder(order.id)}
                        disabled={confirmingId === order.id}
                    >
                       {confirmingId === order.id ? (
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       ) : (
                           <CheckCircle className="mr-2 h-4 w-4" />
                       )}
                        Confirm Order
                    </Button>
                ) : (
                    <Link href={`/dashboard/operational-manager/assign/${order.id}`} passHref>
                        <Button variant="outline" size="sm">
                            <Users className="mr-2 h-4 w-4" />
                            Manage Staff
                        </Button>
                    </Link>
                )}
             </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
