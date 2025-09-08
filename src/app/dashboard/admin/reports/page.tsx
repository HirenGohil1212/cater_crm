import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

export default function AdminReportsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Reports & Penalties</CardTitle>
                <CardDescription>Generate reports and manage staff penalties.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-96 border-2 border-dashed rounded-lg bg-muted/30">
                    <BarChart className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">Reports & Penalties Module</h3>
                    <p>Feature coming soon.</p>
                </div>
            </CardContent>
        </Card>
    );
}
