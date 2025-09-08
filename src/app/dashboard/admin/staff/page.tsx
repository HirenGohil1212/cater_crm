import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function AdminStaffPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Staff Management</CardTitle>
                <CardDescription>Add, edit, and track all staff members.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-96 border-2 border-dashed rounded-lg bg-muted/30">
                    <Users className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">Staff Management Module</h3>
                    <p>Feature coming soon.</p>
                </div>
            </CardContent>
        </Card>
    );
}
