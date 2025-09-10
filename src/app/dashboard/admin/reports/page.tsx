

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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase";
import { collection, collectionGroup, onSnapshot, query, where, orderBy, limit, doc, getDoc, getDocs } from "firebase/firestore";
import { TrendingUp, TrendingDown, DollarSign, Building } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import type { GenerateInvoiceOutput } from "@/ai/flows/generate-invoice-flow";
import type { Staff } from "@/app/dashboard/admin/staff/page";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";


type Invoice = GenerateInvoiceOutput & {
    id: string;
    firmId: string;
};

type Payout = {
    id: string;
    orderId: string;
    staffId: string;
    staffName: string;
    amount: number; // This is the amount BILLED to the client
    status: 'Pending' | 'Paid';
    eventDate: string;
};

type Firm = {
    id: string;
    companyName: string;
}

type Stats = {
    totalIn: number;
    totalOut: number;
    profit: number;
};


export default function AdminReportsPage() {
    const [stats, setStats] = useState<Stats>({ totalIn: 0, totalOut: 0, profit: 0 });
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    const [recentPayouts, setRecentPayouts] = useState<Payout[]>([]);
    const [firms, setFirms] = useState<Firm[]>([]);
    const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const invoicesQuery = query(collection(db, "invoices"));
        const unsubInvoices = onSnapshot(invoicesQuery, (snapshot) => {
            const invoices: Invoice[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
            setAllInvoices(invoices);
            if(!snapshot.metadata.hasPendingWrites) setLoading(false);
        }, (error) => {
            console.error("Error fetching invoices:", error);
            setLoading(false);
        });

        const payoutsQuery = query(collectionGroup(db, 'payouts'), orderBy('eventDate', 'desc'));
        const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
            const paidPayouts = snapshot.docs
                .filter(doc => doc.data().status === 'Paid')
                .map(doc => ({
                    id: doc.id,
                    orderId: doc.ref.parent.parent!.id,
                    ...doc.data()
                } as Payout));
            
            setRecentPayouts(paidPayouts.slice(0, 10));
            
            if(!snapshot.metadata.hasPendingWrites) setLoading(false);
        }, (error) => {
            console.error("Error fetching payouts:", error);
            setLoading(false);
        });
        
        const firmsQuery = query(collection(db, "firms"), orderBy("companyName"));
        const unsubFirms = onSnapshot(firmsQuery, (snapshot) => {
            const firmsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Firm));
            setFirms(firmsList);
        });

        return () => {
            unsubInvoices();
            unsubPayouts();
            unsubFirms();
        };
    }, []);

    useEffect(() => {
      const calculateStats = async () => {
          const totalRevenue = allInvoices.reduce((acc, invoice) => acc + invoice.totalAmount, 0);

          const payoutsQuery = query(collectionGroup(db, 'payouts'));
          const allPayoutsSnapshot = await getDocs(payoutsQuery);
          const paidPayoutDocs = allPayoutsSnapshot.docs.filter(doc => doc.data().status === 'Paid');
          
          let totalBilledForStaff = 0;
          let totalActualStaffCost = 0;

          const staffCache = new Map<string, Staff>();

          for (const payoutDoc of paidPayoutDocs) {
              const payoutData = payoutDoc.data();
              totalBilledForStaff += payoutData.amount;
              
              let staffData = staffCache.get(payoutData.staffId);
              if (!staffData) {
                  const staffDocRef = doc(db, 'staff', payoutData.staffId);
                  const staffDocSnap = await getDoc(staffDocRef);
                  if (staffDocSnap.exists()) {
                      staffData = staffDocSnap.data() as Staff;
                      staffCache.set(payoutData.staffId, staffData);
                  }
              }

              if (staffData) {
                  totalActualStaffCost += staffData.perEventCharge || 0;
              }
          }

          const netProfit = totalBilledForStaff - totalActualStaffCost;

          setStats({
              totalIn: totalRevenue,
              totalOut: totalActualStaffCost,
              profit: netProfit,
          });
      };

      if (!loading) {
          calculateStats();
      }
  }, [allInvoices, loading]);
    
    const recentInvoices = useMemo(() => {
        return [...allInvoices].sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()).slice(0, 10);
    }, [allInvoices]);
    
    const firmTurnover = useMemo(() => {
        if (!selectedFirmId) return 0;
        return allInvoices
            .filter(invoice => invoice.firmId === selectedFirmId)
            .reduce((acc, invoice) => acc + invoice.totalAmount, 0);
    }, [selectedFirmId, allInvoices]);

    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (loading) {
         return (
             <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Financial Overview</CardTitle><CardDescription>Key metrics for your business.</CardDescription></CardHeader>
                    <CardContent><Skeleton className="h-40 w-full"/></CardContent>
                </Card>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card><CardHeader><CardTitle>Recent Revenue</CardTitle></CardHeader><CardContent><Skeleton className="h-48 w-full"/></CardContent></Card>
                    <Card><CardHeader><CardTitle>Recent Payouts</CardTitle></CardHeader><CardContent><Skeleton className="h-48 w-full"/></CardContent></Card>
                </div>
            </div>
         )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Financial Overview</CardTitle>
                    <CardDescription>A high-level summary of your business finances.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Revenue (In)</CardTitle><TrendingUp className="h-5 w-5 text-green-500" /></CardHeader>
                            <CardContent><div className="text-3xl font-bold">{formatCurrency(stats.totalIn)}</div><p className="text-xs text-muted-foreground">From all generated invoices</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Payouts (Out)</CardTitle><TrendingDown className="h-5 w-5 text-red-500" /></CardHeader>
                            <CardContent><div className="text-3xl font-bold">{formatCurrency(stats.totalOut)}</div><p className="text-xs text-muted-foreground">Total actual cost of staff payouts</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Net Profit</CardTitle><DollarSign className="h-5 w-5 text-blue-500" /></CardHeader>
                            <CardContent><div className="text-3xl font-bold">{formatCurrency(stats.profit)}</div><p className="text-xs text-muted-foreground">Billed Staff Amount - Actual Staff Cost</p></CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Recent Revenue</CardTitle><CardDescription>The 10 most recently generated invoices.</CardDescription></CardHeader>
                        <CardContent>
                            <Table><TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                <TableBody>{recentInvoices.map(invoice => (<TableRow key={invoice.id}><TableCell>{invoice.client.companyName}</TableCell><TableCell>{format(new Date(invoice.invoiceDate), 'PPP')}</TableCell><TableCell className="text-right font-medium">{formatCurrency(invoice.totalAmount)}</TableCell></TableRow>))}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Recent Payouts</CardTitle><CardDescription>The 10 most recently paid staff members (amount is what was billed to client).</CardDescription></CardHeader>
                        <CardContent>
                             <Table><TableHeader><TableRow><TableHead>Staff Member</TableHead><TableHead>Event Date</TableHead><TableHead className="text-right">Billed Amount</TableHead></TableRow></TableHeader>
                                <TableBody>{recentPayouts.map(payout => (<TableRow key={payout.id}><TableCell>{payout.staffName}</TableCell><TableCell>{payout.eventDate ? format(new Date(payout.eventDate), 'PPP') : 'N/A'}</TableCell><TableCell className="text-right font-medium">{formatCurrency(payout.amount)}</TableCell></TableRow>))}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader><CardTitle>Firm Wise Turnover</CardTitle><CardDescription>Check the total revenue for a specific billing entity.</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="firm-select">Select a Firm</Label>
                                <Select onValueChange={setSelectedFirmId} value={selectedFirmId || ''}>
                                    <SelectTrigger id="firm-select"><SelectValue placeholder="Choose a firm..." /></SelectTrigger>
                                    <SelectContent>
                                        {firms.map(firm => (<SelectItem key={firm.id} value={firm.id}>{firm.companyName}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Card className="text-center p-6 bg-muted/50">
                                <p className="text-sm font-medium text-muted-foreground">Total Turnover</p>
                                <p className="text-4xl font-bold tracking-tight">
                                    {selectedFirmId ? formatCurrency(firmTurnover) : '₹0.00'}
                                </p>
                            </Card>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
