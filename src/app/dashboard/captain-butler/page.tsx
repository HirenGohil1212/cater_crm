
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileClock, Loader2, CalendarCheck, FileEdit, Calculator } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, DocumentData, QueryDocumentSnapshot, doc, getDoc, updateDoc, setDoc, orderBy } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AvailabilityTab } from "@/components/availability-tab";
import type { GenerateInvoiceOutput } from "@/ai/flows/generate-invoice-flow";
import { generateInvoice } from "@/ai/flows/generate-invoice-flow";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FileText } from "lucide-react";


type Order = {
  id: string;
  date: string;
  attendees: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  menuType: "veg" | "non-veg";
  userId: string;
  clientName?: string;
  userName?: string;
  venue?: string;
  invoiceStatus: "Pending" | "Generated";
  createdAt: any;
};

type Invoice = GenerateInvoiceOutput & {
    id: string;
};


async function getClientNameForOrder(userId: string): Promise<string> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data().companyName || userDoc.data().name : 'Unknown Client';
}

async function getUserName(userId: string): Promise<string> {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data().companyName || userDocSnap.data().name || "Unknown User";
    }
    return "Unknown User";
}


function InvoiceList() {
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

function EventManagementTab() {
    const [events, setEvents] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const { toast } = useToast();
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const ordersQuery = query(
            collection(db, "orders"), 
            where('assignedStaff', 'array-contains', user.uid),
            where('status', 'in', ['Pending', 'Confirmed', 'Completed'])
        );
        
        const unsubscribe = onSnapshot(ordersQuery, async (snapshot) => {
            const eventPromises = snapshot.docs.map(async (docSnap: QueryDocumentSnapshot<DocumentData>) => {
                const data = docSnap.data();
                const clientName = await getClientNameForOrder(data.userId);
                return {
                    id: docSnap.id,
                    date: data.date,
                    attendees: data.attendees,
                    status: data.status,
                    clientName: clientName,
                    venue: data.venue || 'Venue not specified', // Assume venue might exist
                };
            });

            const eventList = await Promise.all(eventPromises);
            eventList.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setEvents(eventList as Order[]);
            setLoading(false);

        }, (error) => {
            console.error("Error fetching events:", error);
            setLoading(false);
        });

        return () => unsubscribe();

    }, [user]);

    const handleEndEvent = async (orderId: string) => {
        setIsUpdating(orderId);
        const orderRef = doc(db, 'orders', orderId);
        try {
            await updateDoc(orderRef, {
                status: 'Completed'
            });
            toast({
                title: "Event Completed",
                description: "The event has been marked as completed and is now ready for billing.",
            });
        } catch (error) {
            console.error("Error ending event:", error);
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not update the event status. Please try again.'
            })
        } finally {
            setIsUpdating(null);
        }
    }


    const renderContent = () => {
        if (loading) {
            return (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Event Date</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                             <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-9 w-28 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            )
        }

        if (events.length === 0) {
            return (
                 <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg bg-muted/30">
                    <FileClock className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">No Active Events</h3>
                    <p>You have not been assigned to any confirmed events.</p>
                </div>
            )
        }

        return (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Event Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                   {events.map(event => (
                     <TableRow key={event.id}>
                        <TableCell className="font-medium">{format(new Date(event.date), 'PPP')}</TableCell>
                        <TableCell>{event.clientName}</TableCell>
                        <TableCell>
                             <Badge variant={event.status === "Completed" ? "default" : (event.status === "Confirmed" ? "secondary" : "destructive")}>{event.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        size="sm" 
                                        disabled={event.status !== 'Confirmed' || isUpdating === event.id}
                                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                                    >
                                        {isUpdating === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        {event.status === 'Completed' ? 'Completed' : 'End Event'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure you want to end this event?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will mark the event as 'Completed' and make it available for invoicing. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleEndEvent(event.id)}>
                                            Yes, End Event
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                           </AlertDialog>
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => handleEndEvent(event.id)}>
                                Test End
                           </Button>
                        </TableCell>
                    </TableRow>
                   ))}
                </TableBody>
             </Table>
        )
    }

    return (
         <Card>
            <CardHeader>
                <CardTitle>Event Management</CardTitle>
                <CardDescription>Oversee and conclude your assigned events.</CardDescription>
            </CardHeader>
            <CardContent>
                {renderContent()}
            </CardContent>
        </Card>
    )
}

export default function CaptainButlerDashboardPage() {
    return (
        <Tabs defaultValue="events">
            <Card>
                 <CardHeader>
                    <CardTitle>Captain's Dashboard</CardTitle>
                    <CardDescription>Oversee events and manage your availability.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="events"><FileEdit className="mr-2 h-4 w-4" />Event Management</TabsTrigger>
                        <TabsTrigger value="availability"><CalendarCheck className="mr-2 h-4 w-4" />My Availability</TabsTrigger>
                        <TabsTrigger value="billing"><Calculator className="mr-2 h-4 w-4" />Billing & Finance</TabsTrigger>
                    </TabsList>
                </CardContent>
            </Card>

            <TabsContent value="events" className="mt-4">
                <EventManagementTab />
            </TabsContent>
            <TabsContent value="availability" className="mt-4">
                <AvailabilityTab />
            </TabsContent>
             <TabsContent value="billing" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Client Invoices</CardTitle>
                        <CardDescription>View all events and generate invoices. (Read-only for Captains)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <InvoiceList />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}

    