
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Users, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, DocumentData, QueryDocumentSnapshot, doc, getDoc, updateDoc, setDoc, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import type { GenerateInvoiceOutput } from "@/ai/flows/generate-invoice-flow";
import { generateInvoice } from "@/ai/flows/generate-invoice-flow";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

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

type Client = {
    id: string;
    name: string;
    companyName: string;
};

type LedgerEntry = {
    date: string;
    description: string;
    invoiceNumber: string;
    debit: number;
    credit: number;
};


async function getUserName(userId: string): Promise<string> {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data().companyName || userDocSnap.data().name || "Unknown User";
    }
    return "Unknown User";
}


function ClientLedgers() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [ledgerData, setLedgerData] = useState<Record<string, LedgerEntry[]>>({});
    const [loadingLedger, setLoadingLedger] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "consumer"), orderBy("companyName"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const clientList = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                companyName: doc.data().companyName
            } as Client));
            setClients(clientList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching clients:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fetchLedgerForClient = useCallback(async (clientId: string) => {
        if (ledgerData[clientId] || loadingLedger[clientId]) return;

        setLoadingLedger(prev => ({ ...prev, [clientId]: true }));

        try {
            // Fetch invoices for the client
            const invoicesRef = collection(db, "invoices");
            const invoicesQuery = query(invoicesRef, where("client.id", "==", clientId));
            const invoiceSnap = await getDocs(invoicesQuery);
            
            const entries: LedgerEntry[] = invoiceSnap.docs.map(doc => {
                const data = doc.data() as Invoice;
                return {
                    date: data.invoiceDate,
                    description: `Invoice for Event on ${data.eventDate}`,
                    invoiceNumber: data.invoiceNumber,
                    debit: data.totalAmount,
                    credit: 0,
                };
            });

            // You could also fetch payments here and add them as credit entries

            entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            setLedgerData(prev => ({ ...prev, [clientId]: entries }));

        } catch (error) {
            console.error("Error fetching ledger data:", error);
        } finally {
            setLoadingLedger(prev => ({ ...prev, [clientId]: false }));
        }
    }, [ledgerData, loadingLedger]);

    const renderLedgerTable = (clientId: string) => {
        const entries = ledgerData[clientId] || [];
        let balance = 0;

        return (
            <div className="p-2 bg-muted/50 rounded-md">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Invoice #</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingLedger[clientId] && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                </TableCell>
                            </TableRow>
                        )}
                        {!loadingLedger[clientId] && entries.length === 0 && (
                             <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">No transactions found for this client.</TableCell>
                            </TableRow>
                        )}
                        {entries.map((entry, index) => {
                            balance += entry.debit - entry.credit;
                            return (
                                <TableRow key={index}>
                                    <TableCell>{entry.date}</TableCell>
                                    <TableCell>{entry.description}</TableCell>
                                    <TableCell>{entry.invoiceNumber}</TableCell>
                                    <TableCell className="text-right">₹{entry.debit.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">₹{entry.credit.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-medium">₹{balance.toFixed(2)}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        )
    }

    if (loading) {
        return <Skeleton className="h-64 w-full" />
    }

    if(clients.length === 0) {
        return <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg bg-muted/30">
            <Users className="h-16 w-16 mb-4" />
            <h3 className="text-xl font-semibold">No Clients Found</h3>
            <p>Once clients are added, their ledgers will appear here.</p>
        </div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Client Ledgers</CardTitle>
                <CardDescription>View detailed financial ledgers for each client.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {clients.map(client => (
                        <AccordionItem value={client.id} key={client.id}>
                            <AccordionTrigger onOpen={() => fetchLedgerForClient(client.id)}>
                                {client.companyName}
                            </AccordionTrigger>
                            <AccordionContent>
                               {renderLedgerTable(client.id)}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
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


export default function AccountantDashboardPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & Finance</CardTitle>
        <CardDescription>
          Handle GST/Non-GST bills, ledgers, and staff payouts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="invoices">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices">
              <FileText className="mr-2 h-4 w-4" />
              Invoicing
            </TabsTrigger>
            <TabsTrigger value="ledgers">
              <Users className="mr-2 h-4 w-4" />
              Client Ledgers
            </TabsTrigger>
            <TabsTrigger value="payouts">
              <DollarSign className="mr-2 h-4 w-4" />
              Staff Payouts
            </TabsTrigger>
          </TabsList>
          <TabsContent value="invoices" className="mt-4">
              <Card>
                <CardHeader>
                    <CardTitle>Client Invoices</CardTitle>
                    <CardDescription>Generate and manage invoices for all client events.</CardDescription>
                </CardHeader>
                <CardContent>
                    <InvoiceList />
                </CardContent>
              </Card>
          </TabsContent>
          <TabsContent value="ledgers" className="mt-4">
              <ClientLedgers />
          </TabsContent>
          <TabsContent value="payouts">
              <Card>
                 <CardHeader>
                    <CardTitle>Staff Payouts</CardTitle>
                    <CardDescription>Approve and process payouts for staff members.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg bg-muted/30">
                        <DollarSign className="h-16 w-16 mb-4" />
                        <h3 className="text-xl font-semibold">Staff Payouts</h3>
                        <p>Feature coming soon.</p>
                    </div>
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
