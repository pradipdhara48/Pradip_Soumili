'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Reveal } from '@/components/reveal'
import { supabase } from '@/lib/supabaseClient'

export function RsvpFooter() {
  const [data, setData] = useState<any>({})
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('Congratulations ❤️')
  const [guestName, setGuestName] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // ডাটাবেস থেকে ডেটা আনা
  useEffect(() => {
    async function fetchData() {
      const { data: conf } = await supabase
        .from('site_settings')
        .select('bride, groom, date_label, location')
        .eq('id', 'main_config')
        .single()
      if (conf) setData(conf)
    }
    fetchData()
  }, [])

  const handleInitialClick = (e: React.FormEvent) => {
    e.preventDefault()
    setIsModalOpen(true)
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestName.trim()) return
    setLoading(true)

    // ১. অ্যাডমিন প্যানেলে দেখার জন্য Supabase ডাটাবেজে RSVP সেভ করা
    const { error } = await supabase.from('rsvps').insert([{
      name: guestName.trim(),
      message: message,
      attending: true, 
      guests_count: 1
    }])

    if (!error) {
      // ২. অ্যাডমিন প্যানেলে রিয়েলটাইম নোটিফিকেশন পাঠানো
      try {
        await supabase.from('admin_notifications').insert([{
          type: 'rsvp',
          title: `New Wish from ${guestName.trim()} 💌`,
          description: `"${message.slice(0, 60)}"`,
          post_id: null
        }])
      } catch (err) {
        console.error('RSVP notification insert failed:', err)
      }

      // ৩. সরাসরি ব্রাউজার থেকে EmailJS এপিআই-তে ফেচ রিকোয়েস্ট পাঠানো
      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service_id: 'service_b1v0s29',
            template_id: 'template_41grspt',
            user_id: 'DOoNq6FFo_ZnrqlY-',
            template_params: {
              from_name: guestName.trim(),
              message: message,
              to_email: 'pradipsoumili48@gmail.com',
            },
          }),
        })
      } catch (err) {
        console.error('Email sending failed:', err)
      }

      setIsModalOpen(false)
      setSent(true)
    } else {
      alert('Failed to send message. Please check database setup.')
    }
    setLoading(false)
  }

  // ফলব্যাক ডেটা
  const bride = data.bride || "Soumili"
  const groom = data.groom || "Pradip"
  const date_label = data.date_label || "December 15, 2026"
  const location = data.location || "Kolkata, West Bengal"

  return (
    <section id="rsvp" className="relative overflow-hidden bg-primary text-primary-foreground">
      <Image src="/images/cover-couple.png" alt="" fill sizes="100vw" className="object-cover opacity-15" />
      <div className="relative z-10 mx-auto max-w-xl px-6 py-24 text-center md:py-32">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary-foreground/70">Share in our joy</p>
          <h2 className="mt-4 font-serif text-4xl font-light text-balance sm:text-5xl">Bless us with your presence and prayers.</h2>
        </Reveal>

        <Reveal delay={0.15}>
          {sent ? (
            <p className="mt-10 font-serif text-2xl italic">Thank you for the warm wishes, {guestName}!</p>
          ) : (
            <form onSubmit={handleInitialClick} className="mt-10 flex flex-col gap-3 sm:flex-row">
              <input
                type="text" required value={message} onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-5 py-3 text-2xl text-primary-foreground focus:border-accent focus:outline-none"
              />
              <button type="submit" className="rounded-full bg-accent px-7 py-3 text-xs font-medium uppercase tracking-[0.2em] text-accent-foreground cursor-pointer transition-transform hover:scale-[1.03] shrink-0">
                Send this now
              </button>
            </form>
          )}
        </Reveal>

        <div className="mt-16 border-t border-primary-foreground/20 pt-8">
          <p className="font-serif text-3xl italic">{bride} <span className="text-accent">&amp;</span> {groom}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-primary-foreground/70">{date_label} · {location}</p>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 text-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-serif text-2xl font-normal text-center">Who is sending these warm wishes?</h3>
            <p className="mt-2 text-center text-xs text-muted-foreground">Please enter your name so the couple knows who to thank!</p>
            <form onSubmit={handleFinalSubmit} className="mt-6 flex flex-col gap-4">
              <input type="text" required autoFocus placeholder="Your Full Name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full rounded-xl border border-input bg-card px-4 py-3 text-base focus:border-primary focus:outline-none" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-xl bg-secondary border border-input px-4 py-2.5 text-xs font-medium uppercase hover:bg-secondary/80 cursor-pointer">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-xs font-medium uppercase cursor-pointer hover:opacity-90 disabled:opacity-50">{loading ? 'Sending...' : 'Confirm & Send'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}