'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Reveal } from '@/components/reveal'
import { supabase } from '@/lib/supabaseClient'

export function RsvpFooter() {
  const [data, setData] = useState<any>({})
  const [sent, setSent] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const { data: conf } = await supabase.from('site_settings').select('bride, groom, date_label, location').eq('id', 'main_config').single()
      if (conf) setData(conf)
    }
    fetchData()
  }, [])

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestName.trim()) return

    const { error } = await supabase.from('rsvps').insert([{ name: guestName.trim(), message: "Congratulations", attending: true, guests_count: 1 }])
    
    if (!error) {
      setIsModalOpen(false)
      setSent(true)
    }
  }

  return (
    <section id="rsvp" className="relative overflow-hidden bg-primary text-primary-foreground">
      <Image src="/images/cover-couple.png" alt="" fill sizes="100vw" className="object-cover opacity-15" />
      <div className="relative z-10 mx-auto max-w-xl px-6 py-24 text-center">
        <Reveal>
          <h2 className="mt-4 font-serif text-4xl font-light">Bless us with your presence.</h2>
        </Reveal>
        <Reveal delay={0.15}>
          {sent ? (
             <p className="mt-10 font-serif text-2xl italic">Thank you, {guestName}!</p>
          ) : (
             <button onClick={() => setIsModalOpen(true)} className="mt-10 rounded-full bg-accent px-7 py-3 text-xs font-medium uppercase text-accent-foreground">RSVP Now</button>
          )}
        </Reveal>
        <div className="mt-16 border-t border-primary-foreground/20 pt-8">
          <p className="font-serif text-3xl italic">{data.bride || "Soumili"} &amp; {data.groom || "Pradip"}</p>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 text-foreground">
            <h3 className="font-serif text-2xl text-center">Your Name?</h3>
            <form onSubmit={handleFinalSubmit} className="mt-6 flex flex-col gap-4">
              <input type="text" required value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full rounded-xl border p-3" />
              <button type="submit" className="rounded-xl bg-primary text-primary-foreground px-4 py-3">Send</button>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}