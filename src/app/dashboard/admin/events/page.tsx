import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function AdminEventsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Event Management</CardTitle>
                <CardDescription>View and manage all upcoming and past events.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-96 border-2 border-dashed rounded-lg bg-muted/30">
                    <Calendar className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">Event Management Module</h3>
                    <p>Feature coming soon.</p>
                </div>
            </CardContent>
        </Card>
    );
}
