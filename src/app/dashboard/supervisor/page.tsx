import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


const waiters = [
    { id: 'WTR01', name: 'John Doe', status: 'On Shift', event: 'Wedding Party' },
    { id: 'WTR02', name: 'Jane Smith', status: 'Available', event: '-' },
    { id: 'WTR03', name: 'Mike Johnson', status: 'On Break', event: 'Corporate Gala' },
    { id: 'WTR04', name: 'Emily Davis', status: 'Off Shift', event: '-' },
    { id: 'WTR05', name: 'Chris Lee', status: 'On Shift', event: 'Charity Ball' },
];

export default function SupervisorDashboardPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Staff Location Tracking</CardTitle>
                <CardDescription>View the current status and location of on-shift staff members.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Staff ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Current Event</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {waiters.map((waiter) => (
                            <TableRow key={waiter.id}>
                                <TableCell className="font-medium">{waiter.id}</TableCell>
                                <TableCell>{waiter.name}</TableCell>
                                <TableCell>{waiter.event}</TableCell>
                                <TableCell>
                                    <Badge variant={waiter.status === 'On Shift' ? 'default' : waiter.status === 'Available' ? 'secondary' : 'outline'}>{waiter.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" disabled={waiter.status !== 'On Shift'}>
                                                <MapPin className="mr-2 h-4 w-4" />
                                                View Location
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[625px]">
                                            <DialogHeader>
                                                <DialogTitle>Live Location for {waiter.name}</DialogTitle>
                                                <DialogDescription>
                                                    Real-time location from staff device. Last updated: just now.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="aspect-video w-full bg-muted rounded-md overflow-hidden border">
                                                <Image src="https://picsum.photos/600/400" alt="Map placeholder" width={600} height={400} className="w-full h-full object-cover" data-ai-hint="map city" />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
