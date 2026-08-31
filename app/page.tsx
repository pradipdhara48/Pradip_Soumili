import { Hero } from '@/components/sections/hero';
import { About } from '@/components/sections/about';
import { Details } from '@/components/sections/details';
import { Gallery } from '@/components/sections/gallery';
import { RsvpFooter } from '@/components/sections/rsvp-footer';
import { SiteNav } from '@/components/site-nav';
import { FloatingWhatsApp } from '@/components/floating-whatsapp';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#2c2420] selection:bg-[#8b4513] selection:text-white">
      {/* Navigation Bar */}
      <SiteNav />

      {/* Hero / Cover Section */}
      <Hero />

      {/* About the Couple */}
      <About />

      {/* Wedding Events & Location Details */}
      <Details />

      {/* Photo Gallery / Glimpse of Us */}
      <Gallery />

      {/* RSVP Form and Footer */}
      <RsvpFooter />

      {/* Floating WhatsApp Action */}
      <FloatingWhatsApp />
    </main>
  );
}