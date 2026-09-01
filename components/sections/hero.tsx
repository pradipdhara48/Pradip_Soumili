'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { CountdownTimer } from '@/components/countdown-timer'
import { supabase } from '@/lib/supabaseClient'

export function Hero() {
  const [data, setData] = useState<any>({
    groom: '',
    bride: '',
    tagline: '',
    date_label: '',
    location: '',
    date: '',
    hero_bg_image: ''
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const { data: conf } = await supabase.from('site_settings').select('*').eq('id', 'main_config').single()
      if (conf) {
        setData(conf)
      }
      setLoaded(true)
    }
    fetchData()
  }, [])

  const heroImage = data.hero_bg_image
  const tagline = data.tagline || (loaded ? "" : "TOGETHER WITH THEIR FAMILIES")
  
  const groomName = data.groom || (loaded ? "" : "Pradip")
  const brideName = data.bride || (loaded ? "" : "Soumili")
  
  const date_label = data.date_label || (loaded ? "" : "Sunday, the Eleven of October")
  const location = data.location || (loaded ? "" : "CHAYABANI RECEPTION HALL, ARAMBAGH")
  const date = data.date || "2026-10-11T00:00:00"

  return (
    <section id="top" className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#1c2434]">
      {heroImage && (
        <Image src={heroImage} alt="The couple" fill priority sizes="100vw" className="object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/60" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-24 sm:px-6 sm:py-28 text-center text-primary-foreground">
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.3em] sm:tracking-[0.4em] text-primary-foreground/90">
          {tagline}
        </motion.p>
        
        {/* Responsive Name Heading with original &amp; style */}
        <motion.h1 
          initial={{ opacity: 0, y: 24 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} 
          className="mt-4 sm:mt-6 font-serif text-[2.2rem] xs:text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light leading-tight tracking-normal sm:tracking-wide italic flex items-center justify-center flex-nowrap whitespace-nowrap"
        >
          <span>{groomName}</span>
          <span className="mx-2.5 sm:mx-3 italic text-accent font-light">&amp;</span>
          <span>{brideName}</span>
        </motion.h1>

        <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 1, delay: 0.5 }} className="my-5 sm:my-7 h-px w-32 sm:w-40 origin-center bg-primary-foreground/40" />
        
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.55, ease: 'easeOut' }} className="font-serif text-base sm:text-xl italic tracking-wide text-white/95">
          {date_label}
        </motion.p>
        
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.65, ease: 'easeOut' }} className="mt-1.5 text-[10px] sm:text-xs font-medium uppercase tracking-[0.25em] text-primary-foreground/85 px-2">
          {location}
        </motion.p>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.85, ease: 'easeOut' }} className="mt-8 sm:mt-10 w-full flex justify-center">
          <CountdownTimer date={date} />
        </motion.div>
      </div>

      {/* Animated Scroll Down Indicator Line */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.2, ease: 'easeOut' }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20 cursor-pointer pointer-events-none"
      >
        <span className="text-[9px] uppercase tracking-[0.3em] text-white/70">Scroll</span>
        <div className="w-[1px] h-9 bg-gradient-to-b from-white/80 via-white/40 to-transparent relative overflow-hidden">
          <motion.div
            animate={{ y: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="w-full h-full bg-white"
          />
        </div>
      </motion.div>
    </section>
  )
}