import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderForm } from "@/components/order-form";
import { RecentOrdersTable } from "@/components/recent-orders-table";
import { ConsumerStats } from "@/components/consumer-stats";

export default function ConsumerDashboardPage() {
  return (
    <div className="grid gap-4 md:gap-8">
      
      <ConsumerStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Place New Order</CardTitle>
            <CardDescription>Specify your event details below.</CardDescription>
          </CardHeader>
          <CardContent>
            <OrderForm />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>A list of your recent and upcoming events.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentOrdersTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
