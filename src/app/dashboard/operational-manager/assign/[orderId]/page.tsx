
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, DocumentData } from "firebase/firestore";
import { PlusCircle, MinusCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { capitalize } from '@/lib/utils';
import type { Staff } from '@/app/dashboard/admin/staff/page';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';


type Order = DocumentData & {
    id: string;
    assignedStaff?: string[];
}

const waiterRoles = ['waiter-steward', 'supervisor', 'pro', 'senior-pro', 'captain-butler'];

export default function AssignStaffPage() {
    const { toast } = useToast();
    const params = useParams();
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [allStaff, setAllStaff] = useState<Staff[]>([]);
    const [assignedStaffDetails, setAssignedStaffDetails] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingStaff, setLoadingStaff] = useState(true);

    // Fetch Order Details
    useEffect(() => {
        if (!orderId) return;
        const unsub = onSnapshot(doc(db, "orders", orderId), (doc) => {
            if (doc.exists()) {
                setOrder({ id: doc.id, ...doc.data() } as Order);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Order not found.' });
            }
            setLoading(false);
        });
        return () => unsub();
    }, [orderId, toast]);

    // Fetch All Staff
    useEffect(() => {
        const unsub = onSnapshot(collection(db, "staff"), (snapshot) => {
            const staffList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            setAllStaff(staffList);
            setLoadingStaff(false);
        });
        return () => unsub();
    }, []);

    // Fetch details of assigned staff
    useEffect(() => {
        if (!order || !order.assignedStaff || order.assignedStaff.length === 0) {
            setAssignedStaffDetails([]);
            return;
        }

        const fetchDetails = async () => {
            const staffPromises = order.assignedStaff!.map(staffId => getDoc(doc(db, 'staff', staffId)));
            const staffDocs = await Promise.all(staffPromises);
            const staffDetails = staffDocs
                .filter(doc => doc.exists())
                .map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            setAssignedStaffDetails(staffDetails);
        };

        fetchDetails();

    }, [order]);


    const handleAssignStaff = async (staffId: string) => {
        const orderRef = doc(db, "orders", orderId);
        try {
            await updateDoc(orderRef, {
                assignedStaff: arrayUnion(staffId)
            });
            toast({ title: "Staff Assigned", description: "The staff member has been added to the event." });
        } catch (error) {
            console.error("Error assigning staff:", error);
            toast({ variant: 'destructive', title: 'Error', description: "Could not assign staff member." });
        }
    };

    const handleUnassignStaff = async (staffId: string) => {
        const orderRef = doc(db, "orders", orderId);
        try {
            await updateDoc(orderRef, {
                assignedStaff: arrayRemove(staffId)
            });
            toast({ title: "Staff Unassigned", description: "The staff member has been removed from the event." });
        } catch (error) {
            console.error("Error unassigning staff:", error);
            toast({ variant: 'destructive', title: 'Error', description: "Could not unassign staff member." });
        }
    };
    
    if (loading) {
        return (
             <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <Card>
                    <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                </Card>
            </div>
        )
    }

    if (!order) {
        return <p>Order not found.</p>
    }
    
    const unassignedStaff = allStaff.filter(staff => 
        !order.assignedStaff?.includes(staff.id) && waiterRoles.includes(staff.role)
    );

    return (
        <div className="space-y-6">
            <div>
                <Link href="/dashboard/operational-manager" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Events
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Assign Staff for Order</h1>
                <p className="text-muted-foreground">Event Date: {order.date}</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Available Staff</CardTitle>
                        <CardDescription>Assign staff from the list below to this event.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {loadingStaff ? <Skeleton className="h-40 w-full" /> : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {unassignedStaff.map(staff => (
                                        <TableRow key={staff.id}>
                                            <TableCell>{staff.name}</TableCell>
                                            <TableCell><Badge variant="secondary">{capitalize(staff.role)}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" onClick={() => handleAssignStaff(staff.id)}>
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Assign
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {unassignedStaff.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">All available staff have been assigned.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Assigned Staff</CardTitle>
                        <CardDescription>Staff members currently assigned to this event.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignedStaffDetails.map(staff => (
                                    <TableRow key={staff.id}>
                                        <TableCell>{staff.name}</TableCell>
                                        <TableCell><Badge variant="default">{capitalize(staff.role)}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" variant="destructive" onClick={() => handleUnassignStaff(staff.id)}>
                                                <MinusCircle className="mr-2 h-4 w-4" />
                                                Remove
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                 {assignedStaffDetails.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">No staff assigned yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
