import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabase } from '@/lib/supabaseClient';

// VAPID সেটআপ
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:soumiligayen48@gmail.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const guestName = data.name || 'A Guest';
    const message = data.message || 'Congratulations ❤️';

    // ১. EmailJS API-তে ইমেইল পাঠানো
    try {
      const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'service_b1v0s29',
          template_id: 'template_41grspt',
          user_id: 'DOoNq6FFo_ZnrqlY-',
          template_params: {
            from_name: guestName,
            message: message,
            to_email: 'pradipsoumili48@gmail.com',
          },
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('EmailJS Error:', errorText);
      }
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr);
    }

    // ২. ব্যাকগ্রাউন্ডে মোবাইলে Web Push নোটিফিকেশন পাঠানো (ব্রাউজার বন্ধ থাকলেও আসবে)
    try {
      const { data: subs, error: subError } = await supabase
        .from('admin_push_subscriptions')
        .select('subscription');

      if (!subError && subs && subs.length > 0) {
        const payload = JSON.stringify({
          title: `New Wish from ${guestName} 💌`,
          body: message.length > 50 ? `${message.slice(0, 50)}...` : message,
          url: '/adminlogin',
        });

        const pushPromises = subs.map((subItem) =>
          webpush.sendNotification(subItem.subscription, payload).catch((err) => {
            console.error('Push delivery error:', err.statusCode || err.message);
          })
        );

        await Promise.all(pushPromises);
      }
    } catch (pushErr) {
      console.error('Push notification trigger error:', pushErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}