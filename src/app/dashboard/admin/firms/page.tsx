
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
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, query, orderBy } from "firebase/firestore";
import { Loader2, PlusCircle } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

const firmSchema = z.object({
  companyName: z.string().min(2, "Company name is required."),
  address: z.string().min(10, "Address is required."),
  contactNumber: z.string().length(10, "Please enter a valid 10-digit phone number."),
  gstType: z.enum(['gst', 'non-gst']),
  gstNumber: z.string().optional(),
  gstPercentage: z.coerce.number().optional(),
}).refine(data => {
    if (data.gstType === 'gst') {
        return !!data.gstNumber && data.gstNumber.length > 0;
    }
    return true;
}, {
    message: "GST Number is required for GST firms.",
    path: ["gstNumber"],
}).refine(data => {
    if (data.gstType === 'gst') {
        return data.gstPercentage !== undefined && data.gstPercentage > 0;
    }
    return true;
}, {
    message: "GST Percentage is required for GST firms.",
    path: ["gstPercentage"],
});

type Firm = {
  id: string;
  companyName: string;
  address: string;
  contactNumber: string;
  gstType: 'gst' | 'non-gst';
  gstNumber?: string;
  gstPercentage?: number;
};

function AddFirmForm({ onFirmAdded }: { onFirmAdded: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<z.infer<typeof firmSchema>>({
        resolver: zodResolver(firmSchema),
        defaultValues: {
            companyName: "",
            address: "",
            contactNumber: "",
            gstType: "non-gst",
            gstNumber: "",
            gstPercentage: 0,
        },
    });

    const gstType = form.watch('gstType');

    async function onSubmit(values: z.infer<typeof firmSchema>) {
        setIsSubmitting(true);
        try {
            const dataToSave: any = { ...values };
            if (values.gstType === 'non-gst') {
                delete dataToSave.gstNumber;
                delete dataToSave.gstPercentage;
            }

            await addDoc(collection(db, "firms"), dataToSave);
            toast({ title: "Firm Added", description: `${values.companyName} has been added.` });
            form.reset();
            onFirmAdded();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: `Could not add firm: ${error.message}` });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add New Firm</CardTitle>
                <CardDescription>Add one of your own company profiles for billing purposes.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="companyName" render={({ field }) => (
                            <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="e.g., EventPro Services" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="123 Business Lane, Metro City" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="contactNumber" render={({ field }) => (
                            <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input type="tel" placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="gstType" render={({ field }) => (
                            <FormItem className="space-y-3"><FormLabel>Tax Type</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="non-gst" /></FormControl>
                                            <FormLabel className="font-normal">Non-GST</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="gst" /></FormControl>
                                            <FormLabel className="font-normal">GST</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        {gstType === 'gst' && (
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="gstNumber" render={({ field }) => (
                                    <FormItem><FormLabel>GST Number</FormLabel><FormControl><Input placeholder="22AAAAA0000A1Z5" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="gstPercentage" render={({ field }) => (
                                    <FormItem><FormLabel>GST %</FormLabel><FormControl><Input type="number" placeholder="18" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        )}
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            {isSubmitting ? 'Adding...' : 'Add Firm'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

function FirmsList({ listKey }: { listKey: number }) {
    const [firms, setFirms] = useState<Firm[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "firms"), orderBy("companyName"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const firmsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Firm));
            setFirms(firmsList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching firms:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [listKey]);

    const renderTableBody = () => {
        if (loading) {
            return [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                </TableRow>
            ));
        }
        if (firms.length === 0) {
            return <TableRow><TableCell colSpan={4} className="text-center h-24">No firms added yet.</TableCell></TableRow>;
        }
        return firms.map((firm) => (
            <TableRow key={firm.id}>
                <TableCell className="font-medium">{firm.companyName}</TableCell>
                <TableCell>{firm.contactNumber}</TableCell>
                <TableCell>{firm.gstNumber || 'N/A'}</TableCell>
                <TableCell>{firm.gstPercentage ? `${firm.gstPercentage}%` : 'N/A'}</TableCell>
            </TableRow>
        ));
    };

    return (
         <Card>
            <CardHeader>
                <CardTitle>Registered Firms</CardTitle>
                <CardDescription>List of all your billing entities.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>GST Number</TableHead>
                            <TableHead>GST %</TableHead>
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

export default function AdminFirmsPage() {
    const [listKey, setListKey] = useState(0);

    return (
        <div className="space-y-8">
            <AddFirmForm onFirmAdded={() => setListKey(k => k + 1)} />
            <FirmsList listKey={listKey} />
        </div>
    );
}
