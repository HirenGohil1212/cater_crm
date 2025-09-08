
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, DocumentData, QueryDocumentSnapshot, doc, getDoc } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

type Order = {
  id: string;
  date: string;
  attendees: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  menuType: "veg" | "non-veg";
  userId: string;
  userName?: string;
  invoiceStatus: "Pending" | "Generated";
};

async function getUserName(userId: string): Promise<string> {
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return userDocSnap.data().name || "Unknown User";
    }
    return "Unknown User";
}


function InvoiceList() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, orderBy("createdAt", "desc"));
  
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
          const userOrdersPromises = querySnapshot.docs.map(async (docSnap: QueryDocumentSnapshot<DocumentData>) => {
              const data = docSnap.data();
              const userName = await getUserName(data.userId);
              return {
                  id: docSnap.id,
                  date: data.date,
                  attendees: data.attendees,
                  status: data.status,
                  menuType: data.menuType,
                  userId: data.userId,
                  userName: userName,
                  invoiceStatus: data.invoiceStatus || "Pending",
              };
          });
  
          const userOrders = await Promise.all(userOrdersPromises);
          setOrders(userOrders as Order[]);
          setLoading(false);
      }, (error) => {
          console.error("Error fetching all orders: ", error);
          setLoading(false);
      });
  
      return () => unsubscribe();
    }, []);

    if (loading) {
        return (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Event Date</TableHead>
                        <TableHead>Attendees</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                    </TableRow>
                ))}
                </TableBody>
             </Table>
        )
      }
      
      if (orders.length === 0) {
        return <p className="text-center text-muted-foreground py-12">No orders to invoice yet.</p>
      }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Attendees</TableHead>
                    <TableHead>Event Status</TableHead>
                    <TableHead>Invoice Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map((order) => (
                    <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.userName}</TableCell>
                        <TableCell>{order.date}</TableCell>
                        <TableCell>{order.attendees}</TableCell>
                        <TableCell>
                            <Badge variant={order.status === "Completed" ? "default" : "secondary"}>{order.status}</Badge>
                        </TableCell>
                         <TableCell>
                            <Badge variant={order.invoiceStatus === 'Generated' ? 'secondary' : 'destructive'}>{order.invoiceStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="outline" size="sm">
                             <FileText className="mr-2 h-4 w-4" />
                             {order.invoiceStatus === 'Generated' ? 'View Invoice' : 'Generate Invoice'}
                           </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}


export default function AccountantDashboardPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & Finance</CardTitle>
        <CardDescription>
          Handle GST/Non-GST bills, ledgers, and staff payouts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="invoices">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices">
              <FileText className="mr-2 h-4 w-4" />
              Invoicing
            </TabsTrigger>
            <TabsTrigger value="ledgers">
              <Users className="mr-2 h-4 w-4" />
              Client Ledgers
            </TabsTrigger>
            <TabsTrigger value="payouts">
              <DollarSign className="mr-2 h-4 w-4" />
              Staff Payouts
            </TabsTrigger>
          </TabsList>
          <TabsContent value="invoices" className="mt-4">
              <Card>
                <CardHeader>
                    <CardTitle>Client Invoices</CardTitle>
                    <CardDescription>Generate and manage invoices for all client events.</CardDescription>
                </CardHeader>
                <CardContent>
                    <InvoiceList />
                </CardContent>
              </Card>
          </TabsContent>
          <TabsContent value="ledgers">
              <Card>
                 <CardHeader>
                    <CardTitle>Client Ledgers</CardTitle>
                    <CardDescription>View detailed financial ledgers for each client.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg bg-muted/30">
                        <Users className="h-16 w-16 mb-4" />
                        <h3 className="text-xl font-semibold">Client Ledgers</h3>
                        <p>Feature coming soon.</p>
                    </div>
                </CardContent>
              </Card>
          </TabsContent>
          <TabsContent value="payouts">
              <Card>
                 <CardHeader>
                    <CardTitle>Staff Payouts</CardTitle>
                    <CardDescription>Approve and process payouts for staff members.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg bg-muted/30">
                        <DollarSign className="h-16 w-16 mb-4" />
                        <h3 className="text-xl font-semibold">Staff Payouts</h3>
                        <p>Feature coming soon.</p>
                    </div>
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
