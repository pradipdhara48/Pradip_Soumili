import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY || 're_dummy_key_for_build';
    const resend = new Resend(apiKey);

    const body = await request.json();
    const { name, email, attendance, guests, message } = body;

    // Email send request
    const data = await resend.emails.send({
      from: 'Wedding RSVP <onboarding@resend.dev>',
      to: process.env.NOTIFICATION_EMAIL || email || 'delivered@resend.dev',
      subject: `New Wedding RSVP from ${name}`,
      html: `
        <h2>New RSVP Received</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Attending:</strong> ${attendance}</p>
        <p><strong>Total Guests:</strong> ${guests || 1}</p>
        <p><strong>Message:</strong> ${message || 'No message provided'}</p>
      `,
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('RSVP submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit RSVP' },
      { status: 500 }
    );
  }
}