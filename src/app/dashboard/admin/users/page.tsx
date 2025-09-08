
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
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, query, orderBy, DocumentData } from "firebase/firestore";
import { Edit } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { capitalize } from '@/lib/utils';

const userSchema = z.object({
  role: z.enum(['consumer', 'waiter-steward', 'supervisor', 'pro', 'senior-pro', 'captain-butler', 'operational-manager', 'sales', 'hr', 'accountant', 'admin']),
});

export type User = {
  id: string;
  name: string;
  phone: string;
  role: 'consumer' |'waiter-steward' | 'supervisor' | 'pro' | 'senior-pro' | 'captain-butler' | 'operational-manager' | 'sales' | 'hr' | 'accountant' | 'admin';
};

export default function AdminUsersPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const form = useForm<z.infer<typeof userSchema>>({
        resolver: zodResolver(userSchema),
    });

    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const userList = querySnapshot.docs.map(docSnap => {
                const data = docSnap.data() as DocumentData;
                return {
                    id: docSnap.id,
                    name: data.name,
                    phone: data.phone,
                    role: data.role
                }
            }) as User[];
            setUsers(userList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const openDialogForEdit = (user: User) => {
        setEditingUser(user);
        form.reset({ role: user.role });
        setIsDialogOpen(true);
    }

    async function onSubmit(values: z.infer<typeof userSchema>) {
        if (!editingUser) return;
        
        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, "users", editingUser.id);
            await updateDoc(userDocRef, { role: values.role });
            toast({ title: "User Role Updated", description: `${editingUser.name}'s role has been changed to ${capitalize(values.role)}.` });
            setIsDialogOpen(false);
            setEditingUser(null);
        } catch (error: any) {
            console.error("Error updating user role:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `Could not update ${editingUser.name}'s role. Please try again.`,
            });
        } finally {
            setIsSubmitting(false);
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
        if (users.length === 0) {
            return <TableRow><TableCell colSpan={4} className="text-center">No users found.</TableCell></TableRow>
        }
        return users.map((user) => (
            <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>{capitalize(user.role.replace('-', ' '))}</TableCell>
                <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openDialogForEdit(user)}>
                        <Edit className="mr-2 h-4 w-4"/> Edit Role
                    </Button>
                </TableCell>
            </TableRow>
        ));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View all registered client users and manage their roles.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Role for {editingUser?.name}</DialogTitle>
                            <DialogDescription>
                                Change the role for this user. This will grant them different permissions across the app.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="role" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="consumer">Client / Consumer</SelectItem>
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
                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
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
