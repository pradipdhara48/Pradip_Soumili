'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getTimeLeft(target: number): TimeLeft {
  const diff = Math.max(0, target - Date.now())
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export function CountdownTimer({ date }: { date: string }) {
  const target = new Date(date).getTime()
  const [time, setTime] = useState<TimeLeft | null>(null)

  useEffect(() => {
    setTime(getTimeLeft(target))
    const id = setInterval(() => setTime(getTimeLeft(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  const units: { label: string; value: number }[] = [
    { label: 'Days', value: time?.days ?? 0 },
    { label: 'Hours', value: time?.hours ?? 0 },
    { label: 'Minutes', value: time?.minutes ?? 0 },
    { label: 'Seconds', value: time?.seconds ?? 0 },
  ]

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {units.map((u, i) => (
        <div key={u.label} className="flex items-center gap-2 sm:gap-3">
          <div className="flex w-14 flex-col items-center sm:w-16">
            <div className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-md border border-border/70 bg-card/70 shadow-sm sm:h-16">
              <motion.span
                key={u.value}
                initial={{ y: -14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="font-serif text-2xl font-semibold tabular-nums text-red-500
                sm:text-3xl"
                suppressHydrationWarning
              >
                {String(u.value).padStart(2, '0')}
              </motion.span>
            </div>
            <span className="mt-1.5 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-white">
              {u.label}
            </span>
          </div>
          {i < units.length - 1 && (
            <span className="-mt-4 font-serif text-2xl text-accent">:</span>
          )}
        </div>
      ))}
    </div>
  )
}
