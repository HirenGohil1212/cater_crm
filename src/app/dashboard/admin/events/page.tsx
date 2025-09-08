import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AllOrdersTable } from "@/components/all-orders-table";

export default function AdminEventsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>All Event Orders</CardTitle>
                <CardDescription>View and manage all upcoming and past events from every client.</CardDescription>
            </CardHeader>
            <CardContent>
                <AllOrdersTable />
            </CardContent>
        </Card>
    );
}
