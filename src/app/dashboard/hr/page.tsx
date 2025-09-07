import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

const staff = [
    { id: 'WTR01', name: 'John Doe', address: '123 Main St, Anytown, USA', idNumber: 'DL123456', role: 'Waiter' },
    { id: 'WTR02', name: 'Jane Smith', address: '456 Oak Ave, Sometown, USA', idNumber: 'ID789012', role: 'Waiter' },
    { id: 'SUP01', name: 'Mike Johnson', address: '789 Pine Ln, Othertown, USA', idNumber: 'PP345678', role: 'Supervisor' },
];

export default function HRDashboardPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Digital Staff Agreements</CardTitle>
                <CardDescription>Generate and manage employment agreements for all staff members.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Staff ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {staff.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell className="font-medium">{member.id}</TableCell>
                                <TableCell>{member.name}</TableCell>
                                <TableCell>{member.role}</TableCell>
                                <TableCell className="text-right">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <FileText className="mr-2 h-4 w-4" />
                                                Generate Agreement
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-3xl">
                                            <DialogHeader>
                                                <DialogTitle>Staff Agreement: {member.name}</DialogTitle>
                                                <DialogDescription>
                                                    This is a preview of the digital agreement. It can be downloaded as a PDF.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 text-sm border rounded-md p-6 max-h-[50vh] overflow-y-auto bg-muted/30">
                                                <h3 className="text-lg font-bold text-center mb-4">Employment Agreement</h3>
                                                <p>This agreement is made on {new Date().toLocaleDateString()} between <span className="font-semibold">Event Staffing Pro</span> ("the Company") and <span className="font-semibold">{member.name}</span> ("the Staff Member").</p>
                                                
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold text-base">1. Personal Information</h4>
                                                    <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                                                        <li><strong>Full Name:</strong> <span className="text-foreground">{member.name}</span></li>
                                                        <li><strong>Address:</strong> <span className="text-foreground">{member.address}</span></li>
                                                        <li><strong>ID Number:</strong> <span className="text-foreground">{member.idNumber}</span></li>
                                                    </ul>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold text-base">2. Position</h4>
                                                    <p>The Staff Member is employed in the position of <strong className="text-foreground">{member.role}</strong>.</p>
                                                </div>
                                                
                                                <p>... Additional clauses for Duties, Compensation, etc. would go here ...</p>
                                                
                                                <p className="pt-4">This document is legally binding upon signature. Please review carefully.</p>
                                                
                                                <div className="grid grid-cols-2 gap-8 pt-8 text-center text-muted-foreground">
                                                    <div>
                                                      <p className="border-b-2 border-dotted pb-2 mb-2">Signature</p>
                                                      <p>{member.name}</p>
                                                    </div>
                                                     <div>
                                                      <p className="border-b-2 border-dotted pb-2 mb-2">Signature</p>
                                                      <p>Event Staffing Pro (HR Department)</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline">Cancel</Button>
                                                </DialogClose>
                                                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Download as PDF
                                                </Button>
                                            </DialogFooter>
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
