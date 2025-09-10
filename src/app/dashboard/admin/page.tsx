

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Users, Calendar, DollarSign, AlertTriangle, Briefcase, FileText, MessageSquare, Settings, Shield, Building2, User } from "lucide-react";
import Link from "next/link";

const adminFeatures = [
    { title: "User Management", description: "View and manage all users and roles.", icon: User, href: "/dashboard/admin/users" },
    { title: "Staff Management", description: "Add, edit, and track all staff members.", icon: Users, href: "/dashboard/admin/staff" },
    { title: "Event Management", description: "View and manage all upcoming and past events.", icon: Calendar, href: "/dashboard/admin/events" },
    { title: "Billing & Finance", description: "Handle GST/Non-GST bills, ledgers, and payouts.", icon: DollarSign, href: "/dashboard/admin/billing" },
    { title: "Reports & Penalties", description: "Generate reports and manage staff penalties.", icon: BarChart, href: "/dashboard/admin/reports" },
    { title: "Firms Management", description: "Manage different company entities for billing.", icon: Building2, href: "/dashboard/admin/firms" },
    { title: "Client Management", description: "Oversee all client accounts and agreements.", icon: Briefcase, href: "/dashboard/sales" },
    { title: "Operations", description: "Assign staff to events and manage logistics.", icon: Shield, href: "/dashboard/operational-manager" },
    { title: "HR & Training", description: "Manage staff inquiries, training, and agreements.", icon: FileText, href: "/dashboard/hr" },
    { title: "Alerts & Comms", description: "Send SMS/WhatsApp alerts to staff and clients.", icon: MessageSquare, href: "/dashboard/admin/alerts" },
    { title: "System Settings", description: "Configure global application settings.", icon: Settings, href: "#" },
];


export default function AdminDashboardPage() {
    return (
        <div className="flex flex-col gap-4 md:gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Administrator Dashboard</CardTitle>
                    <CardDescription>Global override and full control over all system modules.</CardDescription>
                </CardHeader>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {adminFeatures.map((feature) => (
                    <Link href={feature.href} key={feature.title}>
                        <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <div className="p-3 rounded-full bg-primary/10 text-primary">
                                    <feature.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                                    <CardDescription className="text-sm mt-1">{feature.description}</CardDescription>
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
