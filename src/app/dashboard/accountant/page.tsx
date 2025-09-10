
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
  DialogClose,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Users, Loader2, PlusCircle, CheckCircle } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, DocumentData, QueryDocumentSnapshot, doc, getDoc, updateDoc, setDoc, where, getDocs, addDoc, serverTimestamp, collectionGroup } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import type { GenerateInvoiceOutput } from "@/ai/flows/generate-invoice-flow";
import { generateInvoice } from "@/ai/flows/generate-invoice-flow";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { InvoiceList } from "@/components/invoice-list";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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
    reference: string;
    debit: number;
    credit: number;
    type: 'invoice' | 'payment';
};

type Payout = {
    id: string;
    orderId: string;
    staffId: string;
    staffName: string;
    amount: number;
    status: 'Pending' | 'Paid';
    clientName?: string;
    eventDate?: string;
};

const paymentSchema = z.object({
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0."),
    date: z.date(),
    description: z.string().min(3, "A description is required."),
});


async function getUserName(userId: string): Promise<string> {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data().companyName || userDocSnap.data().name || "Unknown User";
    }
    return "Unknown User";
}

function StaffPayouts() {
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [payingId, setPayingId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const payoutsQuery = query(collectionGroup(db, 'payouts'), where('status', '==', 'Pending'));

        const unsubscribe = onSnapshot(payoutsQuery, async (snapshot) => {
            const payoutPromises = snapshot.docs.map(async (payoutDoc) => {
                const payoutData = payoutDoc.data();
                const orderId = payoutDoc.ref.parent.parent!.id;
                
                const orderRef = doc(db, 'orders', orderId);
                const orderSnap = await getDoc(orderRef);
                
                let clientName = 'Unknown Client';
                let eventDate = 'Unknown Date';

                if(orderSnap.exists()){
                    const orderData = orderSnap.data();
                    clientName = await getUserName(orderData.userId);
                    eventDate = orderData.date;
                }

                return {
                    id: payoutDoc.id,
                    orderId: orderId,
                    ...payoutData,
                    clientName: clientName,
                    eventDate: eventDate,
                } as Payout;
            });

            const payoutList = await Promise.all(payoutPromises);
            setPayouts(payoutList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleApprovePayment = async (payout: Payout) => {
        setPayingId(payout.id);
        const payoutRef = doc(db, 'orders', payout.orderId, 'payouts', payout.id);
        try {
            await updateDoc(payoutRef, { status: 'Paid' });
            toast({
                title: "Payment Approved",
                description: `Payment of ₹${payout.amount} for ${payout.staffName} has been marked as paid.`,
            });
        } catch (error) {
            console.error("Error approving payment:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not approve the payment." });
        } finally {
            setPayingId(null);
        }
    };

    if (loading) {
        return <Skeleton className="w-full h-64" />;
    }

    if (payouts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg bg-muted/30">
                <DollarSign className="h-16 w-16 mb-4" />
                <h3 className="text-xl font-semibold">All Payouts Settled</h3>
                <p>There are no pending staff payouts.</p>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Staff Payouts</CardTitle>
                <CardDescription>Approve and process payouts for staff members.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Staff Name</TableHead>
                            <TableHead>Client / Event</TableHead>
                            <TableHead>Event Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payouts.map((payout) => (
                            <TableRow key={payout.id}>
                                <TableCell className="font-medium">{payout.staffName}</TableCell>
                                <TableCell>{payout.clientName}</TableCell>
                                <TableCell>{payout.eventDate ? format(new Date(payout.eventDate), 'PPP') : 'N/A'}</TableCell>
                                <TableCell>₹{payout.amount.toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        size="sm"
                                        disabled={payingId === payout.id}
                                        onClick={() => handleApprovePayment(payout)}
                                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                                    >
                                        {payingId === payout.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        Approve Payment
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function ClientLedgers() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [ledgerData, setLedgerData] = useState<Record<string, LedgerEntry[]>>({});
    const [loadingLedger, setLoadingLedger] = useState<Record<string, boolean>>({});
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof paymentSchema>>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            amount: 0,
            date: new Date(),
            description: ""
        }
    });

    useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "consumer"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const clientList = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                companyName: doc.data().companyName
            } as Client));
            clientList.sort((a, b) => a.companyName.localeCompare(b.companyName));
            setClients(clientList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching clients:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fetchLedgerForClient = useCallback(async (clientId: string) => {
        if (!clientId || ledgerData[clientId] || loadingLedger[clientId]) return;

        setLoadingLedger(prev => ({ ...prev, [clientId]: true }));

        try {
            let entries: LedgerEntry[] = [];

            // Fetch invoices for the client (Debit)
            const invoicesQuery = query(collection(db, "invoices"), where("client.id", "==", clientId));
            const invoiceSnap = await getDocs(invoicesQuery);
            const invoiceEntries: LedgerEntry[] = invoiceSnap.docs.map(doc => {
                const data = doc.data() as Invoice;
                return {
                    date: data.invoiceDate,
                    description: `Invoice for Event on ${data.eventDate}`,
                    reference: data.invoiceNumber,
                    debit: data.totalAmount,
                    credit: 0,
                    type: 'invoice',
                };
            });
            entries = [...entries, ...invoiceEntries];

            // Fetch payments for the client (Credit)
            const paymentsQuery = query(collection(db, "payments"), where("clientId", "==", clientId));
            const paymentSnap = await getDocs(paymentsQuery);
            const paymentEntries: LedgerEntry[] = paymentSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    date: data.date.split('T')[0],
                    description: data.description,
                    reference: `PAY-${doc.id.slice(-6).toUpperCase()}`,
                    debit: 0,
                    credit: data.amount,
                    type: 'payment',
                };
            });
            entries = [...entries, ...paymentEntries];


            entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            setLedgerData(prev => ({ ...prev, [clientId]: entries }));

        } catch (error) {
            console.error("Error fetching ledger data:", error);
        } finally {
            setLoadingLedger(prev => ({ ...prev, [clientId]: false }));
        }
    }, [ledgerData, loadingLedger]);

    const handleOpenPaymentDialog = (client: Client) => {
        setSelectedClient(client);
        setIsPaymentDialogOpen(true);
        form.reset();
    }

    const onPaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
        if (!selectedClient) return;

        try {
            await addDoc(collection(db, "payments"), {
                clientId: selectedClient.id,
                amount: values.amount,
                date: values.date.toISOString(),
                description: values.description,
                createdAt: serverTimestamp(),
            });
            toast({ title: "Payment Recorded", description: "The payment has been added to the ledger." });
            
            // Invalidate cached ledger data to force a refetch
            setLedgerData(prev => {
                const newState = {...prev};
                delete newState[selectedClient.id];
                return newState;
            });
            fetchLedgerForClient(selectedClient.id);

            setIsPaymentDialogOpen(false);
        } catch (error) {
            console.error("Error recording payment:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not record payment." });
        }
    }

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
                            <TableHead>Reference</TableHead>
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
                                    <TableCell>{format(new Date(entry.date), 'PPP')}</TableCell>
                                    <TableCell>{entry.description}</TableCell>
                                    <TableCell>{entry.reference}</TableCell>
                                    <TableCell className="text-right">{entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : '-'}</TableCell>
                                    <TableCell className="text-right">{entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : '-'}</TableCell>
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
        <>
        <Card>
            <CardHeader>
                <CardTitle>Client Ledgers</CardTitle>
                <CardDescription>View detailed financial ledgers for each client and record payments.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full" onValueChange={fetchLedgerForClient}>
                    {clients.map(client => (
                        <AccordionItem value={client.id} key={client.id}>
                            <div className="flex items-center w-full">
                                <AccordionTrigger className="flex-1 py-4">
                                    <span>{client.companyName}</span>
                                </AccordionTrigger>
                                <Button size="sm" variant="outline" className="ml-4" onClick={() => handleOpenPaymentDialog(client)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Record Payment
                                </Button>
                            </div>
                            <AccordionContent>
                               {renderLedgerTable(client.id)}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>

        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Record Payment for {selectedClient?.companyName}</DialogTitle>
                    <DialogDescription>
                        Enter the payment details below. This will add a credit entry to the client's ledger.
                    </DialogDescription>
                 </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onPaymentSubmit)} className="space-y-4">
                       <FormField
                         control={form.control}
                         name="amount"
                         render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="0.00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                         )}
                        />
                         <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Payment Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        {field.value ? (
                                            format(field.value, "PPP")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                             control={form.control}
                             name="description"
                             render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description / Reference</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Bank Transfer, UPI Ref #123" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                             )}
                        />
                         <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit">Save Payment</Button>
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
        </>
    );
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
        <Tabs defaultValue="ledgers">
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
          <TabsContent value="payouts" className="mt-4">
              <StaffPayouts />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
