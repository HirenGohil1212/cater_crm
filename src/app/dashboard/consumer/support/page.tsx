
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building, Phone, Mail, User, Shield, Briefcase, Calculator } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const contacts = [
    {
        department: "Sales Department",
        description: "For new bookings, client agreements, and event inquiries.",
        name: "Alex Green",
        role: "Sales Manager",
        phone: "+91 98765 43210",
        email: "sales@eventstaffingpro.app",
        icon: Briefcase,
        avatar: "sales"
    },
    {
        department: "Accounts Department",
        description: "For billing, invoices, and payment-related questions.",
        name: "Priya Patel",
        role: "Head Accountant",
        phone: "+91 98765 43211",
        email: "accounts@eventstaffingpro.app",
        icon: Calculator,
        avatar: "accounts"
    },
    {
        department: "Operations Department",
        description: "For on-site coordination and staff management issues.",
        name: "Mike Ross",
        role: "Operations Manager",
        phone: "+91 98765 43212",
        email: "ops@eventstaffingpro.app",
        icon: Shield,
        avatar: "ops"
    }
];


export default function ConsumerSupportPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Contact & Support</CardTitle>
                <CardDescription>Get in touch with the right department for your needs.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8">
                {contacts.map((contact, index) => (
                    <div key={contact.department}>
                        <div className="grid gap-y-4 gap-x-8 md:grid-cols-3">
                            <div className="md:col-span-1">
                                <div className="flex items-center gap-3">
                                    <contact.icon className="h-6 w-6 text-primary" />
                                    <h3 className="text-lg font-semibold">{contact.department}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 pl-9">{contact.description}</p>
                            </div>
                            <div className="md:col-span-2 grid sm:grid-cols-2 gap-4 items-start pl-9 md:pl-0">
                                <div className="flex items-center gap-4">
                                     <Avatar>
                                        <AvatarImage src={`https://picsum.photos/seed/${contact.avatar}/40/40`} alt={contact.name} data-ai-hint="person portrait" />
                                        <AvatarFallback>{contact.name.substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{contact.name}</p>
                                        <p className="text-sm text-muted-foreground">{contact.role}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {index < contacts.length - 1 && <Separator className="mt-8"/>}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
