import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function AdminBillingPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Billing & Finance</CardTitle>
                <CardDescription>Handle GST/Non-GST bills, ledgers, and payouts.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-96 border-2 border-dashed rounded-lg bg-muted/30">
                    <DollarSign className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">Billing & Finance Module</h3>
                    <p>Feature coming soon.</p>
                </div>
            </CardContent>
        </Card>
    );
}
