
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format, startOfDay } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

type AvailabilityStatus = "available" | "unavailable";

export function AvailabilityTab() {
    const [dates, setDates] = useState<DateRange | undefined>();
    const [status, setStatus] = useState<AvailabilityStatus>("available");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [userAvailability, setUserAvailability] = useState<Record<string, AvailabilityStatus>>({});
    const { toast } = useToast();
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;

        const fetchAvailability = async () => {
            setLoading(true);
            const availabilityRef = doc(db, 'availability', user.uid);
            const docSnap = await getDoc(availabilityRef);
            if (docSnap.exists()) {
                setUserAvailability(docSnap.data().dates || {});
            }
            setLoading(false);
        };
        fetchAvailability();
    }, [user]);

    const handleSaveAvailability = async () => {
        if (!user || !dates || !dates.from) {
            toast({
                variant: 'destructive',
                title: 'Selection required',
                description: 'Please select a date or a range of dates.',
            });
            return;
        }

        setSaving(true);
        const availabilityRef = doc(db, 'availability', user.uid);

        try {
            const newAvailability = { ...userAvailability };
            let currentDate = startOfDay(dates.from);
            const endDate = startOfDay(dates.to || dates.from);
            
            while (currentDate <= endDate) {
                const dateString = format(currentDate, 'yyyy-MM-dd');
                newAvailability[dateString] = status;
                currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
            }
            
            await setDoc(availabilityRef, { userId: user.uid, dates: newAvailability }, { merge: true });

            setUserAvailability(newAvailability);
            
            toast({
                title: 'Availability Updated',
                description: `Your status has been saved successfully.`,
            });
            setDates(undefined);
        } catch (error) {
             console.error("Error saving availability:", error);
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: 'Could not save your availability. Please try again.',
            });
        } finally {
            setSaving(false);
        }
    };
    
    const availabilityModifiers = {
        unavailable: (date: Date) => {
            const dateString = format(date, 'yyyy-MM-dd');
            return userAvailability[dateString] === 'unavailable';
        },
        available: (date: Date) => {
            const dateString = format(date, 'yyyy-MM-dd');
            return userAvailability[dateString] === 'available';
        }
    }
    
    const availabilityStyles = {
        unavailable: {
            backgroundColor: 'hsl(var(--destructive))',
            color: 'hsl(var(--destructive-foreground))',
            opacity: 0.8,
        },
        available: {
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            opacity: 0.8,
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manage Your Availability</CardTitle>
                <CardDescription>Select dates on the calendar and set your availability status. This prevents you from being scheduled on your off-days.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
                 {loading ? <Skeleton className="w-full h-80" /> : (
                    <div className="flex justify-center">
                        <Calendar
                            mode="range"
                            selected={dates}
                            onSelect={setDates}
                            className="rounded-md border"
                            disabled={(date) => date < startOfDay(new Date())}
                            modifiers={availabilityModifiers}
                            modifiersStyles={availabilityStyles}
                        />
                    </div>
                 )}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium">Set Status for Selected Dates</h3>
                        <p className="text-sm text-muted-foreground">
                            {dates?.from ? `For: ${format(dates.from, "LLL dd, y")}${dates.to ? ` - ${format(dates.to, "LLL dd, y")}`: ''}` : 'Select dates to set your status.'}
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 rounded-lg border p-4">
                        <Switch id="availability-switch" checked={status === 'available'} onCheckedChange={(checked) => setStatus(checked ? 'available' : 'unavailable')} disabled={!dates?.from} />
                        <Label htmlFor="availability-switch" className="flex flex-col">
                            <span className="font-medium">{status === 'available' ? 'Available' : 'Unavailable'}</span>
                            <span className="text-xs text-muted-foreground">{status === 'available' ? 'You can be assigned to events.' : 'You will not be scheduled.'}</span>
                        </Label>
                    </div>
                </div>
            </CardContent>
            <CardFooter className='border-t pt-6'>
                <Button onClick={handleSaveAvailability} disabled={!dates?.from || saving} className="ml-auto bg-accent text-accent-foreground hover:bg-accent/90">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Availability
                </Button>
            </CardFooter>
        </Card>
    );
}

