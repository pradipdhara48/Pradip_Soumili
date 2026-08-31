"use client";

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Reveal } from '@/components/reveal'
import { supabase } from '@/lib/supabaseClient'
import { X, ChevronLeft, ChevronRight, BookOpen, ZoomIn, ZoomOut } from 'lucide-react'

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="h-5 w-5" aria-hidden="true">
      <path d="M12 21s-7-5.686-7-11a7 7 0 1 1 14 0c0 5.314-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

export function Details() {
  const [data, setData] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next')
  const [isZoomed, setIsZoomed] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const { data: conf } = await supabase.from('site_settings').select('*').eq('id', 'main_config').single()
      if (conf) setData(conf)
    }
    fetchData()
  }, [])

  if (!data) return null

  const events = [
    { title: data.ceremony_title, time: data.ceremony_time, venue: data.ceremony_venue, address: data.ceremony_address },
    { title: data.reception_title, time: data.reception_time, venue: data.reception_venue, address: data.reception_address }
  ]

  // Parsing dynamic invitation cards properly
  let parsedCards = [];
  if (typeof data.invitation_cards === 'string') {
    try { parsedCards = JSON.parse(data.invitation_cards); } catch (e) {}
  } else if (Array.isArray(data.invitation_cards)) {
    parsedCards = data.invitation_cards;
  }

  const invitationPages = parsedCards.length > 0 
    ? parsedCards 
    : ["/images/card-1.PNG", "/images/card-2.PNG"] // fallback if database is empty

  const handleNext = () => {
    if (isTransitioning || currentPage >= invitationPages.length - 1) return
    setSlideDirection('next')
    setIsTransitioning(true)
    setTimeout(() => { setCurrentPage((prev) => prev + 1); setIsTransitioning(false) }, 280)
  }

  const handlePrev = () => {
    if (isTransitioning || currentPage <= 0) return
    setSlideDirection('prev')
    setIsTransitioning(true)
    setTimeout(() => { setCurrentPage((prev) => prev - 1); setIsTransitioning(false) }, 280)
  }

  const goToPage = (index: number) => {
    if (isTransitioning || index === currentPage) return
    setSlideDirection(index > currentPage ? 'next' : 'prev')
    setIsTransitioning(true)
    setTimeout(() => { setCurrentPage(index); setIsTransitioning(false) }, 280)
  }

  return (
    <section id="details" className="relative overflow-hidden bg-secondary/50 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-foreground">When &amp; Where</p>
          <h2 className="mt-4 font-serif text-4xl font-light text-balance sm:text-5xl">The Celebration</h2>
          <p className="mt-5 font-serif text-xl italic text-muted-foreground">{data.date_label}, {data.year_label}</p>
        </Reveal>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {events.map((ev, i) => (
            <Reveal key={ev.title} delay={i * 0.15}>
              <div className="group h-full rounded-xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-lg md:p-10">
                <span className="font-serif text-sm italic text-accent-foreground">{i === 0 ? 'First' : 'Then'}</span>
                <h3 className="mt-2 font-serif text-3xl font-light">{ev.title}</h3>
                <div className="my-6 h-px w-16 bg-accent/60" />
                <ul className="space-y-4 text-muted-foreground">
                  <li className="flex items-start gap-3"><span className="mt-0.5 text-accent-foreground"><ClockIcon /></span><span className="leading-relaxed">{ev.time}</span></li>
                  <li className="flex items-start gap-3"><span className="mt-0.5 text-accent-foreground"><PinIcon /></span><span className="leading-relaxed"><span className="block font-medium text-foreground">{ev.venue}</span>{ev.address}</span></li>
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-12 flex flex-col items-center gap-4 text-center">
          <a
            href={data.map_link || "https://maps.app.goo.gl/ZyzQKJZRsjBA1M326"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            View on Map
          </a>

          <button
            type="button"
            onClick={() => { setCurrentPage(0); setIsZoomed(false); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card px-7 py-3 text-xs font-medium uppercase tracking-[0.2em] text-primary transition-all hover:bg-primary/10 hover:scale-[1.03] cursor-pointer"
          >
            <BookOpen className="h-4 w-4" />
            Preview Invitation Card
          </button>
        </Reveal>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200">
          <div className={`relative w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isZoomed ? 'max-w-4xl h-[90vh]' : 'max-w-lg h-auto'}`}>
            <div className="w-full flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
              <span className="font-serif text-base md:text-lg tracking-wide text-foreground">Wedding Invitation</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsZoomed(!isZoomed)} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><ZoomIn className="h-4 w-4" /></button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-1"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div className={`w-full flex flex-col items-center justify-center bg-secondary/30 overflow-y-auto ${isZoomed ? 'p-6 flex-1' : 'p-4 sm:p-6'}`}>
              <div className={`relative overflow-hidden rounded-xl shadow-xl bg-card border border-border transition-all duration-300 ${isZoomed ? 'w-full max-w-[480px] aspect-[3/4.2]' : 'w-full max-w-[340px] aspect-[3/4.2]'}`}>
                <div className={`relative w-full h-full flex items-center justify-center transition-all duration-300 ease-out ${isTransitioning ? (slideDirection === 'next' ? 'opacity-0 translate-x-6 scale-95' : 'opacity-0 -translate-x-6 scale-95') : 'opacity-100 translate-x-0 scale-100'}`}>
                  <Image src={invitationPages[currentPage]} alt="Invitation Page" fill sizes="(max-width: 768px) 100vw, 500px" className="object-contain p-2 select-none" priority />
                </div>
                <button type="button" onClick={handlePrev} disabled={currentPage === 0 || isTransitioning} className="absolute left-0 top-0 bottom-0 w-1/4 z-30 cursor-pointer disabled:cursor-default group flex items-center justify-start pl-2">
                  {currentPage > 0 && <span className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft className="h-4 w-4" /></span>}
                </button>
                <button type="button" onClick={handleNext} disabled={currentPage === invitationPages.length - 1 || isTransitioning} className="absolute right-0 top-0 bottom-0 w-1/4 z-30 cursor-pointer disabled:cursor-default group flex items-center justify-end pr-2">
                  {currentPage < invitationPages.length - 1 && <span className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="h-4 w-4" /></span>}
                </button>
              </div>

              <div className={`flex items-center justify-between w-full mt-4 px-2 ${isZoomed ? 'max-w-[480px]' : 'max-w-[340px]'}`}>
                <button type="button" onClick={handlePrev} disabled={currentPage === 0 || isTransitioning} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium cursor-pointer disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /><span>Prev</span></button>
                <span className="text-xs font-medium text-muted-foreground">{currentPage + 1} / {invitationPages.length}</span>
                <button type="button" onClick={handleNext} disabled={currentPage === invitationPages.length - 1 || isTransitioning} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-xs font-medium cursor-pointer disabled:opacity-40"><span>Next</span><ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <div className="w-full flex items-center justify-center gap-2 py-3 border-t border-border bg-card shrink-0">
              {invitationPages.map((_: any, idx: any) => (
                <button key={idx} type="button" onClick={() => goToPage(idx)} className={`h-1.5 rounded-full transition-all duration-300 ${currentPage === idx ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}