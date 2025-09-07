"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { UserPlus } from "lucide-react";

const newClientSchema = z.object({
  clientName: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email(),
  company: z.string().min(2, "Company name must be at least 2 characters."),
});

type Client = {
  id: string;
  name: string;
  email: string;
  company: string;
  since: string;
};

const initialClients: Client[] = [
    { id: 'CLI01', name: 'Alice Wonderland', email: 'alice@wondercorp.com', company: 'WonderCorp', since: '2023-01-15' },
    { id: 'CLI02', name: 'Bob Builder', email: 'bob@buildit.com', company: 'BuildIt Inc.', since: '2022-11-20' },
];

export default function SalesDashboardPage() {
    const { toast } = useToast();
    const [clients, setClients] = useState(initialClients);

    const form = useForm<z.infer<typeof newClientSchema>>({
        resolver: zodResolver(newClientSchema),
        defaultValues: { clientName: "", email: "", company: "" },
    });

    function onSubmit(values: z.infer<typeof newClientSchema>) {
        const newClient: Client = {
            id: `CLI${String(clients.length + 1).padStart(2, '0')}`,
            name: values.clientName,
            email: values.email,
            company: values.company,
            since: new Date().toISOString().split('T')[0],
        };
        setClients([newClient, ...clients]);
        toast({ title: "Client Added", description: `${values.clientName} from ${values.company} is now a client.` });
        form.reset();
    }

    return (
        <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Client</CardTitle>
                        <CardDescription>Create a new client account with login credentials.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="clientName" render={({ field }) => (
                                    <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Login Email</FormLabel><FormControl><Input type="email" placeholder="client@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="company" render={({ field }) => (
                                    <FormItem><FormLabel>Company</FormLabel><FormControl><Input placeholder="Company Inc." {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormItem>
                                  <FormLabel>Initial Password</FormLabel>
                                  <FormControl><Input type="password" value="password123" disabled readOnly /></FormControl>
                                  <FormMessage />
                                </FormItem>
                                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90"><UserPlus className="mr-2 h-4 w-4" /> Add Client</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Client List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Client Since</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-medium">{client.company}</TableCell>
                                        <TableCell>{client.name}</TableCell>
                                        <TableCell>{client.email}</TableCell>
                                        <TableCell>{client.since}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
