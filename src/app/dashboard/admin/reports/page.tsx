
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
import { collection, collectionGroup, onSnapshot, query, where, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { GenerateInvoiceOutput } from "@/ai/flows/generate-invoice-flow";


type Invoice = GenerateInvoiceOutput & {
    id: string;
};

type Payout = {
    id: string;
    orderId: string;
    staffName: string;
    amount: number;
    status: 'Pending' | 'Paid';
    eventDate?: string;
};

type Stats = {
    totalIn: number;
    totalOut: number;
    profit: number;
};

async function getEventDateForPayout(orderId: string): Promise<string | undefined> {
    if (!orderId) return undefined;
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    return orderDoc.exists() ? orderDoc.data().date : undefined;
}


export default function AdminReportsPage() {
    const [stats, setStats] = useState<Stats>({ totalIn: 0, totalOut: 0, profit: 0 });
    const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
    const [recentPayouts, setRecentPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch all invoices to calculate Total In
        const invoicesQuery = query(collection(db, "invoices"));
        const unsubInvoices = onSnapshot(invoicesQuery, (snapshot) => {
            let total = 0;
            const invoices: Invoice[] = [];
            snapshot.forEach(doc => {
                const data = doc.data() as Invoice;
                total += data.totalAmount;
                invoices.push({ id: doc.id, ...data });
            });
            invoices.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
            setRecentInvoices(invoices.slice(0, 10));
            setStats(prev => ({ ...prev, totalIn: total, profit: total - prev.totalOut }));
        });

        // Fetch all payouts, then filter for 'Paid' status on the client
        const payoutsQuery = query(collectionGroup(db, 'payouts'));
        const unsubPayouts = onSnapshot(payoutsQuery, async (snapshot) => {
            let total = 0;
            
            const allPayouts = snapshot.docs
                .filter(doc => doc.data().status === 'Paid')
                .map(doc => ({
                    id: doc.id,
                    orderId: doc.ref.parent.parent!.id,
                    ...doc.data()
                })) as Payout[];
            
            const payoutPromises = allPayouts.map(async (p) => {
                if (!p.eventDate) {
                    p.eventDate = await getEventDateForPayout(p.orderId);
                }
                return p;
            });
            
            const payoutsWithDates = await Promise.all(payoutPromises);

            payoutsWithDates.forEach(payout => {
                total += payout.amount;
            });

            // Client-side sort by eventDate
            payoutsWithDates.sort((a,b) => {
                if(a.eventDate && b.eventDate) return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
                return 0;
            });

            setRecentPayouts(payoutsWithDates.slice(0, 10));
            setStats(prev => ({ ...prev, totalOut: total, profit: prev.totalIn - total }));
            if (loading) setLoading(false);
        });

        return () => {
            unsubInvoices();
            unsubPayouts();
        };
    }, [loading]);

    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (loading) {
         return (
             <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Financial Overview</CardTitle>
                        <CardDescription>Key metrics for your business.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-40 w-full"/>
                    </CardContent>
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
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue (In)</CardTitle>
                                <TrendingUp className="h-5 w-5 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{formatCurrency(stats.totalIn)}</div>
                                <p className="text-xs text-muted-foreground">From all generated invoices</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Payouts (Out)</CardTitle>
                                <TrendingDown className="h-5 w-5 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{formatCurrency(stats.totalOut)}</div>
                                <p className="text-xs text-muted-foreground">All staff payments marked as paid</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                                <DollarSign className="h-5 w-5 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{formatCurrency(stats.profit)}</div>
                                <p className="text-xs text-muted-foreground">Total Revenue - Total Payouts</p>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Revenue</CardTitle>
                        <CardDescription>The 10 most recently generated invoices.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentInvoices.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell>{invoice.client.companyName}</TableCell>
                                        <TableCell>{format(new Date(invoice.invoiceDate), 'PPP')}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(invoice.totalAmount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Payouts</CardTitle>
                         <CardDescription>The 10 most recently paid staff members.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff Member</TableHead>
                                    <TableHead>Event Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                               {recentPayouts.map(payout => (
                                    <TableRow key={payout.id}>
                                        <TableCell>{payout.staffName}</TableCell>
                                        <TableCell>{payout.eventDate ? format(new Date(payout.eventDate), 'PPP') : 'N/A'}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(payout.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
