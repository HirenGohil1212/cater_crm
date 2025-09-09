
"use client";

import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { auth, db, DUMMY_EMAIL_DOMAIN } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, doc, setDoc, query, where, orderBy } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { UserPlus, Loader2, Users, FileText, Building2, CheckSquare } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { StaffListTable } from '@/components/staff-list-table';
import { BillingReviewTable } from '@/components/billing-review-table';

const newClientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().length(10, "Please enter a valid 10-digit phone number."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  companyName: z.string().min(2, "Company name must be at least 2 characters."),
  gstNumber: z.string().optional(),
});

type Client = {
  id: string;
  name: string;
  phone: string;
  companyName: string;
  createdAt: any;
};

function AddClientForm({ onClientAdded }: { onClientAdded: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
     const form = useForm<z.infer<typeof newClientSchema>>({
        resolver: zodResolver(newClientSchema),
        defaultValues: { name: "", phone: "", password: "", companyName: "", gstNumber: "" },
    });

    async function onSubmit(values: z.infer<typeof newClientSchema>) {
        setIsSubmitting(true);
        const { name, phone, password, companyName, gstNumber } = values;
        const fullPhoneNumber = `+91${phone}`;
        const dummyEmail = `${fullPhoneNumber}@${DUMMY_EMAIL_DOMAIN}`;

        const currentAdmin = auth.currentUser;
        if (!currentAdmin) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'You are not logged in.' });
            setIsSubmitting(false);
            return;
        }

        try {
            await signOut(auth);
            
            const userCredential = await createUserWithEmailAndPassword(auth, dummyEmail, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name,
                phone: fullPhoneNumber,
                companyName,
                gstNumber: gstNumber || '',
                role: 'consumer',
                createdAt: new Date(),
            });

            await signOut(auth);

            toast({ title: "Client Added", description: `${name} from ${companyName} is now a client.` });
            form.reset();
            onClientAdded();

        } catch (error: any) {
            console.error("Error adding client: ", error);
            toast({
                variant: 'destructive',
                title: 'Error Adding Client',
                description: error.message || "An unknown error occurred.",
            });
        } finally {
            setIsSubmitting(false);
            toast({
                title: "Action Required",
                description: "For security, you have been logged out. Please log in again to continue.",
            });
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add New Client</CardTitle>
                <CardDescription>Create a new client account with login credentials.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="companyName" render={({ field }) => (
                            <FormItem><FormLabel>Company</FormLabel><FormControl><Input placeholder="Company Inc." {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                    <div className="flex items-center">
                                        <span className="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 border-input bg-background text-sm text-muted-foreground">
                                            +91
                                        </span>
                                        <Input 
                                            type="tel"
                                            maxLength={10}
                                            className="rounded-l-none" 
                                            placeholder="9876543210" 
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel>Initial Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="gstNumber" render={({ field }) => (
                            <FormItem><FormLabel>GST Number (Optional)</FormLabel><FormControl><Input placeholder="22AAAAA0000A1Z5" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <UserPlus className="mr-2 h-4 w-4" /> 
                            {isSubmitting ? 'Adding Client...' : 'Add Client'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

function ClientList() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

     useEffect(() => {
        const q = query(collection(db, "users"), where("role", "==", "consumer"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const clientList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
            setClients(clientList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching clients: ", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const renderTableBody = () => {
        if (loading) {
            return [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
            ));
        }
        if (clients.length === 0) {
            return <TableRow><TableCell colSpan={4} className="text-center">No clients added yet.</TableCell></TableRow>
        }
        return clients.map((client) => (
            <TableRow key={client.id}>
                <TableCell className="font-medium">{client.companyName}</TableCell>
                <TableCell>{client.name}</TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>{client.createdAt ? format(client.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
            </TableRow>
        ));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Client List</CardTitle>
                <CardDescription>All registered consumer accounts.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Client Since</TableHead>
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

function AgreementsTab() {
     return (
        <Card>
            <CardHeader>
                <CardTitle>Client Agreements</CardTitle>
                <CardDescription>Design and manage client contracts.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-96 border-2 border-dashed rounded-lg bg-muted/30">
                    <FileText className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">Agreement Design Module</h3>
                    <p>Feature coming soon.</p>
                </div>
            </CardContent>
        </Card>
    );
}


export default function SalesDashboardPage() {
    const [key, setKey] = useState(0); // Used to force re-render of ClientList
    
    return (
        <Tabs defaultValue="clients" className="w-full">
            <Card>
                <CardHeader>
                    <CardTitle>Sales Dashboard</CardTitle>
                    <CardDescription>Manage clients, check staff availability, and create agreements.</CardDescription>
                </CardHeader>
                <CardContent>
                     <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="clients"><Building2 className="mr-2 h-4 w-4" />Client Management</TabsTrigger>
                        <TabsTrigger value="review"><CheckSquare className="mr-2 h-4 w-4" />Billing Review</TabsTrigger>
                        <TabsTrigger value="availability"><Users className="mr-2 h-4 w-4" />Staff Availability</TabsTrigger>
                        <TabsTrigger value="agreements"><FileText className="mr-2 h-4 w-4" />Client Agreements</TabsTrigger>
                    </TabsList>
                </CardContent>
            </Card>

            <TabsContent value="clients" className="mt-4">
                <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-1">
                        <AddClientForm onClientAdded={() => setKey(prev => prev + 1)} />
                    </div>
                    <div className="lg:col-span-2">
                        <ClientList key={key} />
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="review" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Event Billing Review</CardTitle>
                        <CardDescription>Review completed events before they are sent to accounting.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <BillingReviewTable />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="availability" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Staff Availability</CardTitle>
                        <CardDescription>A read-only list of all staff members and their roles.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <StaffListTable />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="agreements" className="mt-4">
                <AgreementsTab />
            </TabsContent>
        </Tabs>
    );
}
