import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const orders = [
  {
    id: "ORD001",
    date: "2024-06-15",
    attendees: 50,
    status: "Confirmed",
    menu: "Veg",
  },
  {
    id: "ORD002",
    date: "2024-06-22",
    attendees: 120,
    status: "Confirmed",
    menu: "Non-Veg",
  },
  {
    id: "ORD003",
    date: "2024-07-01",
    attendees: 75,
    status: "Pending",
    menu: "Veg",
  },
  {
    id: "ORD004",
    date: "2024-05-30",
    attendees: 30,
    status: "Completed",
    menu: "Non-Veg",
  },
    {
    id: "ORD005",
    date: "2024-05-15",
    attendees: 85,
    status: "Completed",
    menu: "Veg",
  },
];

export function RecentOrdersTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead>Event Date</TableHead>
          <TableHead>Attendees</TableHead>
          <TableHead>Menu</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium">{order.id}</TableCell>
            <TableCell>{order.date}</TableCell>
            <TableCell>{order.attendees}</TableCell>
            <TableCell>
              <Badge variant={order.menu === 'Veg' ? 'secondary' : 'outline'}>{order.menu}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Badge
                variant={
                  order.status === "Confirmed"
                    ? "default"
                    : order.status === "Pending"
                    ? "destructive"
                    : "secondary"
                }
              >
                {order.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
