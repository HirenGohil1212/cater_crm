
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
import { collection, query, onSnapshot, orderBy, DocumentData, QueryDocumentSnapshot, doc, getDoc, updateDoc, setDoc, where, getDocs } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import type { GenerateInvoiceOutput } from "@/ai/flows/generate-invoice-flow";
import { generateInvoice } from "@/ai/flows/generate-invoice-flow";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { InvoiceList } from "@/components/invoice-list";

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
        const q = query(collection(db, "users"), where("role", "==", "consumer"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const clientList = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                companyName: doc.data().companyName
            } as Client));
            // Sort clients alphabetically by company name on the client side
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
