
"use client";

import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import { Loader2, MessageSquare } from "lucide-react";
import { sendMessage } from '@/app/actions/send-message';
import { format } from 'date-fns';

type Order = {
  id: string;
  date: string;
  userId: string;
  userName?: string;
};

const alertSchema = z.object({
  orderId: z.string().min(1, "Please select an event."),
  message: z.string().min(10, "Message must be at least 10 characters long."),
});

async function getUserName(userId: string): Promise<string> {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    return userDocSnap.exists() ? userDocSnap.data().companyName || userDocSnap.data().name : "Unknown Client";
}


export default function AdminAlertsPage() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof alertSchema>>({
        resolver: zodResolver(alertSchema),
    });

    useEffect(() => {
        const q = query(
            collection(db, "orders"), 
            where("status", "in", ["Confirmed", "Reviewed"]),
            orderBy("date", "desc")
        );
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const ordersPromises = snapshot.docs.map(async (doc) => {
                const data = doc.data();
                const userName = await getUserName(data.userId);
                return {
                    id: doc.id,
                    date: data.date,
                    userId: data.userId,
                    userName: userName,
                }
            });
            const ordersList = await Promise.all(ordersPromises);
            setOrders(ordersList as Order[]);
            setLoadingOrders(false);
        });

        return () => unsubscribe();
    }, []);

    async function onSubmit(values: z.infer<typeof alertSchema>) {
        setIsSubmitting(true);
        try {
            const result = await sendMessage(values);
            if (result.success) {
                toast({ title: "Success", description: result.message });
                form.reset();
            } else {
                throw new Error(result.error as string);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to Send',
                description: error.message || 'An unknown error occurred while sending the message.'
            });
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Alerts & Communications</CardTitle>
                <CardDescription>Send SMS messages to all staff assigned to a specific event.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="orderId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Event</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger disabled={loadingOrders}>
                                                <SelectValue placeholder={loadingOrders ? "Loading events..." : "Choose an upcoming event"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {orders.map(order => (
                                                <SelectItem key={order.id} value={order.id}>
                                                    {format(new Date(order.date), 'PPP')} - {order.userName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Message</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Type your message here. It will be sent as an SMS to all assigned staff."
                                            rows={5}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Standard SMS charges may apply.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                            Send Message to Staff
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
