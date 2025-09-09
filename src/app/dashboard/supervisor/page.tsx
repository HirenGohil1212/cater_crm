
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, FileEdit, Star } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Staff } from "../admin/staff/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";


export default function SupervisorDashboardPage() {
    const [stewards, setStewards] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const q = query(collection(db, "staff"), where('role', '==', 'waiter-steward'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const staffList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            setStewards(staffList);
            setLoading(false);
        }, (error) => {
             console.error("Error fetching stewards:", error);
             setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getStatus = (staffId: string) => {
        // Placeholder logic
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
    
    const getRating = (staffId: string) => {
        const hash = staffId.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        return ((hash % 20) / 10 + 3).toFixed(1); // Random rating between 3.0 and 5.0
    }
    
    const handleSubmitReport = () => {
        toast({
            title: "Report Submitted",
            description: "The report has been saved and will be reviewed."
        })
    }
    
    const handleSubmitRating = () => {
        toast({
            title: "Rating Submitted",
            description: "The staff member's rating has been updated."
        })
    }


     if(loading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Steward Management</CardTitle>
                    <CardDescription>Oversee, rate, and report on all stewards.</CardDescription>
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
                <CardTitle>Steward Management</CardTitle>
                <CardDescription>Oversee, rate, and report on all stewards.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Current Event</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Performance</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stewards.map((steward) => {
                            const status = getStatus(steward.id);
                            const event = getEvent(steward.id, status);
                            const rating = getRating(steward.id);
                            return (
                                <TableRow key={steward.id}>
                                    <TableCell className="font-medium">{steward.name}</TableCell>
                                    <TableCell>{event}</TableCell>
                                    <TableCell>
                                        <Badge variant={status === 'On Shift' ? 'default' : status === 'Available' ? 'secondary' : 'outline'}>{status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center">
                                           <Star className="w-4 h-4 mr-1 text-yellow-500 fill-yellow-500" /> {rating}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                         <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm"><Star className="mr-2 h-4 w-4" /> Rate</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Rate {steward.name}</DialogTitle>
                                                    <DialogDescription>
                                                        Provide a performance rating and any additional remarks.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="rating" className="text-right">Rating (1-5)</Label>
                                                        <div className="col-span-3 flex items-center">
                                                            {[1,2,3,4,5].map(i => (
                                                                <Star key={i} className="w-6 h-6 text-gray-300 cursor-pointer hover:text-yellow-400" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="remarks" className="text-right">Remarks</Label>
                                                        <Textarea id="remarks" placeholder="Optional remarks..." className="col-span-3" />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button type="button" onClick={handleSubmitRating}>Submit Rating</Button>
                                                    </DialogClose>
                                                </DialogFooter>
                                            </DialogContent>
                                         </Dialog>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm"><FileEdit className="mr-2 h-4 w-4" /> Report</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Report / Penalty for {steward.name}</DialogTitle>
                                                    <DialogDescription>
                                                        Submit a report for this staff member. This will be logged and reviewed by HR and Admin.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <Textarea placeholder="Describe the incident or reason for the penalty..." rows={5} />
                                                </div>
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button type="button" variant="outline">Cancel</Button>
                                                    </DialogClose>
                                                     <DialogClose asChild>
                                                        <Button type="submit" onClick={handleSubmitReport}>Submit Report</Button>
                                                     </DialogClose>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" disabled={status !== 'On Shift'}>
                                                    <MapPin className="mr-2 h-4 w-4" /> Location
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[625px]">
                                                <DialogHeader>
                                                    <DialogTitle>Live Location for {steward.name}</DialogTitle>
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
