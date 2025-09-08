"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { OtpInput } from '@/components/otp-input';
import { useToast } from '@/hooks/use-toast';
import { auth, db, DUMMY_EMAIL_DOMAIN } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number with country code."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    terms: z.boolean().refine(val => val === true, { message: "You must accept the terms and conditions." }),
});

type ConfirmationResult = any;

export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState<'details' | 'otp'>('details');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", phone: "", password: "", terms: false },
    });

    const setupRecaptcha = () => {
        if (!auth) return;
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response: any) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                }
            });
        }
    };

    async function onDetailsSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        setupRecaptcha();
        const appVerifier = window.recaptchaVerifier;

        try {
            const result = await signInWithPhoneNumber(auth, values.phone, appVerifier);
            setConfirmationResult(result);
            setStep('otp');
            toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
        } catch (error: any) {
            console.error("Error during phone verification:", error);
            toast({
                variant: 'destructive',
                title: 'Error sending OTP',
                description: error.message || 'Could not send verification code. Please try again.',
            });
            // Reset reCAPTCHA
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
        const { name, phone, password } = form.getValues();
        const dummyEmail = `${phone}@${DUMMY_EMAIL_DOMAIN}`;

        try {
            const userCredential = await confirmationResult.confirm(otp);
            const user = userCredential.user;

            const emailCredential = EmailAuthProvider.credential(dummyEmail, password);
            await linkWithCredential(user, emailCredential);

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name,
                phone,
                role: 'consumer', // Default role for signup
                createdAt: new Date(),
            });

            toast({ title: "Signup Successful", description: "Your account has been created. Please log in." });
            router.push('/');

        } catch (error: any) {
            console.error("Error during OTP confirmation or account linking:", error);
            toast({
                variant: 'destructive',
                title: 'Signup Failed',
                description: error.message || "An unknown error occurred. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
            <div id="recaptcha-container"></div>
            <div className="w-full max-w-md">
                <Card className="shadow-2xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <UtensilsCrossed className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight text-primary">
                            Create an Account
                        </CardTitle>
                        <CardDescription>
                            {step === 'details' ? 'Enter your details to get started.' : 'Enter the OTP sent to your phone.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === 'details' ? (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onDetailsSubmit)} className="space-y-4">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="phone" render={({ field }) => (
                                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+19876543210" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="password" render={({ field }) => (
                                        <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField
                                        control={form.control}
                                        name="terms"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        Accept terms and conditions
                                                    </FormLabel>
                                                    <FormMessage />
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                                        {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
                                    </Button>
                                </form>
                            </Form>
                        ) : (
                            <div className="flex flex-col items-center gap-6">
                                <OtpInput length={6} onComplete={onOtpSubmit} disabled={isSubmitting} />
                                <Button onClick={() => onDetailsSubmit(form.getValues())} variant="link" size="sm" disabled={isSubmitting}>
                                    Resend OTP
                                </Button>
                            </div>
                        )}
                         <div className="mt-4 text-center text-sm">
                            Already have an account?{' '}
                            <Link href="/" className="underline text-primary">
                                Login
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
