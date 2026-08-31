import { Hero } from '@/components/sections/hero';
import { About } from '@/components/sections/about';
import { Details } from '@/components/sections/details';
import { Gallery } from '@/components/sections/gallery';
import { RsvpFooter } from '@/components/sections/rsvp-footer';
import { SiteNav } from '@/components/site-nav';
import { FloatingWhatsApp } from '@/components/floating-whatsapp';

export default function Home() {
  return (
    <main className="min-h-screen">
      <SiteNav />
      <Hero />
      <About />
      <Details />
      <Gallery />
      <RsvpFooter />
      <FloatingWhatsApp />
    </main>
  );
}