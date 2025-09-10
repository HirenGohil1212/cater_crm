
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
import { doc, getDoc, collection, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { capitalize } from '@/lib/utils';

// Define Zod Schemas for input and output
const GenerateInvoiceInputSchema = z.object({
  orderId: z.string().describe('The ID of the order to generate an invoice for.'),
});
export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceInputSchema>;

const LineItemSchema = z.object({
    description: z.string(),
    quantity: z.number(),
    rate: z.number(),
    amount: z.number(),
});

const ClientInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    companyName: z.string(),
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
 * A simple context object passed to the prompt.
 * The AI's job is just to format this, not calculate it.
 */
const PromptContextSchema = GenerateInvoiceOutputSchema;


// Exported function that wraps the Genkit flow
export async function generateInvoice(input: GenerateInvoiceInput): Promise<GenerateInvoiceOutput> {
  return generateInvoiceFlow(input);
}


const prompt = ai.definePrompt({
    name: 'generateInvoicePrompt',
    input: { schema: PromptContextSchema }, 
    output: { schema: GenerateInvoiceOutputSchema },
    prompt: `
      You are an expert accounting assistant for an event staffing company.
      Your task is to take the provided, fully calculated invoice data and ensure it is formatted correctly into the specified JSON output structure.

      **DO NOT CHANGE ANY VALUES. Use the exact data provided.**

      **INVOICE DATA:**
      - Invoice Number: {{{invoiceNumber}}}
      - Invoice Date: {{{invoiceDate}}}
      - Event Date: {{{eventDate}}}
      - Client Info: {{{json client}}}
      - Line Items: {{{json lineItems}}}
      - Subtotal: {{{subtotal}}}
      - GST Rate: {{{gstRate}}}
      - GST Amount: {{{gstAmount}}}
      - Total Amount: {{{totalAmount}}}
    `,
});

const generateInvoiceFlow = ai.defineFlow(
  {
    name: 'generateInvoiceFlow',
    inputSchema: GenerateInvoiceInputSchema,
    outputSchema: GenerateInvoiceOutputSchema,
  },
  async ({ orderId }) => {
    // 1. Fetch all necessary data from Firestore
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

    // Fetch the payouts which contain the billing rates for each staff member
    const payoutsRef = collection(db, 'orders', orderId, 'payouts');
    const payoutsSnap = await getDocs(payoutsRef);

    if (payoutsSnap.empty) {
        throw new Error(`No payout information found for order ${orderId}. Cannot generate invoice.`);
    }

    const staffRolePromises = payoutsSnap.docs.map(payoutDoc => 
        getDoc(doc(db, 'staff', payoutDoc.data().staffId))
    );
    const staffDocs = await Promise.all(staffRolePromises);
    
    // 2. Perform all calculations and formatting in code
    const roleRates: Record<string, { count: number, rate: number }> = {};
    
    payoutsSnap.docs.forEach((payoutDoc, index) => {
        const payoutData = payoutDoc.data();
        const staffDoc = staffDocs[index];
        if (staffDoc.exists()) {
            const staffData = staffDoc.data();
            const role = staffData.role || 'unknown';
            if (!roleRates[role]) {
                roleRates[role] = { count: 0, rate: payoutData.amount };
            }
            roleRates[role].count += 1;
        }
    });

    const lineItems: z.infer<typeof LineItemSchema>[] = Object.entries(roleRates).map(([role, data]) => {
        const roleName = capitalize(role.replace('-', ' '));
        return {
            description: `${roleName}s`,
            quantity: data.count,
            rate: data.rate,
            amount: data.count * data.rate,
        };
    });

    const subtotal = lineItems.reduce((acc, item) => acc + item.amount, 0);
    const gstRate = 18; // Fixed 18%
    const gstAmount = subtotal * (gstRate / 100);
    const totalAmount = subtotal + gstAmount;
    const today = new Date();

    const context: z.infer<typeof PromptContextSchema> = {
        invoiceNumber: `INV-${format(today, 'yyyyMMdd')}-${orderId.slice(-4).toUpperCase()}`,
        invoiceDate: format(today, 'yyyy-MM-dd'),
        eventDate: orderData.date,
        client: {
            id: orderData.userId,
            name: userData.name || 'N/A',
            companyName: userData.companyName || 'N/A',
            address: userData.address || 'Address not provided',
            gstin: userData.gstNumber || 'N/A',
        },
        lineItems,
        subtotal,
        gstRate,
        gstAmount,
        totalAmount,
    };

    // 3. Pass the fully-formed context to the AI for formatting
    const { output } = await prompt(context);

    // 4. Return the structured output from the AI
    return output!;
  }
);
