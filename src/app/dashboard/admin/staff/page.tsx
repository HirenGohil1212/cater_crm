
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
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, setDoc, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, signOut, linkWithCredential, EmailAuthProvider } from 'firebase/auth';
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { OtpInput } from '@/components/otp-input';
import { Textarea } from '@/components/ui/textarea';

const staffBaseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().length(10, "Please enter a valid 10-digit phone number."),
  role: z.enum(['waiter-steward', 'supervisor', 'pro', 'senior-pro', 'captain-butler', 'operational-manager', 'sales', 'hr', 'accountant', 'admin']),
  address: z.string().min(10, "Address is required."),
  idNumber: z.string().min(10, "Aadhar or PAN number is required."),
});

const staffSchema = staffBaseSchema.extend({
    password: z.string().min(6, "Password must be at least 6 characters."),
});

const editStaffSchema = staffBaseSchema.extend({
    password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
});

type ConfirmationResult = any;

export type Staff = {
  id: string;
  name: string;
  phone: string;
  role: 'waiter-steward' | 'supervisor' | 'pro' | 'senior-pro' | 'captain-butler' | 'operational-manager' | 'sales' | 'hr' | 'accountant' | 'admin';
  address: string;
  idNumber: string;
};

declare global {
    interface Window {
        recaptchaVerifier: any;
        confirmationResult: any;
    }
}

export default function AdminStaffPage() {
    const { toast } = useToast();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [step, setStep] = useState<'details' | 'otp'>('details');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    const form = useForm<z.infer<typeof staffSchema>>({
        resolver: zodResolver(staffSchema),
        defaultValues: { name: "", phone: "", role: "waiter-steward", password: "", address: "", idNumber: "" },
    });
    
    const editForm = useForm<z.infer<typeof editStaffSchema>>({
        resolver: zodResolver(editStaffSchema),
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
    
    useEffect(() => {
        if (!isDialogOpen) {
            // Reset state when dialog closes
            setEditingStaff(null);
            form.reset({ name: "", phone: "", role: "waiter-steward", password: "", address: "", idNumber: "" });
            editForm.reset();
            setStep('details');
            setConfirmationResult(null);
        } else {
             if (editingStaff) {
                 editForm.reset({ ...editingStaff, phone: editingStaff.phone.startsWith('+91') ? editingStaff.phone.substring(3) : editingStaff.phone });
             } else {
                 setupRecaptcha();
             }
        }
    }, [isDialogOpen, editingStaff, form, editForm]);

    const setupRecaptcha = () => {
        if (!auth) return;
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
            });
        }
    };


    const openDialogForEdit = (staffMember: Staff) => {
        setEditingStaff(staffMember);
        setIsDialogOpen(true);
    }
    
    const openDialogForNew = () => {
        setEditingStaff(null);
        setIsDialogOpen(true);
    }

    async function onEditSubmit(values: z.infer<typeof editStaffSchema>) {
        if (!editingStaff) return;
        setIsSubmitting(true);
        try {
            const staffDocRef = doc(db, "staff", editingStaff.id);
            const dataToUpdate = {
                name: values.name,
                role: values.role,
                address: values.address,
                idNumber: values.idNumber,
            };

            await updateDoc(staffDocRef, dataToUpdate);
            
            const userDocRef = doc(db, "users", editingStaff.id);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                await updateDoc(userDocRef, {
                    name: values.name,
                    role: values.role
                });
            }
            toast({ title: "Staff Updated", description: `${values.name}'s details have been updated.` });
            setIsDialogOpen(false);
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || `Could not save ${values.name}. Please try again.`,
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    async function onDetailsSubmit(values: z.infer<typeof staffSchema>) {
        setIsSubmitting(true);
        const appVerifier = window.recaptchaVerifier;
        const fullPhoneNumber = `+91${values.phone}`;

        try {
            // Temporarily sign out admin to not interfere with phone linking
            const adminUser = auth.currentUser;
            if (adminUser) await signOut(auth);

            const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);

            // Here we need to re-authenticate the admin silently in the background if possible, or handle the state appropriately.
            // For this implementation, we will proceed with the OTP flow, and the admin will need to log in again if their session was cleared.
            // A more robust solution might use a custom backend to manage this without admin signout.

            setConfirmationResult(result);
            setStep('otp');
            toast({ title: "OTP Sent", description: "Please ask the staff member for the verification code." });
        } catch (error: any) {
             console.error("Error sending OTP:", error);
            toast({
                variant: 'destructive',
                title: 'Error sending OTP',
                description: error.message || 'Could not send verification code. Please try again.',
            });
             if (window.recaptchaVerifier) {
                window.recaptchaVerifier.render().then((widgetId: any) => {
                    grecaptcha.reset(widgetId);
                });
            }
        } finally {
             setIsSubmitting(false);
        }
    }
    
    async function onOtpSubmit(otp: string) {
        if (!confirmationResult) return;
        setIsSubmitting(true);
        const { name, phone, password, role, address, idNumber } = form.getValues();
        const fullPhoneNumber = `+91${phone}`;
        const dummyEmail = `${fullPhoneNumber}@${DUMMY_EMAIL_DOMAIN}`;

        try {
            const userCredential = await confirmationResult.confirm(otp);
            const user = userCredential.user;

            const emailCredential = EmailAuthProvider.credential(dummyEmail, password);
            await linkWithCredential(user, emailCredential);

            const sharedData = {
                uid: user.uid,
                name,
                phone: fullPhoneNumber,
                role,
            };

            const staffData = {
                ...sharedData,
                address,
                idNumber,
            };

            await setDoc(doc(db, "staff", user.uid), staffData);
            await setDoc(doc(db, "users", user.uid), sharedData);
            
            // At this point, the new user is logged in. Sign them out.
            await signOut(auth);

            toast({ title: "Staff Added", description: `${name} has been added.` });
            setIsDialogOpen(false);
            // NOTE: The admin will need to refresh or re-login if their session was affected.
            // A production app would handle re-authentication seamlessly.
        } catch (error: any) {
             console.error("Error during OTP confirmation or account creation:", error);
            toast({
                variant: 'destructive',
                title: 'Staff Creation Failed',
                description: error.message || "An unknown error occurred.",
            });
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

    const renderNewStaffDialogContent = () => {
        if (step === 'otp') {
            return (
                <>
                 <DialogHeader>
                    <DialogTitle>Verify Phone Number</DialogTitle>
                    <DialogDescription>
                        Enter the OTP sent to the new staff member's phone.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-6 py-4">
                    <OtpInput length={6} onComplete={onOtpSubmit} disabled={isSubmitting} />
                    <Button onClick={() => onDetailsSubmit(form.getValues())} variant="link" size="sm" disabled={isSubmitting}>
                        Resend OTP
                    </Button>
                </div>
                </>
            )
        }

        return (
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onDetailsSubmit)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Add New Staff Member</DialogTitle>
                        <DialogDescription>
                            Fill in the details to create a new staff profile. An OTP will be sent to their phone.
                        </DialogDescription>
                    </DialogHeader>
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
                                    />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="123 Main St, Anytown..." {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="idNumber" render={({ field }) => (
                        <FormItem><FormLabel>Aadhar / PAN Number</FormLabel><FormControl><Input placeholder="XXXXXXXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel>Initial Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
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
                            {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                            {isSubmitting ? 'Sending...' : 'Send OTP'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        )
    };
    
    const renderEditStaffDialogContent = () => {
       return (
            <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Edit Staff Member</DialogTitle>
                        <DialogDescription>
                            Update the details for {editingStaff?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <FormField control={editForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={editForm.control} name="phone" render={({ field }) => (
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
                                        disabled={true}
                                    />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={editForm.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="123 Main St, Anytown..." {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={editForm.control} name="idNumber" render={({ field }) => (
                        <FormItem><FormLabel>Aadhar / PAN Number</FormLabel><FormControl><Input placeholder="XXXXXXXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={editForm.control} name="role" render={({ field }) => (
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
                            {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
       )
    }

    return (
        <Card>
            <div id="recaptcha-container"></div>
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
                        <DialogContent className="sm:max-w-[480px]">
                          {editingStaff ? renderEditStaffDialogContent() : renderNewStaffDialogContent()}
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

    