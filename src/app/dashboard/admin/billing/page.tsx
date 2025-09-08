

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, Users, FileText } from "lucide-react";


export default function AdminBillingPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & Finance</CardTitle>
        <CardDescription>
          Handle GST/Non-GST bills, ledgers, and staff payouts. This module is now primarily managed by the Accountant role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6 border-2 border-dashed rounded-lg bg-muted/30">
                <FileText className="h-16 w-16 mb-4" />
                <h3 className="text-xl font-semibold">Client Invoicing</h3>
                <p>Managed by Accountant.</p>
            </div>
             <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6 border-2 border-dashed rounded-lg bg-muted/30">
                <Users className="h-16 w-16 mb-4" />
                <h3 className="text-xl font-semibold">Client Ledgers</h3>
                <p>Managed by Accountant.</p>
            </div>
             <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6 border-2 border-dashed rounded-lg bg-muted/30">
                <DollarSign className="h-16 w-16 mb-4" />
                <h3 className="text-xl font-semibold">Staff Payouts</h3>
                <p>Managed by Accountant.</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
