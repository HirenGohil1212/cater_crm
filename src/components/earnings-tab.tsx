
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
import { DollarSign, FileWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collectionGroup, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { onAuthStateChanged, User } from "firebase/auth";


type Payout = {
    id: string;
    orderId: string;
    staffId: string;
    amount: number;
    status: 'Pending' | 'Paid';
    clientName?: string;
    eventDate?: string;
};


async function getUserName(userId: string): Promise<string> {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data().companyName || userDocSnap.data().name || "Unknown User";
    }
    return "Unknown User";
}


export function EarningsTab() {
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const payoutsQuery = query(collectionGroup(db, 'payouts'), where('staffId', '==', user.uid));

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
            payoutList.sort((a,b) => new Date(b.eventDate!).getTime() - new Date(a.eventDate!).getTime());
            setPayouts(payoutList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching payouts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const renderTableBody = () => {
        if (loading) {
            return [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                </TableRow>
            ));
        }

        if (payouts.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                         <div className="flex flex-col items-center justify-center text-muted-foreground">
                             <DollarSign className="h-12 w-12 mb-4" />
                            <h3 className="text-lg font-semibold">No Earnings Recorded</h3>
                            <p>Your payouts from events will appear here once processed.</p>
                        </div>
                    </TableCell>
                </TableRow>
            )
        }

        return payouts.map((payout) => (
            <TableRow key={payout.id}>
                <TableCell>{payout.eventDate ? format(new Date(payout.eventDate), 'PPP') : 'N/A'}</TableCell>
                <TableCell className="font-medium">{payout.clientName}</TableCell>
                <TableCell>
                     <Badge variant={payout.status === 'Paid' ? 'secondary' : 'destructive'}>{payout.status}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">₹{payout.amount.toFixed(2)}</TableCell>
            </TableRow>
        ));
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>My Earnings</CardTitle>
                <CardDescription>A record of all your payouts from completed events.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Event Date</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
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

