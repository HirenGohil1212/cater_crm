import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export default function AccountantDashboardPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Accountant Dashboard</CardTitle>
                <CardDescription>Financial overviews, payroll, and invoicing.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg bg-muted/30">
                    <Calculator className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">Accountant Module</h3>
                    <p>Feature coming soon.</p>
                </div>
            </CardContent>
        </Card>
    );
}
