"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Building2, Calculator, Clipboard, Shield, TrendingUp, User, UserCog } from 'lucide-react';
import { auth, DUMMY_EMAIL_DOMAIN } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';

const roles = [
  { value: 'consumer', label: 'Client / Consumer', icon: Building2 },
  { value: 'waiter', label: 'Waiter / Staff', icon: User },
  { value: 'supervisor', label: 'Supervisor', icon: UserCog },
  { value: 'sales', label: 'Sales', icon: TrendingUp },
  { value: 'hr', label: 'Human Resources', icon: Clipboard },
  { value: 'accountant', label: 'Accountant', icon: Calculator },
  { value: 'admin', label: 'Administrator', icon: Shield },
];

const formSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number."),
  password: z.string().min(1, { message: "Password is required." }),
  role: z.string({ required_error: "Please select a role." }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      password: "",
      role: "consumer",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const dummyEmail = `${values.phone}@${DUMMY_EMAIL_DOMAIN}`;
    try {
        await signInWithEmailAndPassword(auth, dummyEmail, values.password);
        toast({
            title: "Login Successful",
            description: `Welcome! Redirecting to the ${values.role} dashboard.`,
        });
        router.push(`/dashboard/${values.role}`);
    } catch (error: any) {
        console.error("Login failed:", error);
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: error.message || "An unknown error occurred.",
        });
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
                <Input placeholder="+19876543210" {...field} />
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
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role to login as" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        <role.icon className="h-4 w-4 text-muted-foreground" />
                        <span>{role.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </Form>
  );
}
