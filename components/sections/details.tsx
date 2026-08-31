"use client";

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Reveal } from '@/components/reveal'
import { supabase } from '@/lib/supabaseClient'
import { X, BookOpen, MapPin, ZoomIn, ZoomOut } from 'lucide-react'
import { motion } from 'framer-motion'

function ClockIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-5 w-5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function PinIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-5 w-5"><path d="M12 21s-7-5.686-7-11a7 7 0 1 1 14 0c0 5.314-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg> }

export function Details() {
  const [data, setData] = useState<any>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const { data: conf } = await supabase.from('site_settings').select('*').eq('id', 'main_config').single()
      if (conf) setData(conf)
    }
    fetchData()
  }, [])

  const events = [
    { title: data.ceremony_title || "Wedding Ceremony", time: data.ceremony_time || "6:00 PM", venue: data.ceremony_venue || "Venue", address: data.ceremony_address || "Address" },
    { title: data.reception_title || "Reception", time: data.reception_time || "7:00 PM", venue: data.reception_venue || "Venue", address: data.reception_address || "Address" }
  ]

  let parsedCards: string[] = [];
  if (typeof data.invitation_cards === 'string') {
    try { parsedCards = JSON.parse(data.invitation_cards); } catch (e) {}
  } else if (Array.isArray(data.invitation_cards)) {
    parsedCards = data.invitation_cards;
  }
  const invitationPages = parsedCards.length > 0 ? parsedCards : ["/images/card-1.PNG", "/images/card-2.PNG"]

  return (
    <section id="details" className="relative overflow-hidden bg-secondary/50 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-foreground">When &amp; Where</p>
          <h2 className="mt-4 font-serif text-4xl font-light text-balance sm:text-5xl">The Celebration</h2>
        </Reveal>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {events.map((ev, i) => (
            <Reveal key={i} delay={i * 0.15}>
              <div className="group h-full rounded-xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-lg md:p-10">
                <span className="font-serif text-sm italic text-accent-foreground">{i === 0 ? 'First' : 'Then'}</span>
                <h3 className="mt-2 font-serif text-3xl font-light">{ev.title}</h3>
                <div className="my-6 h-px w-16 bg-accent/60" />
                <ul className="space-y-4 text-muted-foreground">
                  <li className="flex items-start gap-3"><span className="mt-0.5 text-accent-foreground"><ClockIcon /></span><span>{ev.time}</span></li>
                  <li className="flex items-start gap-3"><span className="mt-0.5 text-accent-foreground"><PinIcon /></span><span><span className="block font-medium text-foreground">{ev.venue}</span>{ev.address}</span></li>
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-12 flex flex-col items-center justify-center gap-4 text-center">
          <button type="button" onClick={() => { setIsModalOpen(true); setIsZoomed(false); }} className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card px-7 py-3 text-xs font-medium uppercase tracking-[0.2em] text-primary transition-all hover:bg-primary/10 hover:scale-[1.03]">
            <BookOpen className="h-4 w-4" /> Preview Invitation
          </button>

          {data.map_link && (
            <a href={data.map_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground transition-all hover:opacity-90 hover:scale-[1.03] shadow">
              <MapPin className="h-4 w-4" /> View on Google Map
            </a>
          )}
        </Reveal>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`relative w-full bg-card border border-border rounded-2xl p-6 shadow-2xl transition-all duration-300 ${isZoomed ? 'max-w-4xl' : 'max-w-lg'}`}
          >
            <div className="absolute right-4 top-4 flex items-center gap-3 z-10">
              <button onClick={() => setIsZoomed(!isZoomed)} className="text-muted-foreground hover:text-foreground bg-secondary/80 p-1.5 rounded-full transition" title={isZoomed ? "Zoom Out" : "Zoom In"}>
                {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
              </button>
              <button onClick={() => { setIsModalOpen(false); setIsZoomed(false); }} className="text-muted-foreground hover:text-foreground bg-secondary/80 p-1.5 rounded-full transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className={`relative w-full mb-4 overflow-hidden perspective-1000 transition-all duration-300 ${isZoomed ? 'aspect-[16/10]' : 'aspect-[3/4.2]'}`}>
              <motion.div 
                key={currentPage}
                initial={{ opacity: 0, rotateY: 70, scale: 0.95 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="relative w-full h-full cursor-pointer"
                onClick={() => setIsZoomed(!isZoomed)}
              >
                <Image src={invitationPages[currentPage]} alt="Card" fill className="object-contain" />
              </motion.div>
            </div>

            <div className="flex justify-between items-center">
               <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="px-4 py-2 border rounded-lg disabled:opacity-50 text-sm">Prev</button>
               <span className="text-xs text-muted-foreground">Page {currentPage + 1} of {invitationPages.length}</span>
               <button onClick={() => setCurrentPage(p => Math.min(invitationPages.length - 1, p + 1))} disabled={currentPage === invitationPages.length - 1} className="px-4 py-2 border rounded-lg disabled:opacity-50 text-sm">Next</button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  )
}