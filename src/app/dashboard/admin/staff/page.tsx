
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
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { auth, db, DUMMY_EMAIL_DOMAIN } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';

const staffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().length(10, "Please enter a valid 10-digit phone number."),
  role: z.enum(['waiter-steward', 'supervisor', 'pro', 'senior-pro', 'captain-butler', 'operational-manager', 'sales', 'hr', 'accountant', 'admin']),
});

export type Staff = {
  id: string;
  name: string;
  phone: string;
  role: 'waiter-steward' | 'supervisor' | 'pro' | 'senior-pro' | 'captain-butler' | 'operational-manager' | 'sales' | 'hr' | 'accountant' | 'admin';
};

export default function AdminStaffPage() {
    const { toast } = useToast();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

    const form = useForm<z.infer<typeof staffSchema>>({
        resolver: zodResolver(staffSchema),
        defaultValues: { name: "", phone: "", role: "waiter-steward" },
    });

    useEffect(() => {
        const q = query(collection(db, "staff"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const staffList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            setStaff(staffList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const openDialogForEdit = (staffMember: Staff) => {
        setEditingStaff(staffMember);
        // Phone number stored with +91, but form expects 10 digits
        const phoneWithoutCountryCode = staffMember.phone.startsWith('+91') ? staffMember.phone.substring(3) : staffMember.phone;
        form.reset({ ...staffMember, phone: phoneWithoutCountryCode });
        setIsDialogOpen(true);
    }
    
    const openDialogForNew = () => {
        setEditingStaff(null);
        form.reset({ name: "", phone: "", role: "waiter-steward" });
        setIsDialogOpen(true);
    }

    async function onSubmit(values: z.infer<typeof staffSchema>) {
        setIsSubmitting(true);
        const fullPhoneNumber = `+91${values.phone}`;
        const dummyEmail = `${fullPhoneNumber}@${DUMMY_EMAIL_DOMAIN}`;
        const defaultPassword = 'password123'; // Admin should communicate this securely

        try {
            if (editingStaff) {
                const staffDocRef = doc(db, "staff", editingStaff.id);
                await updateDoc(staffDocRef, {
                    name: values.name,
                    phone: fullPhoneNumber,
                    role: values.role
                });
                const userDocRef = doc(db, "users", editingStaff.id);
                await updateDoc(userDocRef, {
                    name: values.name,
                    phone: fullPhoneNumber,
                    role: values.role
                });
                toast({ title: "Staff Updated", description: `${values.name}'s details have been updated.` });
            } else {
                const tempAuthApp = initializeApp({
                    apiKey: auth.config.apiKey,
                    authDomain: auth.config.authDomain,
                }, `temp-staff-creation-${Date.now()}`);
                const tempAuth = getAuth(tempAuthApp);

                const userCredential = await createUserWithEmailAndPassword(tempAuth, dummyEmail, defaultPassword);
                const user = userCredential.user;

                await setDoc(doc(db, "staff", user.uid), {
                    uid: user.uid,
                    name: values.name,
                    phone: fullPhoneNumber,
                    role: values.role,
                });
                 await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    name: values.name,
                    phone: fullPhoneNumber,
                    role: values.role,
                });


                toast({
                  title: "Staff Added",
                  description: `${values.name} has been added. They can log in with their phone and the default password.`,
                });
            }
            setIsDialogOpen(false);
            setEditingStaff(null);
            form.reset();

        } catch (error: any) {
            console.error("Error saving staff:", error);
            if (error.code === 'auth/email-already-in-use') {
                 toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'This phone number is already registered.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: error.message || `Could not save ${values.name}. Please try again.`,
                });
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    async function onDelete(staffId: string) {
        try {
            await deleteDoc(doc(db, "staff", staffId));
            await deleteDoc(doc(db, "users", staffId));
            toast({ title: "Staff Deleted", description: "The staff member has been removed." });
        } catch (error: any) {
            console.error("Error deleting staff:", error);
            toast({
                variant: 'destructive',
                title: 'Error Deleting Staff',
                description: error.message,
            });
        }
    }


    const renderTableBody = () => {
        if (loading) {
            return [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
            ));
        }
        if (staff.length === 0) {
            return <TableRow><TableCell colSpan={4} className="text-center">No staff members found.</TableCell></TableRow>
        }
        return staff.map((member) => (
            <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.phone}</TableCell>
                <TableCell>{member.role}</TableCell>
                <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openDialogForEdit(member)}>
                        <Edit className="mr-2 h-4 w-4"/> Edit
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4"/> Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the staff member's account and all associated data.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(member.id)}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
            </TableRow>
        ));
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Staff Management</CardTitle>
                        <CardDescription>Add, edit, and track all staff members.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openDialogForNew}><PlusCircle className="mr-2 h-4 w-4"/> Add New Staff</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
                                <DialogDescription>
                                   {editingStaff ? 'Update the details below.' : 'Fill in the details to create a new staff profile.'}
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
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
                                                        className="rounded-l-none" 
                                                        placeholder="9876543210" 
                                                        {...field} 
                                                        disabled={!!editingStaff}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="role" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="waiter-steward">Waiter / Steward</SelectItem>
                                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                                    <SelectItem value="pro">PRO</SelectItem>
                                                    <SelectItem value="senior-pro">Senior PRO</SelectItem>
                                                    <SelectItem value="captain-butler">Captain / Butler</SelectItem>
                                                    <SelectItem value="operational-manager">Operational Manager</SelectItem>
                                                    <SelectItem value="sales">Sales</SelectItem>
                                                    <SelectItem value="hr">Human Resources</SelectItem>
                                                    <SelectItem value="accountant">Accountant</SelectItem>
                                                    <SelectItem value="admin">Administrator</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <DialogFooter>
                                        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="animate-spin" />}
                                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Role</TableHead>
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
