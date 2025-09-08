
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
import { Button } from "@/components/ui/button";
import { Download, FileWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, DocumentData, QueryDocumentSnapshot, orderBy } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

type Order = {
  id: string;
  date: string;
  attendees: number;
  invoiceStatus: "Pending" | "Generated";
  status: string;
};

export default function ConsumerBillingPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const user = auth.currentUser;
  
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        };

        const ordersRef = collection(db, "orders");
        const q = query(
            ordersRef, 
            where("userId", "==", user.uid),
            where("status", "in", ["Completed", "Confirmed"]), // Show bills for completed or confirmed events
            orderBy("status", "desc") // This may require an index
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const userOrders = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    date: data.date,
                    attendees: data.attendees,
                    status: data.status,
                    invoiceStatus: data.invoiceStatus || "Pending",
                };
            }) as Order[];
            setOrders(userOrders);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching billing orders: ", error);
            setLoading(false);
        });

      return () => unsubscribe();
    }, [user]);

    const renderTableBody = () => {
        if (loading) {
            return [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                </TableRow>
            ));
        }

        if (orders.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                         <div className="flex flex-col items-center justify-center text-muted-foreground">
                             <FileWarning className="h-12 w-12 mb-4" />
                            <h3 className="text-lg font-semibold">No Bills Found</h3>
                            <p>You have no bills for completed or upcoming events.</p>
                        </div>
                    </TableCell>
                </TableRow>
            )
        }

        return orders.map((order) => (
            <TableRow key={order.id}>
                <TableCell className="font-medium">{order.date}</TableCell>
                <TableCell>{order.attendees}</TableCell>
                <TableCell>
                    <Badge variant={order.invoiceStatus === 'Generated' ? 'secondary' : 'destructive'}>{order.invoiceStatus}</Badge>
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="outline" size="sm" disabled={order.invoiceStatus !== 'Generated'}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                </TableCell>
            </TableRow>
        ));
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>My Billing</CardTitle>
                <CardDescription>View and download invoices for your events.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Event Date</TableHead>
                            <TableHead>Attendees</TableHead>
                            <TableHead>Invoice Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderTableBody()}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
