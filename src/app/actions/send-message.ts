
'use server';

import { z } from 'zod';
import { twilio } from 'twilio';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const sendMessageSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required.'),
  message: z.string().min(1, 'Message is required.'),
});

type SendMessageInput = z.infer<typeof sendMessageSchema>;

export async function sendMessage(input: SendMessageInput) {
  const validation = sendMessageSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.flatten().fieldErrors };
  }

  const { orderId, message } = validation.data;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhone) {
    throw new Error('Twilio credentials are not configured in environment variables.');
  }

  const client = twilio(accountSid, authToken);

  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      throw new Error('Order not found.');
    }

    const orderData = orderSnap.data();
    const assignedStaffIds: string[] = orderData.assignedStaff || [];

    if (assignedStaffIds.length === 0) {
      return { success: true, message: 'No staff assigned to this event. No messages sent.' };
    }

    const staffPromises = assignedStaffIds.map(staffId => getDoc(doc(db, 'staff', staffId)));
    const staffDocs = await Promise.all(staffPromises);

    const phoneNumbers = staffDocs
      .filter(doc => doc.exists())
      .map(doc => doc.data()!.phone)
      .filter(phone => !!phone);

    const messagePromises = phoneNumbers.map(number => {
      // For trial accounts, WhatsApp messages need 'whatsapp:' prefix on both 'from' and 'to'
      // and for SMS, the 'to' number needs to be a verified number.
      // We are sending SMS here. Twilio will handle the 'from' number format.
      return client.messages.create({
        body: message,
        from: twilioPhone,
        to: number,
      });
    });

    await Promise.all(messagePromises);

    return { success: true, message: `Messages sent to ${phoneNumbers.length} staff members.` };

  } catch (error: any) {
    console.error('Failed to send message:', error);
    return { success: false, error: error.message || 'An unknown error occurred.' };
  }
}
