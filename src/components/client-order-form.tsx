
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Utensils, Check, ChevronsUpDown } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";

const orderFormSchema = z.object({
  clientId: z.string({ required_error: "Please select a client." }),
  date: z.date({
    required_error: "An event date is required.",
  }),
  time: z.string().min(1, { message: "Time is required" }),
  attendees: z.coerce.number().min(1, "At least one person must attend."),
  menuType: z.enum(["veg", "non-veg"], {
    required_error: "You need to select a menu type.",
  }),
});

type Client = {
  id: string;
  companyName: string;
  name: string;
};

export function ClientOrderForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "consumer"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const clientList = querySnapshot.docs.map(doc => ({ 
            id: doc.id,
            companyName: doc.data().companyName,
            name: doc.data().name
        }));
        setClients(clientList as Client[]);
    });
    return () => unsubscribe();
  }, []);

  const form = useForm<z.infer<typeof orderFormSchema>>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      time: "19:00",
      attendees: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof orderFormSchema>) {
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, "orders"), {
            ...values,
            date: values.date.toISOString().split('T')[0],
            userId: values.clientId,
            status: "Pending",
            createdAt: serverTimestamp(),
        });

        toast({
            title: "Order Submitted!",
            description: "The order has been placed for the selected client.",
        });
        form.reset({ attendees: 0, time: '19:00', clientId: undefined, date: undefined, menuType: undefined });
    } catch (error) {
        console.error("Error placing order:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "There was a problem placing the order. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Client</FormLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? clients.find((client) => client.id === field.value)?.companyName
                        : "Select client..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search client..." />
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                        <CommandList>
                            {clients.map((client) => (
                                <CommandItem
                                key={client.id}
                                value={client.companyName}
                                onSelect={() => {
                                    form.setValue("clientId", client.id);
                                    setOpen(false);
                                }}
                                >
                                <Check
                                    className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === client.id ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {client.companyName} ({client.name})
                                </CommandItem>
                            ))}
                        </CommandList>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Event Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date(new Date().setDate(new Date().getDate() - 1))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Time</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="attendees"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Attendees</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g., 50"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="menuType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Menu Specification</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="veg" />
                    </FormControl>
                    <FormLabel className="font-normal">Vegetarian</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="non-veg" />
                    </FormControl>
                    <FormLabel className="font-normal">Non-Vegetarian</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>
            <Utensils className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Placing Order...' : 'Place Order'}
        </Button>
      </form>
    </Form>
  );
}
