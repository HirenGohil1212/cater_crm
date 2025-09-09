'use server';
/**
 * @fileOverview An AI flow to generate a formal employment agreement for a staff member.
 *
 * - generateAgreement - A function that creates an agreement based on staff details.
 * - GenerateAgreementInput - The input type for the generateAgreement function.
 * - GenerateAgreementOutput - The return type for the generateAgreement function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define Zod Schemas for input and output
const GenerateAgreementInputSchema = z.object({
  staffName: z.string().describe('The full name of the staff member.'),
  staffAddress: z.string().describe('The address of the staff member.'),
  staffRole: z.string().describe('The job title or role of the staff member.'),
  staffType: z.string().describe('The type of employment (e.g., salaried, per-event).'),
  idNumber: z.string().describe('The Aadhar or PAN number of the staff member.'),
  bankAccountNumber: z.string().optional().describe('The bank account number.'),
  bankIfscCode: z.string().optional().describe('The bank IFSC code.'),
  compensationAmount: z.number().optional().describe('The compensation amount (salary or per-event charge).'),
  compensationType: z.enum(['monthly salary', 'per event charge']).describe('The type of compensation.'),
});
export type GenerateAgreementInput = z.infer<typeof GenerateAgreementInputSchema>;

const GenerateAgreementOutputSchema = z.object({
  agreementText: z.string().describe('The full, legally-formatted text of the employment agreement.'),
});
export type GenerateAgreementOutput = z.infer<typeof GenerateAgreementOutputSchema>;

// Exported function that wraps the Genkit flow
export async function generateAgreement(input: GenerateAgreementInput): Promise<GenerateAgreementOutput> {
  return generateAgreementFlow(input);
}


const prompt = ai.definePrompt({
    name: 'generateAgreementPrompt',
    input: { schema: GenerateAgreementInputSchema },
    output: { schema: GenerateAgreementOutputSchema },
    prompt: `
      You are an expert legal assistant specializing in drafting employment contracts for an event staffing company called "Event Staffing Pro".
      Your task is to generate a comprehensive and formal employment agreement based on the staff member's details provided.

      **INSTRUCTIONS:**
      1.  The agreement should be dated today, {{currentDate}}.
      2.  The parties are "Event Staffing Pro" (the Company) and the staff member.
      3.  Include all the provided personal and banking details of the staff member in a clear, itemized section.
      4.  Clearly state the staff member's position/role.
      5.  Detail the compensation based on the provided amount and type (monthly salary or per event charge).
      6.  Add standard clauses for:
          - Duties and Responsibilities (general description based on role)
          - Term of Employment (e.g., at-will)
          - Confidentiality
          - Termination
          - Governing Law (India)
      7.  The final output should be only the full text of the agreement, formatted professionally. Start with a clear title like "Employment Agreement".
      8.  Do not include any introductory text like "Here is the agreement text". The output must strictly be the agreement itself.

      **STAFF MEMBER DATA:**
      - Name: {{{staffName}}}
      - Address: {{{staffAddress}}}
      - Role: {{{staffRole}}}
      - Staff Type: {{{staffType}}}
      - ID Number: {{{idNumber}}}
      - Bank Account: {{{bankAccountNumber}}}
      - IFSC Code: {{{bankIfscCode}}}
      - Compensation: ₹{{{compensationAmount}}} ({{{compensationType}}})
    `,
});

const generateAgreementFlow = ai.defineFlow(
  {
    name: 'generateAgreementFlow',
    inputSchema: GenerateAgreementInputSchema,
    outputSchema: GenerateAgreementOutputSchema,
  },
  async (input) => {
    
    const context = {
        ...input,
        currentDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
    };

    const { output } = await prompt(context);
    return output!;
  }
);
