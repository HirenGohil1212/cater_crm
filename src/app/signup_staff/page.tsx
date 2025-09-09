
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import { Loader2, UtensilsCrossed } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';


const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    phone: z.string().length(10, "Please enter a valid 10-digit phone number."),
    terms: z.boolean().refine(val => val === true, { message: "You must accept the terms and conditions." }),
});


export default function SignupStaffPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", phone: "", terms: false },
    });


    async function onSubmit(values: z.infer<typeof formSchema>) {
       setIsSubmitting(true);
        try {
             await addDoc(collection(db, "inquiries"), {
                name: values.name,
                phone: `+91${values.phone}`,
                status: "New",
                createdAt: serverTimestamp(),
            });
            toast({ title: "Inquiry Submitted", description: "Thank you for your interest! Our HR team will contact you shortly." });
            form.reset();
            router.push('/');
        } catch(error: any) {
            console.error("Error submitting inquiry:", error);
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: error.message || "Could not submit your inquiry. Please try again later.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
            <div className="w-full max-w-md">
                <Card className="shadow-2xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <UtensilsCrossed className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight text-primary">
                            Work With Us
                        </CardTitle>
                        <CardDescription>
                            Interested in joining our team? Fill out your details below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center">
                                                <span className="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 border-input bg-background text-sm text-muted-foreground">
                                                    +91
                                                </span>
                                                <Input type="tel" maxLength={10} className="rounded-l-none" placeholder="9876543210" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField
                                    control={form.control}
                                    name="terms"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                   I agree to be contacted by the HR team.
                                                </FormLabel>
                                                <FormMessage />
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="animate-spin" />}
                                    {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
                                </Button>
                            </form>
                        </Form>
                         <div className="mt-4 text-center text-sm">
                            Already have an account?{' '}
                            <Link href="/" className="underline text-primary">
                                Login
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
