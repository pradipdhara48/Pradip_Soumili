import { NextResponse } from 'next/server';

// Vercel প্রোডাকশনে সার্ভারলেস ফাংশন নিশ্চিত করার জন্য
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { type, guestName, message, totalLikes, totalComments, url } = await req.json();

    const botToken = "8885849887:AAGhhHh1YVOnRXlV5MUDmsGR0tSX_glvh3k"; 
    const chatId = "6864632702";   

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let text = '';

    if (type === 'wish') {
      text = `✨ *WEDDING WEBSITE ALERT* ✨\n` +
             `━━━━━━━━━━━━━━━━━━\n` +
             `💌 *New Wish Received*\n` +
             `👤 *From:* ${guestName || 'Guest'}\n` +
             `💬 "${message || ''}"\n` +
             `━━━━━━━━━━━━━━━━━━\n` +
             `📅 *Date:* ${dateStr}\n` +
             `⏰ *Time:* ${timeStr}`;
    } else if (type === 'like') {
      text = `✨ *WEDDING WEBSITE ALERT* ✨\n` +
             `━━━━━━━━━━━━━━━━━━\n` +
             `❤️ *New Like Received*\n` +
             `👤 *From:* ${guestName || 'Someone'}\n` +
             `👍 *Total Likes on this Photo:* ${totalLikes || 0}\n` +
             `━━━━━━━━━━━━━━━━━━\n` +
             `📅 *Date:* ${dateStr}\n` +
             `⏰ *Time:* ${timeStr}`;
    } else if (type === 'comment') {
      text = `✨ *WEDDING WEBSITE ALERT* ✨\n` +
             `━━━━━━━━━━━━━━━━━━\n` +
             `💬 *New Comment Received*\n` +
             `👤 *From:* ${guestName || 'Guest'}\n` +
             `📝 "${message || ''}"\n` +
             `📊 *Total Comments on this Photo:* ${totalComments || 0}\n` +
             `━━━━━━━━━━━━━━━━━━\n` +
             `📅 *Date:* ${dateStr}\n` +
             `⏰ *Time:* ${timeStr}`;
    } else {
      text = `✨ *WEDDING WEBSITE ALERT* ✨\n` +
             `━━━━━━━━━━━━━━━━━━\n` +
             `🔔 *Activity Detected*\n` +
             `👤 *From:* ${guestName || 'Guest'}\n` +
             `💬 ${message || ''}\n` +
             `━━━━━━━━━━━━━━━━━━\n` +
             `📅 *Date:* ${dateStr} | ⏰ ${timeStr}`;
    }

    const liveTargetUrl = `https://pradipsoumili.vercel.app${url || '/adminlogin'}`;

    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔗 Open Admin Panel", url: liveTargetUrl }
            ]
          ]
        }
      })
    });

    const telegramData = await telegramRes.json();
    return NextResponse.json({ success: true, telegram: telegramData });
  } catch (err) {
    console.error('Push send error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}