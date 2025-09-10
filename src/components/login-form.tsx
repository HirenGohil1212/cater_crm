
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { auth, db, DUMMY_EMAIL_DOMAIN } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  phone: z.string().length(10, "Please enter a valid 10-digit phone number."),
  password: z.string().min(1, { message: "Password is required." }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const fullPhoneNumber = `+91${values.phone}`;
    const dummyEmail = `${fullPhoneNumber}@${DUMMY_EMAIL_DOMAIN}`;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, dummyEmail, values.password);
        const user = userCredential.user;

        // Fetch user role from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let role = 'consumer'; // Default role
        if (userDocSnap.exists()) {
            role = userDocSnap.data().role || 'consumer';
        }
        
        toast({
            title: "Login Successful",
            description: `Welcome! Redirecting to your dashboard.`,
        });
        
        // Special handling for waiter roles that share a dashboard
        const waiterRoles = ['waiter', 'waiter-steward', 'pro', 'senior-pro'];
        if(waiterRoles.includes(role)){
            router.push(`/dashboard/waiter`);
        } else {
            router.push(`/dashboard/${role}`);
        }
        

    } catch (error: any) {
        console.error("Login failed:", error);
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Invalid phone number or password. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <div id="recaptcha-container"></div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
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
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
                <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link href="/forgot-password" passHref>
                        <span className="text-sm text-primary hover:underline cursor-pointer">
                            Forgot password?
                        </span>
                    </Link>
                </div>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSubmitting ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </Form>
  );
}
