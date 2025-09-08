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
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Utensils, Lightbulb } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";
import { suggestWaiters } from "@/ai/flows/suggest-waiters-flow";
import debounce from 'lodash.debounce';

const orderFormSchema = z.object({
  date: z.date({
    required_error: "An event date is required.",
  }),
  time: z.string().min(1, { message: "Time is required" }),
  attendees: z.coerce.number().min(1, "At least one person must attend."),
  menuType: z.enum(["veg", "non-veg"], {
    required_error: "You need to select a menu type.",
  }),
});

export function OrderForm() {
  const { toast } = useToast();
  const [waiterSuggestion, setWaiterSuggestion] = useState<{ count: number, reasoning: string } | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const form = useForm<z.infer<typeof orderFormSchema>>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      time: "19:00",
      attendees: 0,
    },
  });

  const debouncedSuggestWaiters = useCallback(
    debounce(async (attendees: number) => {
      if (attendees > 0) {
        setIsSuggesting(true);
        try {
          const suggestion = await suggestWaiters({ attendees });
          setWaiterSuggestion({
            count: suggestion.waiterCount,
            reasoning: suggestion.reasoning
          });
        } catch (error) {
          console.error("Error fetching waiter suggestion:", error);
          setWaiterSuggestion(null);
        } finally {
          setIsSuggesting(false);
        }
      } else {
        setWaiterSuggestion(null);
      }
    }, 500),
    []
  );

  function onSubmit(values: z.infer<typeof orderFormSchema>) {
    console.log(values);
    toast({
      title: "Order Submitted!",
      description: "Your order has been placed. We will be in touch shortly.",
    });
    form.reset();
    setWaiterSuggestion(null);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                  onChange={(e) => {
                    field.onChange(e);
                    const numAttendees = parseInt(e.target.value, 10);
                    if (!isNaN(numAttendees)) {
                        debouncedSuggestWaiters(numAttendees);
                    } else {
                        setWaiterSuggestion(null);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
               {isSuggesting && (
                  <FormDescription className="flex items-center gap-2 pt-2">
                    <Lightbulb className="h-4 w-4 animate-pulse" />
                    <span>Getting staffing suggestions...</span>
                  </FormDescription>
              )}
              {waiterSuggestion && !isSuggesting && (
                  <FormDescription className="flex items-center gap-2 pt-2 text-accent-foreground/80 bg-accent/10 p-2 rounded-md border border-accent/20">
                    <Lightbulb className="h-4 w-4" />
                    <span>
                        For {form.getValues("attendees")} guests, we suggest ~<b>{waiterSuggestion.count} waiters</b>. {waiterSuggestion.reasoning}
                    </span>
                  </FormDescription>
              )}
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
        <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Utensils className="mr-2 h-4 w-4" />
            Place Order
        </Button>
      </form>
    </Form>
  );
}
