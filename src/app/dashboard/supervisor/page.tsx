
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Staff } from "../admin/staff/page";
import { Skeleton } from "@/components/ui/skeleton";


export default function SupervisorDashboardPage() {
    const [waiters, setWaiters] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const staffRoles = ['waiter-steward', 'pro', 'senior-pro', 'captain-butler'];
        const q = query(collection(db, "staff"), where('role', 'in', staffRoles));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const staffList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            setWaiters(staffList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getStatus = (staffId: string) => {
        // Placeholder logic - in a real app this would come from a different data source
        const hash = staffId.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        const statuses = ['On Shift', 'Available', 'On Break', 'Off Shift'];
        return statuses[hash % statuses.length];
    }
    
    const getEvent = (staffId: string, status: string) => {
        if(status !== 'On Shift' && status !== 'On Break') return '-';
         const hash = staffId.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
         const events = ['Wedding Party', 'Corporate Gala', 'Charity Ball', 'Product Launch'];
         return events[hash % events.length];
    }

     if(loading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Staff Location Tracking</CardTitle>
                    <CardDescription>View the current status and location of on-shift staff members.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="grid grid-cols-5 gap-4 items-center p-2">
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-full" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Staff Location Tracking</CardTitle>
                <CardDescription>View the current status and location of on-shift staff members.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Staff ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Current Event</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {waiters.map((waiter) => {
                            const status = getStatus(waiter.id);
                            const event = getEvent(waiter.id, status);
                            return (
                                <TableRow key={waiter.id}>
                                    <TableCell className="font-medium">{waiter.id.substring(0, 7).toUpperCase()}</TableCell>
                                    <TableCell>{waiter.name}</TableCell>
                                    <TableCell>{event}</TableCell>
                                    <TableCell>
                                        <Badge variant={status === 'On Shift' ? 'default' : status === 'Available' ? 'secondary' : 'outline'}>{status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" disabled={status !== 'On Shift'}>
                                                    <MapPin className="mr-2 h-4 w-4" />
                                                    View Location
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[625px]">
                                                <DialogHeader>
                                                    <DialogTitle>Live Location for {waiter.name}</DialogTitle>
                                                    <DialogDescription>
                                                        Real-time location from staff device. Last updated: just now.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="aspect-video w-full bg-muted rounded-md overflow-hidden border">
                                                    <Image src="https://picsum.photos/600/400" alt="Map placeholder" width={600} height={400} className="w-full h-full object-cover" data-ai-hint="map city" />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
