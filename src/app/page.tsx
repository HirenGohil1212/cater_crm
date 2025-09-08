
import { LoginForm } from '@/components/login-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
               <UtensilsCrossed className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-primary">
              Event Staffing Pro
            </CardTitle>
            <CardDescription>Please sign in to access your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <div className="mt-4 text-center text-sm">
                Don&apos;t have a client account?{' '}
                <Link href="/signup" className="underline text-primary">
                    Sign up
                </Link>
            </div>
             <div className="mt-2 text-center text-sm">
                Staff member?{' '}
                <Link href="/signup_staff" className="underline text-primary">
                    Register here
                </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
