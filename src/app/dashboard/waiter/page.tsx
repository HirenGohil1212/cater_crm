"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar as CalendarIcon, CheckSquare, FileText, Upload, UserCheck, CalendarCheck, FileClock, MapPin } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, DocumentData } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type AssignedEvent = {
    id: string;
    date: string;
    venue: string;
    clientName: string;
    status: string;
}

function AvailabilityTab() {
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
        <Card>
            <CardHeader>
                <CardTitle>Manage Your Availability</CardTitle>
                <CardDescription>Select dates on the calendar and set your availability status. This prevents you from being scheduled on your off-days.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
                <div className="flex justify-center">
                    <Calendar
                        mode="range"
                        selected={dates}
                        onSelect={setDates}
                        className="rounded-md border"
                        disabled={(date) =>
                            date < new Date(new Date().setDate(new Date().getDate() - 1))
                          }
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
    );
}

function UpcomingEventsTab() {
    const [events, setEvents] = useState<AssignedEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // This is a placeholder for fetching assigned events.
        // In a real app, you would have a collection like 'eventAssignments'
        // that links users (staff) to orders (events).
        // For now, we will simulate this with placeholder data.
        const mockEvents: AssignedEvent[] = [
            { id: '1', date: '2024-08-15', venue: 'Grand Hyatt Ballroom', clientName: 'Alice Johnson', status: 'Confirmed' },
            { id: '2', date: '2024-08-22', venue: 'Marriott Convention Center', clientName: 'Bob Williams', status: 'Confirmed' }
        ];
        setEvents(mockEvents);
        setLoading(false);

    }, [user]);

    if (loading) {
        return (
            <Card>
                 <CardHeader>
                    <CardTitle>Upcoming Events</CardTitle>
                    <CardDescription>Here are your assignments for upcoming events.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </CardContent>
            </Card>
        )
    }

    if (events.length === 0) {
        return (
            <Card>
                 <CardHeader>
                    <CardTitle>Upcoming Events</CardTitle>
                    <CardDescription>Here are your assignments for upcoming events.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg bg-muted/30">
                        <FileClock className="h-16 w-16 mb-4" />
                        <h3 className="text-xl font-semibold">No Upcoming Events</h3>
                        <p>You have not been assigned to any events yet.</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Here are your assignments for upcoming events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {events.map(event => (
                    <Card key={event.id} className="grid grid-cols-1 md:grid-cols-4 items-center p-4 gap-4">
                        <div className="col-span-1 md:col-span-3">
                            <h4 className="font-semibold">{format(new Date(event.date), 'PPP')} - {event.clientName}</h4>
                            <p className="text-sm text-muted-foreground">{event.venue}</p>
                        </div>
                        <div className="col-span-1 md:col-span-1 flex justify-end">
                            <Link href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline">
                                    <MapPin className="mr-2 h-4 w-4" />
                                    View Map
                                </Button>
                            </Link>
                        </div>
                    </Card>
                ))}
            </CardContent>
        </Card>
    );
}


function PlaceholderTab({ title, icon: Icon }: { title: string, icon: React.ElementType }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg bg-muted/30">
                    <Icon className="h-16 w-16 mb-4" />
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <p>Feature coming soon.</p>
                </div>
            </CardContent>
        </Card>
    )
}

export default function WaiterDashboardPage() {
    return (
        <Tabs defaultValue="availability" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="availability"><CalendarCheck className="mr-2 h-4 w-4" />Availability</TabsTrigger>
                <TabsTrigger value="events"><FileClock className="mr-2 h-4 w-4" />Upcoming Events</TabsTrigger>
                <TabsTrigger value="ledger"><FileText className="mr-2 h-4 w-4" />Ledger & Penalties</TabsTrigger>
                <TabsTrigger value="grooming"><UserCheck className="mr-2 h-4 w-4" />Grooming Check</TabsTrigger>
            </TabsList>
            <TabsContent value="availability" className="mt-4">
                <AvailabilityTab />
            </TabsContent>
            <TabsContent value="events" className="mt-4">
                <UpcomingEventsTab />
            </TabsContent>
            <TabsContent value="ledger" className="mt-4">
                <PlaceholderTab title="Ledger & Penalties" icon={FileText} />
            </TabsContent>
            <TabsContent value="grooming" className="mt-4">
                <PlaceholderTab title="Grooming & Confirmation" icon={UserCheck} />
            </TabsContent>
        </Tabs>
    );
}
