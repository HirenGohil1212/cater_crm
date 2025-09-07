"use client";
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function WaiterDashboardPage() {
    const [dates, setDates] = useState<DateRange | undefined>();
    const [isAvailable, setIsAvailable] = useState(true);
    const { toast } = useToast();

    const handleSaveAvailability = () => {
        if (!dates || !dates.from) {
            toast({
                variant: 'destructive',
                title: 'No dates selected',
                description: 'Please select a date or a range of dates.',
            });
            return;
        }

        toast({
            title: 'Availability Updated',
            description: `You are now set as ${isAvailable ? 'Available' : 'Unavailable'} from ${format(dates.from, 'PPP')}${dates.to ? ` to ${format(dates.to, 'PPP')}` : ''}.`,
        });
    }

    return (
        <div className="grid gap-4 md:gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Your Availability</CardTitle>
                    <CardDescription>Select dates on the calendar and set your availability status. This will prevent you from being scheduled on your off-days.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                    <div className="flex justify-center">
                        <Calendar
                            mode="range"
                            selected={dates}
                            onSelect={setDates}
                            className="rounded-md border"
                        />
                    </div>
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium">Set Status for Selected Dates</h3>
                            <p className="text-sm text-muted-foreground">
                                {dates?.from ? `For: ${format(dates.from, "LLL dd, y")}${dates.to ? ` - ${format(dates.to, "LLL dd, y")}`: ''}` : 'Select dates to set your status.'}
                            </p>
                        </div>
                        <div className="flex items-center space-x-4 rounded-lg border p-4">
                            <Switch id="availability-switch" checked={isAvailable} onCheckedChange={setIsAvailable} disabled={!dates?.from} />
                            <Label htmlFor="availability-switch" className="flex flex-col">
                                <span className="font-medium">{isAvailable ? 'Available' : 'Unavailable'}</span>
                                <span className="text-xs text-muted-foreground">{isAvailable ? 'You can be assigned to events.' : 'You will not be scheduled.'}</span>
                            </Label>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className='border-t pt-6'>
                    <Button onClick={handleSaveAvailability} disabled={!dates?.from} className="ml-auto bg-accent text-accent-foreground hover:bg-accent/90">Save Availability</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
