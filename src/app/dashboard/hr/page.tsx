
"use client";

import { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { collection, onSnapshot, query, orderBy, setDoc, doc } from "firebase/firestore";
import { signInWithPhoneNumber, RecaptchaVerifier, linkWithCredential, EmailAuthProvider, signOut } from "firebase/auth";
import { FileText, Download, Loader2, BookUser, ClipboardCheck, PlusCircle } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import type { Staff } from '@/app/dashboard/admin/staff/page';
import { Textarea } from '@/components/ui/textarea';
import { OtpInput } from '@/components/otp-input';

type ConfirmationResult = any;

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
    
    // Add Staff Form State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'details' | 'otp'>('details');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    
    const form = useForm<z.infer<typeof staffSchema>>({
        resolver: zodResolver(staffSchema),
        defaultValues: { name: "", phone: "", role: "waiter-steward", password: "", address: "", idNumber: "", staffType: "individual" },
    });
    
    const staffType = form.watch('staffType');


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
    
     useEffect(() => {
        if (isAddStaffDialogOpen) {
             setupRecaptcha();
        } else {
            // Reset state when dialog closes
            form.reset({ name: "", phone: "", role: "waiter-steward", password: "", address: "", idNumber: "", staffType: "individual" });
            setStep('details');
            setConfirmationResult(null);
        }
    }, [isAddStaffDialogOpen, form]);

    const handleGenerateClick = (member: Staff) => {
        setSelectedStaff(member);
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
            } else {
                staffData.perEventCharge = values.perEventCharge || 0;
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
                                    <li><strong>Staff Type:</strong> <span className="text-foreground">{selectedStaff.staffType || 'N/A'}</span></li>
                                </ul>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="font-semibold text-base">2. Position</h4>
                                <p>The Staff Member is employed in the position of <strong className="text-foreground">{selectedStaff.role}</strong>.</p>
                            </div>
                             <div className="space-y-2">
                                <h4 className="font-semibold text-base">3. Compensation</h4>
                                 <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                                     {selectedStaff.staffType === 'salaried' ? (
                                        <li><strong>Monthly Salary:</strong> <span className="text-foreground">₹{selectedStaff.monthlySalary?.toLocaleString() || 'N/A'}</span></li>
                                     ) : (
                                        <li><strong>Per Event Charge:</strong> <span className="text-foreground">₹{selectedStaff.perEventCharge?.toLocaleString() || 'N/A'}</span></li>
                                     )}
                                </ul>
                            </div>
                             <div className="space-y-2">
                                <h4 className="font-semibold text-base">4. Banking Information</h4>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                                    <li><strong>Bank Account Number:</strong> <span className="text-foreground">{selectedStaff.bankAccountNumber || 'N/A'}</span></li>
                                    <li><strong>IFSC Code:</strong> <span className="text-foreground">{selectedStaff.bankIfscCode || 'N/A'}</span></li>
                                </ul>
                            </div>
                            
                            <p>... Additional clauses for Duties, etc. would go here ...</p>
                            
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
    )
}

export default function HRDashboardPage() {
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
                <PlaceholderTab title="Inquiry & Lead Management" icon={BookUser} />
            </TabsContent>
            <TabsContent value="training" className="mt-4">
                <PlaceholderTab title="Staff Training" icon={ClipboardCheck} />
            </TabsContent>
        </Tabs>
    );
}
