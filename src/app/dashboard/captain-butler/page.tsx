
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
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
import { CheckCircle, FileClock, Loader2, CalendarCheck, FileEdit, Users, Star, ClipboardCheck, UserCheck, Upload, Trash2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, DocumentData, QueryDocumentSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AvailabilityTab } from "@/components/availability-tab";
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { onAuthStateChanged, User } from 'firebase/auth';
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";


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
  assignedStaff?: string[];
};


async function getClientNameForOrder(userId: string): Promise<string> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data().companyName || userDoc.data().name : 'Unknown Client';
}

function EventManagementDialog({ order, assignedStaffDetails }: { order: Order, assignedStaffDetails: Staff[] }) {
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);

    const handleEndEvent = async () => {
        setIsUpdating(true);
        const orderRef = doc(db, 'orders', order.id);
        try {
            await updateDoc(orderRef, {
                status: 'Completed'
            });
            toast({
                title: "Event Completed",
                description: "The event has been marked as completed and will be passed to Sales for review.",
            });
        } catch (error) {
            console.error("Error ending event:", error);
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not update the event status. Please try again.'
            })
        } finally {
            setIsUpdating(false);
        }
    }
    
    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Manage Event: {order.clientName}</DialogTitle>
                <DialogDescription>Event on {format(new Date(order.date), 'PPP')}. Mark attendance, apply penalties, and finalize the event.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Team Attendance & Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Present</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assignedStaffDetails.map(staff => (
                                    <TableRow key={staff.id}>
                                         <TableCell><Checkbox id={`att-${staff.id}`} /></TableCell>
                                         <TableCell className="font-medium">{staff.name}</TableCell>
                                         <TableCell><Badge variant="secondary">{staff.role}</Badge></TableCell>
                                         <TableCell className="text-right space-x-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="destructive" size="sm">Penalty</Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Apply Penalty to {staff.name}</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="grid gap-4 py-4">
                                                        <Label htmlFor="penalty-amount">Penalty Amount (₹)</Label>
                                                        <Input id="penalty-amount" type="number" placeholder="e.g., 500" />
                                                        <Label htmlFor="penalty-reason">Reason</Label>
                                                        <Textarea id="penalty-reason" placeholder="Describe the reason for the penalty..." />
                                                    </div>
                                                    <DialogFooter>
                                                        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                                        <DialogClose asChild><Button type="submit">Apply Penalty</Button></DialogClose>
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
                 <Card>
                    <CardHeader>
                        <CardTitle>Event Finalization</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4 items-center">
                        <div>
                             <Label htmlFor="chit-upload">Upload Client Chit</Label>
                             <Input id="chit-upload" type="file" className="mt-2" />
                             <p className="text-xs text-muted-foreground mt-2">Upload a photo of the signed client document.</p>
                        </div>
                        <div className="flex justify-center">
                            <Image src="https://picsum.photos/200/150" alt="Placeholder for chit" width={200} height={150} className="rounded-md border bg-muted" data-ai-hint="document photo" />
                        </div>
                    </CardContent>
                     <CardFooter>
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        size="lg" 
                                        disabled={order.status !== 'Confirmed' || isUpdating}
                                        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                                    >
                                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                        End Event & Submit for Review
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure you want to end this event?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will mark the event as 'Completed' and submit it to the sales team for billing review. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleEndEvent}>
                                            Yes, End Event
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                           </AlertDialog>
                     </CardFooter>
                 </Card>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    )
}


function EventManagementTab() {
    const [events, setEvents] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [assignedStaffDetails, setAssignedStaffDetails] = useState<Record<string, Staff[]>>({});

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setAuthLoading(false);
      });
      return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (authLoading || !user) {
            if (!authLoading) setLoading(false);
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

                // Fetch details of assigned staff for this specific order
                if (data.assignedStaff && data.assignedStaff.length > 0) {
                     const staffPromises = data.assignedStaff.map((staffId: string) => getDoc(doc(db, 'staff', staffId)));
                     const staffDocs = await Promise.all(staffPromises);
                     const staffDetails = staffDocs
                        .filter(doc => doc.exists())
                        .map(doc => ({ id: doc.id, ...doc.data() } as Staff));
                    
                     setAssignedStaffDetails(prev => ({...prev, [docSnap.id]: staffDetails}));
                }

                return {
                    id: docSnap.id,
                    date: data.date,
                    attendees: data.attendees,
                    status: data.status,
                    clientName: clientName,
                    venue: data.venue || 'Venue not specified',
                    assignedStaff: data.assignedStaff || [],
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

    }, [user, authLoading]);

    const renderContent = () => {
        if (loading || authLoading) {
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
                           <Dialog>
                               <DialogTrigger asChild>
                                    <Button disabled={event.status !== 'Confirmed'}>
                                        <FileEdit className="mr-2 h-4 w-4" />
                                        Manage Event
                                    </Button>
                               </DialogTrigger>
                               <EventManagementDialog order={event} assignedStaffDetails={assignedStaffDetails[event.id] || []} />
                           </Dialog>
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
                <CardDescription>Oversee and conclude your assigned events. This is where you'll manage staff during an event.</CardDescription>
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
                    <CardDescription>Oversee events, manage your team, and set your availability.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="events"><FileEdit className="mr-2 h-4 w-4" />Event Management</TabsTrigger>
                        <TabsTrigger value="availability"><CalendarCheck className="mr-2 h-4 w-4" />My Availability</TabsTrigger>
                    </TabsList>
                </CardContent>
            </Card>

            <TabsContent value="events" className="mt-4">
                <EventManagementTab />
            </TabsContent>
            <TabsContent value="availability" className="mt-4">
                <AvailabilityTab />
            </TabsContent>
        </Tabs>
    )
}
