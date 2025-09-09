
"use client";
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar as CalendarIcon, CheckSquare, FileText, Upload, UserCheck, CalendarCheck, FileClock, MapPin, Camera, Video, VideoOff } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, DocumentData } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AvailabilityTab } from '@/components/availability-tab';
import { format } from 'date-fns';


type AssignedEvent = {
    id: string;
    date: string;
    venue: string;
    clientName: string;
    status: string;
}

function GroomingCheckTab() {
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [photoData, setPhotoData] = useState<string | null>(null);

    useEffect(() => {
        const getCameraPermission = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({video: true});
            setHasCameraPermission(true);
    
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings to use this feature.',
            });
          }
        };
    
        getCameraPermission();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        }

      }, [toast]);

      const takePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
    
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
    
        if (context) {
          // Set canvas dimensions to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
    
          // Draw video frame to canvas
          context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    
          // Get data URL
          const dataUrl = canvas.toDataURL('image/jpeg');
          setPhotoData(dataUrl);

          // Stop the video stream
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const retakePhoto = () => {
        setPhotoData(null);
        // Restart camera
        const getCameraPermission = async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({video: true});
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
              }
            } catch (error) {
              console.error('Error accessing camera:', error);
            }
          };
        getCameraPermission();
    }

    const handleSubmit = () => {
        toast({
            title: "Confirmation Submitted",
            description: "Your grooming confirmation photo has been sent for approval."
        });
        // Here you would typically upload photoData to storage
        // and update a Firestore document.
    }

    const groomingItems = ["Clean Uniform", "Proper Hairstyle", "Clean Shave/Trimmed Beard", "Polished Shoes", "No Visible Tattoos", "Minimal Jewelry"];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Grooming & Confirmation</CardTitle>
                <CardDescription>Follow the checklist, then upload a photo for confirmation before your shift.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Grooming Checklist</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {groomingItems.map(item => (
                                <li key={item} className="flex items-center">
                                    <CheckSquare className="h-4 w-4 mr-2 text-primary" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                         <Separator />
                         <div className="text-sm p-4 bg-muted/50 rounded-md border">
                            <h4 className="font-semibold mb-2">Instructions</h4>
                            <p className="text-muted-foreground">Ensure you are in a well-lit area, wearing your full, clean uniform. Capture a clear, full-body photo for approval.</p>
                         </div>
                    </div>
                    <div className="space-y-4">
                         {hasCameraPermission === false && (
                            <Alert variant="destructive">
                                <VideoOff className="h-4 w-4" />
                                <AlertTitle>Camera Access Required</AlertTitle>
                                <AlertDescription>
                                    Please allow camera access in your browser settings to use this feature. Refresh the page after granting permission.
                                </AlertDescription>
                            </Alert>
                         )}

                        <div className="relative aspect-video bg-muted rounded-md border overflow-hidden flex items-center justify-center">
                           {photoData ? (
                                <img src={photoData} alt="Grooming confirmation" className='h-full w-full object-contain' />
                           ) : (
                                <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
                           )}
                           {hasCameraPermission === null && (
                            <div className="absolute flex flex-col items-center text-muted-foreground">
                                <Camera className="h-10 w-10" />
                                <p>Starting camera...</p>
                            </div>
                           )}
                        </div>

                         <div className="flex justify-center gap-4">
                           {photoData ? (
                            <>
                                <Button variant="outline" onClick={retakePhoto}>Retake Photo</Button>
                                <Button onClick={handleSubmit} className="bg-accent text-accent-foreground hover:bg-accent/90">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Submit Confirmation
                                </Button>
                            </>
                           ) : (
                            <Button onClick={takePhoto} disabled={!hasCameraPermission}>
                                <Camera className="mr-2 h-4 w-4" />
                                Take Photo
                            </Button>
                           )}
                        </div>
                    </div>
                </div>
                 <canvas ref={canvasRef} className="hidden"></canvas>
            </CardContent>
        </Card>
    )
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
                <GroomingCheckTab />
            </TabsContent>
        </Tabs>
    );
}

