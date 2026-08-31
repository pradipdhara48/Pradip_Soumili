'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { CountdownTimer } from '@/components/countdown-timer'

export function Hero() {
  // ডাটাবেসের বদলে সরাসরি তথ্য দেওয়া হলো
  const data = {
    hero_bg_image: "/images/about-1.JPG", // আপনার public/images ফোল্ডারে থাকা ছবি
    tagline: "WE ARE GETTING MARRIED",
    bride: "Soumili",
    groom: "Pradip",
    date_label: "Upcoming in 2026",
    location: "West Bengal, India",
    date: "2026-12-15T00:00:00"
  }

  return (
    <section id="top" className="relative flex min-h-svh items-center justify-center overflow-hidden">
      <Image
        src={data.hero_bg_image}
        alt="The couple"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/60" />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 py-28 text-center text-primary-foreground">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="text-xs font-medium uppercase tracking-[0.4em] text-primary-foreground/80"
        >
          {data.tagline}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 font-serif text-6xl font-light leading-none text-balance sm:text-7xl md:text-8xl italic"
        >
          {data.bride}
          <span className="mx-3 italic text-accent">&amp;</span>
          {data.groom}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="my-7 h-px w-40 origin-center bg-primary-foreground/50"
        />

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: 'easeOut' }}
          className="font-serif text-lg italic tracking-wide sm:text-xl"
        >
          {data.date_label}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.65, ease: 'easeOut' }}
          className="mt-1 text-xs font-medium uppercase tracking-[0.3em] text-primary-foreground/80"
        >
          {data.location}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.85, ease: 'easeOut' }}
          className="mt-10"
        >
          <CountdownTimer date={data.date} />
        </motion.div>
      </div>
    </section>
  )
}