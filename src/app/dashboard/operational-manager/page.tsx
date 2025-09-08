
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AllOrdersTableManager } from "@/components/all-orders-table-manager";

export default function OperationalManagerDashboardPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Event Staffing Management</CardTitle>
                <CardDescription>Review all incoming event orders and assign staff accordingly.</CardDescription>
            </CardHeader>
            <CardContent>
                <AllOrdersTableManager />
            </CardContent>
        </Card>
    );
}
