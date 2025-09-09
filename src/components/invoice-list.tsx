
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
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, DocumentData, QueryDocumentSnapshot, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import type { GenerateInvoiceOutput } from "@/ai/flows/generate-invoice-flow";
import { generateInvoice } from "@/ai/flows/generate-invoice-flow";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

type Order = {
  id: string;
  date: string;
  attendees: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  menuType: "veg" | "non-veg";
  userId: string;
  userName?: string;
  invoiceStatus: "Pending" | "Generated";
  createdAt: any;
};

type Invoice = GenerateInvoiceOutput & {
    id: string;
};

async function getUserName(userId: string): Promise<string> {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data().companyName || userDocSnap.data().name || "Unknown User";
    }
    return "Unknown User";
}

export function InvoiceList() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
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
                  invoiceStatus: data.invoiceStatus || "Pending",
                  createdAt: data.createdAt
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

    const handleGenerateInvoice = async (order: Order) => {
        setIsGenerating(order.id);
        try {
            const invoiceData = await generateInvoice({ orderId: order.id });
            
            // Add client ID to invoice data before saving
            const invoiceWithClient = {
                ...invoiceData,
                client: { ...invoiceData.client, id: order.userId }
            };

            const orderRef = doc(db, 'orders', order.id);
            await updateDoc(orderRef, { invoiceStatus: 'Generated' });
            
            const invoiceRef = doc(db, 'invoices', order.id);
            await setDoc(invoiceRef, invoiceWithClient);

            toast({ title: "Invoice Generated", description: `Invoice for order ${order.id} has been created.` });

        } catch (error) {
            console.error("Error generating invoice:", error);
            toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not generate the invoice.' });
        } finally {
            setIsGenerating(null);
        }
    };
    
    const handleViewInvoice = async (orderId: string) => {
        const invoiceRef = doc(db, 'invoices', orderId);
        const invoiceSnap = await getDoc(invoiceRef);
        if(invoiceSnap.exists()){
            setSelectedInvoice({id: invoiceSnap.id, ...invoiceSnap.data()} as Invoice);
            setIsViewOpen(true);
        } else {
             toast({ variant: 'destructive', title: 'Not Found', description: 'Invoice data not found.' });
        }
    }


    if (loading) {
        return (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Event Date</TableHead>
                        <TableHead>Attendees</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                    </TableRow>
                ))}
                </TableBody>
             </Table>
        )
      }
      
      if (orders.length === 0) {
        return <p className="text-center text-muted-foreground py-12">No orders to invoice yet.</p>
      }

    return (
        <>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Attendees</TableHead>
                    <TableHead>Event Status</TableHead>
                    <TableHead>Invoice Status</TableHead>
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
                            <Badge variant={order.status === "Completed" ? "default" : "secondary"}>{order.status}</Badge>
                        </TableCell>
                         <TableCell>
                            <Badge variant={order.invoiceStatus === 'Generated' ? 'secondary' : 'destructive'}>{order.invoiceStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button 
                             variant="outline" 
                             size="sm"
                             disabled={isGenerating === order.id}
                             onClick={() => order.invoiceStatus === 'Generated' ? handleViewInvoice(order.id) : handleGenerateInvoice(order)}
                            >
                             {isGenerating === order.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                             {order.invoiceStatus === 'Generated' ? 'View Invoice' : 'Generate Invoice'}
                           </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>

        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
            <DialogContent className="sm:max-w-2xl">
                 {selectedInvoice && (
                     <>
                        <DialogHeader>
                            <DialogTitle>Invoice #{selectedInvoice.invoiceNumber}</DialogTitle>
                            <DialogDescription>
                                Invoice for {selectedInvoice.client.name} - Event on {selectedInvoice.eventDate}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 p-4 border rounded-lg">
                           <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <h4 className="font-semibold">Billed To:</h4>
                                    <p>{selectedInvoice.client.name}</p>
                                    <p>{selectedInvoice.client.address}</p>
                                    <p>GSTIN: {selectedInvoice.client.gstin || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                     <h4 className="font-semibold">Invoice Date:</h4>
                                     <p>{selectedInvoice.invoiceDate}</p>
                                </div>
                           </div>
                           <Separator />
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Description</TableHead>
                                       <TableHead className="text-right">Amount</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {selectedInvoice.lineItems.map((item, index) => (
                                     <TableRow key={index}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right">₹{item.amount.toFixed(2)}</TableCell>
                                     </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                           <Separator />
                           <div className="grid grid-cols-2 gap-4 text-sm">
                                <div></div>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal:</span>
                                        <span className="font-medium">₹{selectedInvoice.subtotal.toFixed(2)}</span>
                                    </div>
                                     <div className="flex justify-between">
                                        <span className="text-muted-foreground">GST ({selectedInvoice.gstRate}%):</span>
                                        <span className="font-medium">₹{selectedInvoice.gstAmount.toFixed(2)}</span>
                                    </div>
                                     <div className="flex justify-between font-bold text-base">
                                        <span>Total:</span>
                                        <span>₹{selectedInvoice.totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                           </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
                        </DialogFooter>
                     </>
                 )}
            </DialogContent>
        </Dialog>
        </>
    )
}
