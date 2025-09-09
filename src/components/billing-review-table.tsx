
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
import { Check, FileWarning, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Order = {
  id: string;
  date: string;
  attendees: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled" | "Reviewed";
  userId: string;
  userName?: string;
  createdAt: any;
};

async function getUserName(userId: string): Promise<string> {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data().companyName || userDocSnap.data().name || "Unknown User";
    }
    return "Unknown User";
}


export function BillingReviewTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
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
                userId: data.userId,
                userName: userName,
                createdAt: data.createdAt,
            };
        });

        const allOrders = await Promise.all(userOrdersPromises);
        // Filter for only "Completed" events on the client side
        const completedOrders = allOrders.filter(order => order.status === 'Completed');
        setOrders(completedOrders as Order[]);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching orders for review: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleApprove = async (orderId: string) => {
      setApproving(orderId);
      const orderRef = doc(db, 'orders', orderId);
      try {
        await updateDoc(orderRef, {
            status: 'Reviewed'
        });
        toast({
            title: 'Event Approved',
            description: 'This event has been passed to the Accountant for invoicing.',
        });
      } catch (error) {
          console.error('Error approving event:', error);
          toast({
              variant: 'destructive',
              title: 'Approval Failed',
              description: 'Could not approve the event. Please try again.',
          });
      } finally {
          setApproving(null);
      }
  }

  if (loading) {
    return (
        <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="grid grid-cols-4 gap-4 items-center p-2">
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
    return (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-48 border-2 border-dashed rounded-lg bg-muted/30">
            <FileWarning className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold">No Events to Review</h3>
            <p>There are no completed events waiting for your review.</p>
        </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Event Date</TableHead>
          <TableHead>Attendees</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.userName}</TableCell>
            <TableCell>{order.date}</TableCell>
            <TableCell>{order.attendees}</TableCell>
             <TableCell className="text-right">
                <Button 
                    variant="default" 
                    size="sm"
                    disabled={approving === order.id}
                    onClick={() => handleApprove(order.id)}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                    {approving === order.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Review & Approve
                </Button>
             </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
