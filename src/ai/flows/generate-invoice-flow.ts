
'use server';
/**
 * @fileOverview An AI flow to generate a detailed invoice for a client event.
 *
 * - generateInvoice - A function that creates an invoice based on an order ID.
 * - GenerateInvoiceInput - The input type for the generateInvoice function.
 * - GenerateInvoiceOutput - The return type for the generateInvoice function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

// Define Zod Schemas for input and output
const GenerateInvoiceInputSchema = z.object({
  orderId: z.string().describe('The ID of the order to generate an invoice for.'),
});
export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceInputSchema>;

const LineItemSchema = z.object({
    description: z.string(),
    amount: z.number(),
});

const ClientInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    gstin: z.string().optional(),
});

const GenerateInvoiceOutputSchema = z.object({
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  eventDate: z.string(),
  client: ClientInfoSchema,
  lineItems: z.array(LineItemSchema),
  subtotal: z.number(),
  gstRate: z.number(),
  gstAmount: z.number(),
  totalAmount: z.number(),
});
export type GenerateInvoiceOutput = z.infer<typeof GenerateInvoiceOutputSchema>;


/**
 * Fetches order and user details to provide context for the AI prompt.
 * This function is not a flow, but a helper to assemble data.
 */
async function getInvoiceContext(orderId: string) {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
        throw new Error(`Order with ID ${orderId} not found.`);
    }
    const orderData = orderSnap.data();

    const userRef = doc(db, 'users', orderData.userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        throw new Error(`User with ID ${orderData.userId} not found.`);
    }
    const userData = userSnap.data();

    return {
        userId: orderData.userId,
        eventDate: orderData.date,
        attendees: orderData.attendees,
        menuType: orderData.menuType,
        clientName: userData.name,
        companyName: userData.companyName || 'N/A',
        clientAddress: userData.address || 'N/A', // Assuming address is stored on user
        clientGstin: userData.gstNumber || 'N/A',
    };
}


// Exported function that wraps the Genkit flow
export async function generateInvoice(input: GenerateInvoiceInput): Promise<GenerateInvoiceOutput> {
  return generateInvoiceFlow(input);
}


const prompt = ai.definePrompt({
    name: 'generateInvoicePrompt',
    input: { schema: z.any() }, // Input is the rich context object
    output: { schema: GenerateInvoiceOutputSchema },
    prompt: `
      You are an expert accounting assistant for an event staffing company.
      Your task is to generate a formal invoice based on the event details provided.

      **INSTRUCTIONS:**
      1.  Create a unique invoice number. A combination of the current date and a short random string is fine (e.g., INV-YYYYMMDD-XXXX).
      2.  The invoice date should be today's date, formatted as YYYY-MM-DD.
      3.  Calculate the cost of services. Use the following rates:
          - Base catering cost per attendee: ₹1200 for 'veg', ₹1500 for 'non-veg'.
          - Service charge: 10% of the total catering cost.
      4.  Create line items for 'Catering Services' and 'Service Charge'.
      5.  Calculate the subtotal (sum of all line items).
      6.  Calculate GST at a fixed rate of 18% on the subtotal.
      7.  Calculate the final total amount (subtotal + GST).
      8.  Fill in all client details as provided.
      9.  Crucially, ensure the client's 'id' field is set to the provided 'userId'.

      **EVENT & CLIENT DATA:**
      - Client User ID: {{{userId}}}
      - Event Date: {{{eventDate}}}
      - Number of Attendees: {{{attendees}}}
      - Menu Type: {{{menuType}}}
      - Client Name: {{{clientName}}}
      - Client Company: {{{companyName}}}
      - Client Address: {{{clientAddress}}}
      - Client GSTIN: {{{clientGstin}}}
    `,
});

const generateInvoiceFlow = ai.defineFlow(
  {
    name: 'generateInvoiceFlow',
    inputSchema: GenerateInvoiceInputSchema,
    outputSchema: GenerateInvoiceOutputSchema,
  },
  async ({ orderId }) => {
    // 1. Fetch the rich context for the prompt
    const context = await getInvoiceContext(orderId);

    // 2. Generate the invoice using the AI prompt
    const { output } = await prompt(context);

    // 3. Return the structured output
    // The prompt now returns the fully-structured object, so we just return it.
    // The '!' non-null assertion is safe because the prompt is configured to always return this structure.
    return output!;
  }
);
