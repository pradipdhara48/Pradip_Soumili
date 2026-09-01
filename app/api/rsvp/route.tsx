import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const guestName = data.name || 'A Guest';
    const message = data.message || 'Congratulations ❤️';

    // EmailJS API endpoint
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: 'service_b1v0s29',
        template_id: 'template_41grspt',
        user_id: 'DOoNq6FFo_ZnrqlY-', // EmailJS রুট এপিআই-এর জন্য user_id ব্যবহার করা হলো
        template_params: {
          from_name: guestName,
          message: message,
          to_email: 'pradipsoumili48@gmail.com',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('EmailJS Error:', errorText);
      return NextResponse.json({ error: errorText || 'Failed to send email via EmailJS' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}