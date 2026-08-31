'use client'

import { useEffect, useState } from 'react'
import { wedding } from '@/lib/wedding-data'

const links = [
  { href: '#story', label: 'Our Story' },
  { href: '#details', label: 'Details' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#rsvp', label: 'RSVP' },
]

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-border/60 bg-background/85 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a
          href="#top"
          className={`font-serif text-xl italic tracking-wide transition-colors ${
            scrolled ? 'text-foreground' : 'text-primary-foreground'
          }`}
        >
          {wedding.bride[0]}
          <span className="mx-0.5 not-italic">&amp;</span>
          {wedding.groom[0]}
        </a>
        <ul
          className={`hidden items-center gap-8 text-xs font-medium uppercase tracking-[0.2em] transition-colors md:flex ${
            scrolled ? 'text-muted-foreground' : 'text-primary-foreground/90'
          }`}
        >
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="transition-colors hover:text-accent"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#rsvp"
          className={`rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] transition-all hover:scale-[1.03] ${
            scrolled
              ? 'border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground'
              : 'border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground hover:text-foreground'
          }`}
        >
          Wish Us
        </a>
      </nav>
    </header>
  )
}
