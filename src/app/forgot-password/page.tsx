
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
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, updatePassword, signOut } from "firebase/auth";
import Link from 'next/link';
import { Loader2, UtensilsCrossed } from 'lucide-react';

const phoneSchema = z.object({
    phone: z.string().length(10, "Please enter a valid 10-digit phone number."),
});

const passwordSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});


type ConfirmationResult = any;

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState<'phone' | 'otp' | 'reset'>('phone');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const phoneForm = useForm<z.infer<typeof phoneSchema>>({
        resolver: zodResolver(phoneSchema),
        defaultValues: { phone: "" },
    });

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    const setupRecaptcha = () => {
        if (!auth) return;
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
            });
        }
    };

    async function onPhoneSubmit(values: z.infer<typeof phoneSchema>) {
        setIsSubmitting(true);
        setupRecaptcha();
        const appVerifier = window.recaptchaVerifier;
        const fullPhoneNumber = `+91${values.phone}`;

        try {
            const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
            setConfirmationResult(result);
            setStep('otp');
            toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
        } catch (error: any) {
            console.error("Error sending OTP for password reset:", error);
            toast({
                variant: 'destructive',
                title: 'Error sending OTP',
                description: error.message || 'Could not send verification code. Please check your phone number and try again.',
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

        try {
            await confirmationResult.confirm(otp);
            setStep('reset');
            toast({ title: "Phone Verified", description: "You can now reset your password." });
        } catch (error: any) {
            console.error("Error confirming OTP for password reset:", error);
            toast({ variant: 'destructive', title: 'Invalid OTP', description: 'The code you entered is incorrect. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
        setIsSubmitting(true);
        const user = auth.currentUser;
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'No authenticated user found. Please start over.' });
            setStep('phone');
            setIsSubmitting(false);
            return;
        }

        try {
            await updatePassword(user, values.password);
            await signOut(auth); // Sign out the temporary session
            toast({ title: "Password Reset Successful", description: "You can now log in with your new password." });
            router.push('/');
        } catch (error: any) {
            console.error("Error updating password:", error);
            toast({ variant: 'destructive', title: 'Password Reset Failed', description: error.message || "An unknown error occurred." });
            setIsSubmitting(false);
        }
    }

    const renderStep = () => {
        switch (step) {
            case 'phone':
                return (
                    <Form {...phoneForm}>
                        <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                            <FormField control={phoneForm.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center">
                                            <span className="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 border-input bg-background text-sm text-muted-foreground">
                                                +91
                                            </span>
                                            <Input type="tel" maxLength={10} className="rounded-l-none" placeholder="9876543210" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="animate-spin" />}
                                {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
                            </Button>
                        </form>
                    </Form>
                );
            case 'otp':
                return (
                    <div className="flex flex-col items-center gap-6">
                        <OtpInput length={6} onComplete={onOtpSubmit} disabled={isSubmitting} />
                        <Button onClick={() => onPhoneSubmit(phoneForm.getValues())} variant="link" size="sm" disabled={isSubmitting}>
                            Resend OTP
                        </Button>
                    </div>
                );
            case 'reset':
                return (
                     <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                            <FormField control={passwordForm.control} name="password" render={({ field }) => (
                                <FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                                <FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="animate-spin" />}
                                {isSubmitting ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </form>
                    </Form>
                );
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
                            Forgot Password
                        </CardTitle>
                        <CardDescription>
                           {step === 'phone' && 'Enter your phone number to receive a verification code.'}
                           {step === 'otp' && 'Enter the OTP sent to your phone.'}
                           {step === 'reset' && 'Enter your new password.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderStep()}
                        <div className="mt-4 text-center text-sm">
                            Remembered your password?{' '}
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

declare global {
    interface Window {
        recaptchaVerifier: any;
        confirmationResult: any;
    }
}
