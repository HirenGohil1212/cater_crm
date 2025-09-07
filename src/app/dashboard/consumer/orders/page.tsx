import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecentOrdersTable } from "@/components/recent-orders-table";

export default function MyOrdersPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>My Orders</CardTitle>
                <CardDescription>Full history of your past and upcoming events.</CardDescription>
            </CardHeader>
            <CardContent>
                <RecentOrdersTable />
            </CardContent>
        </Card>
    );
}
