
'use server';
/**
 * @fileOverview A flow to generate a detailed invoice for a client event.
 *
 * - generateInvoice - A function that creates an invoice based on an order ID.
 * - GenerateInvoiceInput - The input type for the generateInvoice function.
 * - GenerateInvoiceOutput - The return type for the generateInvoice function.
 */

import { z } from 'zod';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
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


// Exported function that performs the invoice generation directly
export async function generateInvoice({ orderId }: GenerateInvoiceInput): Promise<GenerateInvoiceOutput> {
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

    // If order has been "Reviewed", use the payout data as the source of truth
    const payoutsRef = collection(db, 'orders', orderId, 'payouts');
    const payoutsSnap = await getDocs(payoutsRef);

    let staffDocs: any[] = [];
    let payoutDataList: any[] = [];

    if (!payoutsSnap.empty) {
        // Payouts exist, use them
        const staffRolePromises = payoutsSnap.docs.map(payoutDoc => 
            getDoc(doc(db, 'staff', payoutDoc.data().staffId))
        );
        staffDocs = await Promise.all(staffRolePromises);
        payoutDataList = payoutsSnap.docs.map(p => p.data());
    } else if (orderData.assignedStaff && orderData.assignedStaff.length > 0) {
        // No payouts, use assignedStaff from the order (for 'Completed' status)
        const staffRolePromises = orderData.assignedStaff.map((staffId: string) => 
            getDoc(doc(db, 'staff', staffId))
        );
        staffDocs = await Promise.all(staffRolePromises);
        // Create a synthetic payout list from staff profiles
        payoutDataList = staffDocs.map(staffDoc => {
             if (staffDoc.exists()) {
                 const staffData = staffDoc.data();
                 return {
                     staffId: staffDoc.id,
                     // Use perEventCharge as the billable amount in this case
                     amount: staffData.perEventCharge || 0 
                 }
             }
             return null;
        }).filter(p => p !== null);
    } else {
        // This is the case we want to prevent. No staff info to bill.
        throw new Error(`No staff or payout information found for order ${orderId}. Cannot generate invoice.`);
    }
    
    // 2. Perform all calculations and formatting in code
    const roleRates: Record<string, { count: number, rate: number | null }> = {};
    
    payoutDataList.forEach((payoutData, index) => {
        const staffDoc = staffDocs[index];
        if (staffDoc.exists()) {
            const staffData = staffDoc.data();
            const role = staffData.role || 'unknown';
            if (!roleRates[role]) {
                roleRates[role] = { count: 0, rate: null };
            }
            if (roleRates[role].rate === null && payoutData.amount > 0) {
                 roleRates[role].rate = payoutData.amount;
            }
            roleRates[role].count += 1;
        }
    });

    const lineItems: z.infer<typeof LineItemSchema>[] = Object.entries(roleRates).map(([role, data]) => {
        const roleName = capitalize(role.replace('-', ' '));
        const rate = data.rate ?? 0;
        return {
            description: `${roleName}s`,
            quantity: data.count,
            rate: rate,
            amount: data.count * rate,
        };
    });

    const subtotal = lineItems.reduce((acc, item) => acc + item.amount, 0);
    const gstRate = 18; // Fixed 18%
    const gstAmount = subtotal * (gstRate / 100);
    const totalAmount = subtotal + gstAmount;
    const today = new Date();

    const invoiceOutput: GenerateInvoiceOutput = {
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

    // 3. Return the fully-formed invoice object
    return invoiceOutput;
}
