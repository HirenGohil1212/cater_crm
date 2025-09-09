
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileClock, Loader2, CalendarCheck, FileEdit, Calculator, Users, Star, ClipboardCheck, UserCheck } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, DocumentData, QueryDocumentSnapshot, doc, getDoc, updateDoc, setDoc, orderBy } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AvailabilityTab } from "@/components/availability-tab";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Staff = {
  id: string;
  name: string;
  phone: string;
  role: 'waiter-steward' | 'supervisor' | 'pro' | 'senior-pro' | 'captain-butler' | 'operational-manager' | 'sales' | 'hr' | 'accountant' | 'admin';
  address: string;
  idNumber: string;
  staffType: 'individual' | 'group-leader' | 'outsourced' | 'salaried';
  bankAccountNumber?: string;
  bankIfscCode?: string;
  perEventCharge?: number;
  monthlySalary?: number;
};


type Order = {
  id: string;
  date: string;
  attendees: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  menuType: "veg" | "non-veg";
  userId: string;
  clientName?: string;
  venue?: string;
};


async function getClientNameForOrder(userId: string): Promise<string> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data().companyName || userDoc.data().name : 'Unknown Client';
}


function TeamManagementTab() {
    const [team, setTeam] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const subordinateRoles = ['waiter-steward', 'supervisor', 'pro', 'senior-pro'];
        const q = query(collection(db, "staff"), where('role', 'in', subordinateRoles), orderBy('name'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const staffList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            setTeam(staffList);
            setLoading(false);
        }, (error) => {
             console.error("Error fetching team:", error);
             toast({ variant: 'destructive', title: "Error", description: "Could not load team members."});
             setLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);
    
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

    const handleAttendance = (staffName: string) => {
        toast({
            title: "Attendance Marked",
            description: `${staffName} has been marked as present.`
        });
    }

    if(loading) {
        return (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(5)].map((_, i) => (
                         <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-9 w-48 ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>Manage attendance, ratings, and penalties for your team.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {team.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell className="font-medium">{member.name}</TableCell>
                                <TableCell><Badge variant="secondary">{member.role}</Badge></TableCell>
                                <TableCell className="text-right space-x-2">
                                     <Button variant="outline" size="sm" onClick={() => handleAttendance(member.name)}>
                                        <UserCheck className="mr-2 h-4 w-4" /> Attendance
                                     </Button>

                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm"><Star className="mr-2 h-4 w-4" /> Rate</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Rate {member.name}</DialogTitle>
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
                                                    <Button type="button" variant="outline">Cancel</Button>
                                                </DialogClose>
                                                <DialogClose asChild>
                                                    <Button type="submit" onClick={handleSubmitRating}>Submit Rating</Button>
                                                </DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                     </Dialog>

                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="destructive" size="sm"><FileEdit className="mr-2 h-4 w-4" /> Report</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Report / Penalty for {member.name}</DialogTitle>
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
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


function EventManagementTab() {
    const [events, setEvents] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const { toast } = useToast();
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const ordersQuery = query(
            collection(db, "orders"), 
            where('assignedStaff', 'array-contains', user.uid),
            where('status', 'in', ['Pending', 'Confirmed', 'Completed'])
        );
        
        const unsubscribe = onSnapshot(ordersQuery, async (snapshot) => {
            const eventPromises = snapshot.docs.map(async (docSnap: QueryDocumentSnapshot<DocumentData>) => {
                const data = docSnap.data();
                const clientName = await getClientNameForOrder(data.userId);
                return {
                    id: docSnap.id,
                    date: data.date,
                    attendees: data.attendees,
                    status: data.status,
                    clientName: clientName,
                    venue: data.venue || 'Venue not specified', // Assume venue might exist
                };
            });

            const eventList = await Promise.all(eventPromises);
            eventList.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setEvents(eventList as Order[]);
            setLoading(false);

        }, (error) => {
            console.error("Error fetching events:", error);
            setLoading(false);
        });

        return () => unsubscribe();

    }, [user]);

    const handleEndEvent = async (orderId: string) => {
        setIsUpdating(orderId);
        const orderRef = doc(db, 'orders', orderId);
        try {
            await updateDoc(orderRef, {
                status: 'Completed'
            });
            toast({
                title: "Event Completed",
                description: "The event has been marked as completed and is now ready for billing.",
            });
        } catch (error) {
            console.error("Error ending event:", error);
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not update the event status. Please try again.'
            })
        } finally {
            setIsUpdating(null);
        }
    }


    const renderContent = () => {
        if (loading) {
            return (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Event Date</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                             <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-9 w-28 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            )
        }

        if (events.length === 0) {
            return (
                 <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg bg-muted/30">
                    <FileClock className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">No Active Events</h3>
                    <p>You have not been assigned to any confirmed events.</p>
                </div>
            )
        }

        return (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Event Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                   {events.map(event => (
                     <TableRow key={event.id}>
                        <TableCell className="font-medium">{format(new Date(event.date), 'PPP')}</TableCell>
                        <TableCell>{event.clientName}</TableCell>
                        <TableCell>
                             <Badge variant={event.status === "Completed" ? "default" : (event.status === "Confirmed" ? "secondary" : "destructive")}>{event.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        size="sm" 
                                        disabled={event.status !== 'Confirmed' || isUpdating === event.id}
                                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                                    >
                                        {isUpdating === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        {event.status === 'Completed' ? 'Completed' : 'End Event'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure you want to end this event?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will mark the event as 'Completed' and make it available for invoicing. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleEndEvent(event.id)}>
                                            Yes, End Event
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                           </AlertDialog>
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={() => handleEndEvent(event.id)}>
                                Test End
                           </Button>
                        </TableCell>
                    </TableRow>
                   ))}
                </TableBody>
             </Table>
        )
    }

    return (
         <Card>
            <CardHeader>
                <CardTitle>Event Management</CardTitle>
                <CardDescription>Oversee and conclude your assigned events.</CardDescription>
            </CardHeader>
            <CardContent>
                {renderContent()}
            </CardContent>
        </Card>
    )
}

export default function CaptainButlerDashboardPage() {
    return (
        <Tabs defaultValue="events">
            <Card>
                 <CardHeader>
                    <CardTitle>Captain's Dashboard</CardTitle>
                    <CardDescription>Oversee events and manage your team and availability.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="events"><FileEdit className="mr-2 h-4 w-4" />Event Management</TabsTrigger>
                        <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Team Management</TabsTrigger>
                        <TabsTrigger value="availability"><CalendarCheck className="mr-2 h-4 w-4" />My Availability</TabsTrigger>
                    </TabsList>
                </CardContent>
            </Card>

            <TabsContent value="events" className="mt-4">
                <EventManagementTab />
            </TabsContent>
             <TabsContent value="team" className="mt-4">
                <TeamManagementTab />
            </TabsContent>
            <TabsContent value="availability" className="mt-4">
                <AvailabilityTab />
            </TabsContent>
        </Tabs>
    )
}
