import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const guestName = data.name || 'A Guest';
    const message = data.message || 'Congratulations ❤️';

    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'pradipsoumili48@gmail.com',
      subject: `💍 New Wedding Wishes from ${guestName}!`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; color: #333; background-color: #fdfbf7; border-radius: 12px; border: 1px solid #eae5db;">
          <h2 style="color: #A66E70; margin-top: 0;">New Wedding Wishes Received!</h2>
          <p style="font-size: 16px;"><strong>From:</strong> ${guestName}</p>
          <p style="font-size: 16px;"><strong>Message:</strong></p>
          <div style="background: #ffffff; padding: 16px; border-left: 4px solid #A66E70; border-radius: 4px; font-size: 18px; margin-top: 8px;">
            ${message}
          </div>
        </div>
      `,
    });

    if (result.error) {
      console.error('Resend Error:', result.error);
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}