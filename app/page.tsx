import { SiteNav } from '@/components/site-nav'
import { Hero } from '@/components/sections/hero'
import { About } from '@/components/sections/about'
import { Details } from '@/components/sections/details'
import { Gallery } from '@/components/sections/gallery'
import { RsvpFooter } from '@/components/sections/rsvp-footer'
import { FloatingWhatsApp } from '@/components/floating-whatsapp'

export default function Home() {
  return (
    <main className="relative">
      <SiteNav />
      <Hero />
      <About />
      <Details />
      <Gallery />
      <RsvpFooter />
      <FloatingWhatsApp />
    </main>
  )
}