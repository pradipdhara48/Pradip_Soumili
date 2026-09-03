import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req) {
  try {
    const { subscription, email } = await req.json();

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription data required' }, { status: 400 });
    }

    // Supabase টেবিলে সেভ বা আপডেট করা
    const { data, error } = await supabase
      .from('admin_push_subscriptions')
      .upsert(
        {
          user_email: email || 'admin',
          subscription: subscription,
          created_at: new Date().toISOString()
        },
        { onConflict: 'user_email' }
      );

    if (error) {
      console.error('Supabase subscription insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Device registered successfully' });
  } catch (err) {
    console.error('Subscribe server error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}