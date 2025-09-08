'use server';
/**
 * @fileOverview An AI flow to suggest the number of waiters for an event.
 *
 * - suggestWaiters - A function that suggests waiter count based on attendees.
 * - SuggestWaitersInput - The input type for the suggestWaiters function.
 * - SuggestWaitersOutput - The return type for the suggestWaiters function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestWaitersInputSchema = z.object({
  attendees: z.number().describe('The number of people attending the event.'),
});
export type SuggestWaitersInput = z.infer<typeof SuggestWaitersInputSchema>;

const SuggestWaitersOutputSchema = z.object({
  waiterCount: z.number().describe('The suggested number of waiters.'),
  reasoning: z.string().describe('The reasoning behind the suggestion.'),
});
export type SuggestWaitersOutput = z.infer<typeof SuggestWaitersOutputSchema>;


export async function suggestWaiters(input: SuggestWaitersInput): Promise<SuggestWaitersOutput> {
  return suggestWaitersFlow(input);
}


const prompt = ai.definePrompt({
    name: 'suggestWaitersPrompt',
    input: {schema: SuggestWaitersInputSchema},
    output: {schema: SuggestWaitersOutputSchema},
    prompt: `You are an expert event staffing planner. Based on the number of attendees, suggest an appropriate number of waiters.
    
    A good rule of thumb is 1 waiter for every 25 guests for a standard buffet, and 1 for every 15 for a plated dinner. Assume a standard event unless details suggest otherwise. Provide a brief reasoning for your suggestion.
    
    Number of Attendees: {{{attendees}}}
    `,
});

const suggestWaitersFlow = ai.defineFlow(
    {
        name: 'suggestWaitersFlow',
        inputSchema: SuggestWaitersInputSchema,
        outputSchema: SuggestWaitersOutputSchema,
    },
    async (input) => {
        const {output} = await prompt(input);
        return output!;
    }
);
