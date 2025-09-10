
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, DocumentData, QueryDocumentSnapshot, doc, getDoc, updateDoc, writeBatch } from "firebase/firestore";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Check, FileWarning, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Staff } from "@/app/dashboard/admin/staff/page";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type Order = {
  id: string;
  date: string;
  attendees: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled" | "Reviewed";
  userId: string;
  userName?: string;
  createdAt: any;
  assignedStaff?: string[];
};

type Payout = {
    staffId: string;
    staffName: string;
    amount: number;
    perEventCharge: number;
}


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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

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
                assignedStaff: data.assignedStaff || [],
            };
        });

        const allOrders = await Promise.all(userOrdersPromises);
        const completedOrders = allOrders.filter(order => order.status === 'Completed');
        setOrders(completedOrders as Order[]);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching orders for review: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleReviewClick = async (order: Order) => {
      setSelectedOrder(order);
      setIsDialogOpen(true);
      setLoadingPayouts(true);
      
      if (order.assignedStaff && order.assignedStaff.length > 0) {
          const staffPromises = order.assignedStaff.map(staffId => getDoc(doc(db, 'staff', staffId)));
          const staffDocs = await Promise.all(staffPromises);
          const staffDetails = staffDocs
            .filter(doc => doc.exists())
            .map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            
          const initialPayouts = staffDetails.map(staff => ({
              staffId: staff.id,
              staffName: staff.name,
              amount: staff.perEventCharge || 0,
              perEventCharge: staff.perEventCharge || 0,
          }));
          setPayouts(initialPayouts);
      } else {
          setPayouts([]);
      }

      setLoadingPayouts(false);
  };
  
  const handlePayoutChange = (staffId: string, amount: string) => {
      const numericAmount = parseFloat(amount) || 0;
      setPayouts(prev => prev.map(p => p.staffId === staffId ? {...p, amount: numericAmount} : p));
  }

  const handleApprove = async () => {
      if (!selectedOrder) return;
      setIsApproving(true);
      
      const orderRef = doc(db, 'orders', selectedOrder.id);
      
      try {
          const batch = writeBatch(db);
          
          // Save each payout record
          payouts.forEach(payout => {
              const payoutRef = doc(collection(db, 'orders', selectedOrder.id, 'payouts'));
              batch.set(payoutRef, {
                  staffId: payout.staffId,
                  staffName: payout.staffName,
                  amount: payout.amount,
                  status: 'Pending', // Initial status
              });
          });

          // Update order status
          batch.update(orderRef, { status: 'Reviewed' });

          await batch.commit();
        
        toast({
            title: 'Event Approved',
            description: 'Staff payouts have been recorded and the event is passed to the Accountant.',
        });

      } catch (error) {
          console.error('Error approving event:', error);
          toast({
              variant: 'destructive',
              title: 'Approval Failed',
              description: 'Could not save payouts and approve the event. Please try again.',
          });
      } finally {
          setIsApproving(false);
          setIsDialogOpen(false);
          setSelectedOrder(null);
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
    <>
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
                    onClick={() => handleReviewClick(order)}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                    <Check className="mr-2 h-4 w-4" />
                    Review & Approve
                </Button>
             </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Review Event & Set Payouts</DialogTitle>
                <DialogDescription>
                    Confirm the payout amounts for each staff member for this event before approving.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                {loadingPayouts ? <Skeleton className="h-24 w-full" /> : (
                    payouts.length > 0 ? payouts.map(payout => (
                        <div key={payout.staffId} className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor={`payout-${payout.staffId}`} className="text-right col-span-1">
                                {payout.staffName}
                            </Label>
                            <Input 
                                id={`payout-${payout.staffId}`}
                                type="number"
                                value={payout.amount}
                                onChange={(e) => handlePayoutChange(payout.staffId, e.target.value)}
                                className="col-span-2"
                                placeholder={`Default: ₹${payout.perEventCharge}`}
                            />
                        </div>
                    )) : <p className="text-sm text-muted-foreground text-center">No staff were assigned to this event.</p>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleApprove} disabled={isApproving}>
                    {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isApproving ? 'Saving...' : 'Save & Approve'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
