
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { auth, db, DUMMY_EMAIL_DOMAIN } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, setDoc, doc, where, getDocs } from "firebase/firestore";
import { signInWithPhoneNumber, RecaptchaVerifier, linkWithCredential, EmailAuthProvider, signOut } from "firebase/auth";
import { FileText, Download, Loader2, BookUser, ClipboardCheck, PlusCircle } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import type { Staff } from '@/app/dashboard/admin/staff/page';
import { Textarea } from '@/components/ui/textarea';
import { OtpInput } from '@/components/otp-input';


type ConfirmationResult = any;

const inquirySchema = z.object({
  status: z.enum(["New", "Contacted", "Hired", "Rejected"]),
});


type Inquiry = {
    id: string;
    name: string;
    phone: string;
    status: "New" | "Contacted" | "Hired" | "Rejected";
    createdAt: any;
}


const staffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().length(10, "Please enter a valid 10-digit phone number."),
  role: z.enum(['waiter-steward', 'supervisor', 'pro', 'senior-pro', 'captain-butler']),
  password: z.string().min(6, "Password must be at least 6 characters."),
  address: z.string().min(10, "Address is required."),
  idNumber: z.string().min(10, "Aadhar or PAN number is required."),
  staffType: z.enum(['individual', 'group-leader', 'outsourced', 'salaried']),
  bankAccountNumber: z.string().optional(),
  bankIfscCode: z.string().optional(),
  perEventCharge: z.coerce.number().optional(),
  monthlySalary: z.coerce.number().optional(),
});

function PlaceholderTab({ title, icon: Icon }: { title: string, icon: React.ElementType }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-96 border-2 border-dashed rounded-lg bg-muted/30">
                    <Icon className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <p>Feature coming soon.</p>
                </div>
            </CardContent>
        </Card>
    )
}

function AgreementsTab() {
    const { toast } = useToast();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [isAgreementDialogOpen, setIsAgreementDialogOpen] = useState(false);
    const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false);
    const [agreementText, setAgreementText] = useState('');
    const agreementContentRef = useRef<HTMLDivElement>(null);
    
    // Add Staff Form State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'details' | 'otp'>('details');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    
    const form = useForm<z.infer<typeof staffSchema>>({
        resolver: zodResolver(staffSchema),
        defaultValues: { name: "", phone: "", role: "waiter-steward", password: "", address: "", idNumber: "", staffType: "individual", perEventCharge: 0, monthlySalary: 0, bankAccountNumber: '', bankIfscCode: '' },
    });
    
    const staffType = form.watch('staffType');


     useEffect(() => {
        const waiterRoles = ['waiter-steward', 'supervisor', 'pro', 'senior-pro', 'captain-butler'];
        const q = query(collection(db, "staff"), where('role', 'in', waiterRoles));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const staffList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            staffList.sort((a, b) => a.name.localeCompare(b.name));
            setStaff(staffList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching staff:", error);
            toast({
                variant: 'destructive',
                title: 'Error fetching staff',
                description: "Could not fetch staff list. This may be due to a missing database index.",
            });
            setLoading(false);
        });
        return () => unsubscribe();
    }, [toast]);
    
     useEffect(() => {
        if (isAddStaffDialogOpen) {
             setupRecaptcha();
        } else {
            // Reset state when dialog closes
            form.reset({ name: "", phone: "", role: "waiter-steward", password: "", address: "", idNumber: "", staffType: "individual", perEventCharge: 0, monthlySalary: 0, bankAccountNumber: '', bankIfscCode: '' });
            setStep('details');
            setConfirmationResult(null);
        }
    }, [isAddStaffDialogOpen, form]);
    
     useEffect(() => {
        if (!isAgreementDialogOpen) {
            setSelectedStaff(null);
            setAgreementText('');
        }
    }, [isAgreementDialogOpen]);


    const generateAgreementTemplate = (staff: Staff) => {
        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        const compensationAmount = staff.staffType === 'salaried' ? staff.monthlySalary : staff.perEventCharge;
        const compensationType = staff.staffType === 'salaried' ? 'monthly salary' : 'per event charge';

        return `
        EMPLOYMENT AGREEMENT
        
Date: ${today}

PARTIES:
  1. Event Staffing Pro ("the Company")
  2. ${staff.name} ("the Staff Member")

STAFF DETAILS:
  - Name:             ${staff.name}
  - Address:          ${staff.address}
  - Role:             ${staff.role}
  - ID Number:        ${staff.idNumber}
  - Bank Account:     ${staff.bankAccountNumber || 'N/A'}
  - IFSC Code:        ${staff.bankIfscCode || 'N/A'}

TERMS & CONDITIONS:

1. POSITION
   The Staff Member is employed in the position of ${staff.role}.

2. COMPENSATION
   The Company shall pay the Staff Member a ${compensationType} of ₹${compensationAmount}.

3. DUTIES AND RESPONSIBILITIES
   The Staff Member is expected to perform all duties related to the role of ${staff.role} as required by the Company for various events.

4. TERM OF EMPLOYMENT
   This is an at-will employment relationship.

5. CONFIDENTIALITY
   The Staff Member agrees to keep all Company information confidential.

6. TERMINATION
   The Company may terminate this agreement at any time for any reason.

7. GOVERNING LAW
   This Agreement shall be governed by the laws of India.

---
Signed,


_________________________
Event Staffing Pro


_________________________
${staff.name}
        `.trim();
    }

    const handleGenerateClick = (member: Staff) => {
        setSelectedStaff(member);
        const agreement = generateAgreementTemplate(member);
        setAgreementText(agreement);
        setIsAgreementDialogOpen(true);
    }
    
     const setupRecaptcha = () => {
        if (!auth) return;
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-hr', {
                'size': 'invisible',
            });
        }
    };

    const handleDownloadPdf = () => {
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        
        pdf.setFont('Helvetica');
        pdf.setFontSize(10);

        const textLines = pdf.splitTextToSize(agreementText, pdfWidth - margin * 2);
        
        let y = margin;
        textLines.forEach((line: string) => {
            if (y > pdfHeight - margin) {
                pdf.addPage();
                y = margin;
            }
            pdf.text(line, margin, y);
            y += 12; // Line height
        });

        pdf.save(`Agreement-${selectedStaff?.name}.pdf`);
        toast({ title: "PDF Downloaded", description: "The agreement has been saved."});
    };
    
    async function onDetailsSubmit(values: z.infer<typeof staffSchema>) {
        setIsSubmitting(true);
        const appVerifier = window.recaptchaVerifier;
        const fullPhoneNumber = `+91${values.phone}`;

        try {
            // Temporarily sign out admin/hr to not interfere with phone linking
            const currentUser = auth.currentUser;
            if (currentUser) await signOut(auth);

            const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
            setConfirmationResult(result);
            setStep('otp');
            toast({ title: "OTP Sent", description: "Please ask the staff member for the verification code." });
        } catch (error: any) {
             console.error("Error sending OTP:", error);
            toast({
                variant: 'destructive',
                title: 'Error sending OTP',
                description: error.message || 'Could not send verification code. Please try again.',
            });
             if (window.recaptchaVerifier) {
                window.recaptchaVerifier.render().then((widgetId: any) => {
                    grecaptcha.reset(widgetId);
                });
            }
        } finally {
             setIsSubmitting(false);
        }
    }
    
    async function onOtpSubmit(otp: string) {
        if (!confirmationResult) return;
        setIsSubmitting(true);
        const values = form.getValues();
        const fullPhoneNumber = `+91${values.phone}`;
        const dummyEmail = `${fullPhoneNumber}@${DUMMY_EMAIL_DOMAIN}`;

        try {
            const userCredential = await confirmationResult.confirm(otp);
            const user = userCredential.user;

            const emailCredential = EmailAuthProvider.credential(dummyEmail, values.password);
            await linkWithCredential(user, emailCredential);

            const sharedData = {
                uid: user.uid,
                name: values.name,
                phone: fullPhoneNumber,
                role: values.role,
            };

            const staffData: any = {
                ...sharedData,
                address: values.address,
                idNumber: values.idNumber,
                staffType: values.staffType,
                bankAccountNumber: values.bankAccountNumber || '',
                bankIfscCode: values.bankIfscCode || '',
            };

            if (values.staffType === 'salaried') {
                staffData.monthlySalary = values.monthlySalary || 0;
                staffData.perEventCharge = 0;
            } else {
                staffData.perEventCharge = values.perEventCharge || 0;
                staffData.monthlySalary = 0;
            }

            await setDoc(doc(db, "staff", user.uid), staffData);
            await setDoc(doc(db, "users", user.uid), sharedData);
            
            await signOut(auth);

            toast({ title: "Staff Added", description: `${values.name} has been added.` });
            setIsAddStaffDialogOpen(false);
        } catch (error: any) {
             console.error("Error during OTP confirmation or account creation:", error);
            toast({
                variant: 'destructive',
                title: 'Staff Creation Failed',
                description: error.message || "An unknown error occurred.",
            });
        } finally {
            setIsSubmitting(false);
            toast({
                title: "Action Required",
                description: "For security, you may have been logged out. Please log in again if you face issues.",
                duration: 5000,
            });
        }
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
    
    const renderNewStaffDialogContent = () => {
        if (step === 'otp') {
            return (
                <>
                 <DialogHeader>
                    <DialogTitle>Verify Phone Number</DialogTitle>
                    <DialogDescription>
                        Enter the OTP sent to the new staff member's phone.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-6 py-4">
                    <OtpInput length={6} onComplete={onOtpSubmit} disabled={isSubmitting} />
                    <Button onClick={() => onDetailsSubmit(form.getValues())} variant="link" size="sm" disabled={isSubmitting}>
                        Resend OTP
                    </Button>
                </div>
                </>
            )
        }

        return (
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onDetailsSubmit)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Add New Staff Member</DialogTitle>
                        <DialogDescription>
                            Fill in the details to create a new staff profile. An OTP will be sent to their phone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                    <div className="flex items-center">
                                        <span className="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 border-input bg-background text-sm text-muted-foreground">
                                            +91
                                        </span>
                                        <Input 
                                            type="tel"
                                            maxLength={10}
                                            className="rounded-l-none" 
                                            placeholder="9876543210" 
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                     <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="123 Main St, Anytown..." {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="idNumber" render={({ field }) => (
                        <FormItem><FormLabel>Aadhar / PAN Number</FormLabel><FormControl><Input placeholder="XXXXXXXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="password" render={({ field }) => (
                            <FormItem><FormLabel>Initial Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="role" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="waiter-steward">Waiter / Steward</SelectItem>
                                        <SelectItem value="supervisor">Supervisor</SelectItem>
                                        <SelectItem value="pro">PRO</SelectItem>
                                        <SelectItem value="senior-pro">Senior PRO</SelectItem>
                                        <SelectItem value="captain-butler">Captain / Butler</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                     <FormField control={form.control} name="staffType" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Staff Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="individual">Individual (In-House)</SelectItem>
                                    <SelectItem value="group-leader">Group Leader</SelectItem>
                                    <SelectItem value="outsourced">Outsourced</SelectItem>
                                    <SelectItem value="salaried">Salaried</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     {staffType === 'salaried' ? (
                         <FormField control={form.control} name="monthlySalary" render={({ field }) => (
                            <FormItem><FormLabel>Monthly Salary</FormLabel><FormControl><Input type="number" placeholder="e.g., 30000" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    ) : (
                         <FormField control={form.control} name="perEventCharge" render={({ field }) => (
                            <FormItem><FormLabel>Per Event Charge</FormLabel><FormControl><Input type="number" placeholder="e.g., 1500" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    )}
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="bankAccountNumber" render={({ field }) => (
                            <FormItem><FormLabel>Bank Account Number</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="bankIfscCode" render={({ field }) => (
                            <FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input placeholder="ABCD0123456" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                     </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline" onClick={() => setIsAddStaffDialogOpen(false)}>Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                            {isSubmitting ? 'Sending...' : 'Send OTP'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        )
    };


    return (
        <>
            <Card>
                <div id="recaptcha-container-hr"></div>
                <CardHeader className='flex-row items-center justify-between'>
                    <div>
                        <CardTitle>Digital Staff Agreements</CardTitle>
                        <CardDescription>Generate and manage employment agreements for all staff members.</CardDescription>
                    </div>
                    <Dialog open={isAddStaffDialogOpen} onOpenChange={setIsAddStaffDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4"/> Add New Staff</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                          {renderNewStaffDialogContent()}
                        </DialogContent>
                    </Dialog>
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

            <Dialog open={isAgreementDialogOpen} onOpenChange={setIsAgreementDialogOpen}>
            <DialogContent className="sm:max-w-3xl">
                {selectedStaff && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Staff Agreement: {selectedStaff.name}</DialogTitle>
                            <DialogDescription>
                                Preview and edit the digital agreement below. It can be downloaded as a PDF.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                             <Textarea
                                value={agreementText}
                                onChange={(e) => setAgreementText(e.target.value)}
                                className="h-80 w-full font-mono text-xs"
                                placeholder="Agreement text..."
                             />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleDownloadPdf}>
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
    )
}

function InquiryTab() {
     const [inquiries, setInquiries] = useState<Inquiry[]>([]);
     const [loading, setLoading] = useState(true);
     const { toast } = useToast();

     const form = useForm<z.infer<typeof inquirySchema>>();

     useEffect(() => {
        const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const inquiryList = snapshot.docs.map(doc => ({id: doc.id, ...doc.data() } as Inquiry));
            setInquiries(inquiryList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching inquiries:", error);
            setLoading(false);
        });
        return () => unsubscribe();
     }, []);

    const handleStatusChange = async (inquiryId: string, status: string) => {
        const inquiryRef = doc(db, "inquiries", inquiryId);
        try {
            await setDoc(inquiryRef, { status }, { merge: true });
            toast({ title: "Status Updated", description: "The inquiry status has been changed."})
        } catch (error) {
            console.error("Failed to update status: ", error);
            toast({ variant: 'destructive', title: "Update Failed", description: "Could not update the inquiry status."})
        }
    }


     if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Inquiry & Lead Management</CardTitle>
                    <CardDescription>Manage new staff member leads and inquiries.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        )
     }

     return (
        <Card>
            <CardHeader>
                <CardTitle>Inquiry & Lead Management</CardTitle>
                <CardDescription>Manage new staff member leads and inquiries.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {inquiries.length === 0 && (
                             <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    No new inquiries found.
                                </TableCell>
                            </TableRow>
                        )}
                        {inquiries.map((inquiry) => (
                             <TableRow key={inquiry.id}>
                                <TableCell className='font-medium'>{inquiry.name}</TableCell>
                                <TableCell>{inquiry.phone}</TableCell>
                                <TableCell>{inquiry.createdAt?.toDate().toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Select
                                        defaultValue={inquiry.status}
                                        onValueChange={(value) => handleStatusChange(inquiry.id, value)}
                                    >
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Set status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="New">New</SelectItem>
                                            <SelectItem value="Contacted">Contacted</SelectItem>
                                            <SelectItem value="Hired">Hired</SelectItem>
                                            <SelectItem value="Rejected">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-right">
                                    {/* Future actions can go here */}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </CardContent>
        </Card>
     )
}

export default function HRDashboardPage() {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);

    useEffect(() => {
        const q = query(collection(db, "users"), where('role', '==', 'inquiry'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const inquiriesDocs = await getDocs(q);
            setInquiries(inquiriesDocs.docs.map(d => ({id: d.id, ...d.data()})) as Inquiry[]);
        });
        return () => unsubscribe();
    }, []);

    return (
        <Tabs defaultValue="agreements" className="w-full">
            <Card>
                <CardHeader>
                    <CardTitle>Human Resources Dashboard</CardTitle>
                    <CardDescription>Manage staff agreements, inquiries, training, and data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="agreements"><FileText className="mr-2 h-4 w-4" />Staff Agreements</TabsTrigger>
                        <TabsTrigger value="inquiries"><BookUser className="mr-2 h-4 w-4" />Inquiry Management</TabsTrigger>
                        <TabsTrigger value="training"><ClipboardCheck className="mr-2 h-4 w-4" />Staff Training</TabsTrigger>
                    </TabsList>
                </CardContent>
            </Card>

            <TabsContent value="agreements" className="mt-4">
                <AgreementsTab />
            </TabsContent>
            <TabsContent value="inquiries" className="mt-4">
                 <InquiryTab />
            </TabsContent>
            <TabsContent value="training" className="mt-4">
                <PlaceholderTab title="Staff Training" icon={ClipboardCheck} />
            </TabsContent>
        </Tabs>
    );
}
