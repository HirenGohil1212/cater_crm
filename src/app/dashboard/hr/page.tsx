
"use client";

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { FileText, Download, Loader2 } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import type { Staff } from '@/app/dashboard/admin/staff/page';

export default function HRDashboardPage() {
    const { toast } = useToast();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "staff"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const staffList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            setStaff(staffList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching staff:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: "Could not fetch staff list.",
            });
            setLoading(false);
        });
        return () => unsubscribe();
    }, [toast]);

    const handleGenerateClick = (member: Staff) => {
        setSelectedStaff(member);
        setIsDialogOpen(true);
    }
    
    const renderTableBody = () => {
        if (loading) {
            return [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-40 ml-auto" /></TableCell>
                </TableRow>
            ));
        }
        if (staff.length === 0) {
            return <TableRow><TableCell colSpan={4} className="text-center">No staff members found.</TableCell></TableRow>
        }
        return staff.map((member) => (
            <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.phone}</TableCell>
                <TableCell>{member.role}</TableCell>
                <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleGenerateClick(member)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Agreement
                    </Button>
                </TableCell>
            </TableRow>
        ));
    }


    return (
        <>
        <Card>
            <CardHeader>
                <CardTitle>Digital Staff Agreements</CardTitle>
                <CardDescription>Generate and manage employment agreements for all staff members.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderTableBody()}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-3xl">
                {selectedStaff && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Staff Agreement: {selectedStaff.name}</DialogTitle>
                            <DialogDescription>
                                This is a preview of the digital agreement. It can be downloaded as a PDF.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 text-sm border rounded-md p-6 max-h-[50vh] overflow-y-auto bg-muted/30">
                            <h3 className="text-lg font-bold text-center mb-4">Employment Agreement</h3>
                            <p>This agreement is made on {new Date().toLocaleDateString()} between <span className="font-semibold">Event Staffing Pro</span> ("the Company") and <span className="font-semibold">{selectedStaff.name}</span> ("the Staff Member").</p>
                            
                            <div className="space-y-2">
                                <h4 className="font-semibold text-base">1. Personal Information</h4>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                                    <li><strong>Full Name:</strong> <span className="text-foreground">{selectedStaff.name}</span></li>
                                    <li><strong>Address:</strong> <span className="text-foreground">{selectedStaff.address || 'N/A'}</span></li>
                                    <li><strong>ID Number (Aadhar/PAN):</strong> <span className="text-foreground">{selectedStaff.idNumber || 'N/A'}</span></li>
                                </ul>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="font-semibold text-base">2. Position</h4>
                                <p>The Staff Member is employed in the position of <strong className="text-foreground">{selectedStaff.role}</strong>.</p>
                            </div>
                            
                            <p>... Additional clauses for Duties, Compensation, etc. would go here ...</p>
                            
                            <p className="pt-4">This document is legally binding upon signature. Please review carefully.</p>
                            
                            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-muted-foreground">
                                <div>
                                  <p className="border-b-2 border-dotted pb-2 mb-2">Signature</p>
                                  <p>{selectedStaff.name}</p>
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
                            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => toast({ title: "Coming Soon!", description: "PDF generation will be implemented soon."})}>
                                <Download className="mr-2 h-4 w-4" />
                                Download as PDF
                            </Button>
                        </DialogFooter>
                    </>
                )}
                 {!selectedStaff && <p>No staff member selected.</p>}
            </DialogContent>
        </Dialog>
        </>
    );
}

    