import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function AdminDashboardPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Administrator Dashboard</CardTitle>
                <CardDescription>System settings, user management, and global configurations.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg bg-muted/30">
                    <Shield className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">Admin Module</h3>
                    <p>Feature coming soon.</p>
                </div>
            </CardContent>
        </Card>
    );
}
