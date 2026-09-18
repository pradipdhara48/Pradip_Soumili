'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Reveal } from '@/components/reveal'
import { supabase } from '@/lib/supabaseClient'

export function Gallery() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      const { data: conf } = await supabase.from('site_settings').select('*').eq('id', 'main_config').single()
      if (conf) setData(conf)
    }
    fetchData()
  }, [])

  const galleryImages = [
    { src: data?.home_gallery_1 || '/images/gallery-1.png', alt: 'Wedding rings resting on blush roses' },
    { src: data?.home_gallery_2 || '/images/gallery-2.png', alt: 'Romantic candlelit reception table setting' },
    { src: data?.home_gallery_3 || '/images/gallery-3.JPG', alt: 'Couple dancing under warm string lights' },
  ]

  const isSelfieEnabled = data?.enable_selfie_search !== false
  const isFeedEnabled = data?.enable_journey_feed !== false

  return (
    <section id="gallery" className="relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-foreground">
            Moments
          </p>
          <h2 className="mt-4 font-serif text-4xl font-light text-balance sm:text-5xl">
            A Glimpse of Us
          </h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            A few of our favorite frames — with many more to come after the big
            day.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {galleryImages.map((photo, i) => (
            <Reveal
              key={i}
              delay={i * 0.1}
              className={i === 0 ? 'col-span-2 row-span-2' : ''}
            >
              <div
                className={`group relative overflow-hidden rounded-lg shadow-md ${
                  i === 0 ? 'aspect-square md:aspect-auto md:h-full' : 'aspect-square'
                }`}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </Reveal>
          ))}

          {/* ১. AI Selfie Photo Finder Card */}
          <Reveal delay={0.3}>
            <div className="flex aspect-square flex-col items-center justify-center rounded-lg border border-dashed border-accent/60 bg-secondary/60 p-5 text-center">
              <span className="mb-2 text-2xl">✨</span>
              <p className="font-serif text-lg italic text-foreground">
                Find Your Photos
              </p>
              <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">
                {data?.drive_note || "Take a quick selfie to find every photo you appear in."}
              </p>

              {isSelfieEnabled ? (
                <Link
                  href="/find-photos"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-primary/40 bg-card px-4 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.15em] text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:scale-105 cursor-pointer shadow-xs"
                >
                  <span>Find with Selfie</span>
                  <span>📸</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Coming Soon"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-border/50 bg-muted px-4 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.15em] text-muted-foreground cursor-not-allowed opacity-75 shadow-none"
                >
                  <span>Coming Soon</span>
                  <span>🔒</span>
                </button>
              )}
            </div>
          </Reveal>

          {/* ২. Moments & Stories Feed Card */}
          <Reveal delay={0.4}>
            <div className="flex aspect-square flex-col items-center justify-center rounded-lg border border-dashed border-accent/60 bg-secondary/60 p-5 text-center">
              <span className="mb-2 text-2xl">📸</span>
              <p className="font-serif text-lg italic text-foreground">
                Moments & Stories
              </p>
              <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">
                Explore our daily moments, live updates & special captures.
              </p>

              {isFeedEnabled ? (
                <Link
                  href="/gallery"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.15em] text-primary-foreground transition-all hover:opacity-90 hover:scale-105 cursor-pointer shadow-sm"
                >
                  <span>Our Journey Feed</span>
                  <span>❤️</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Coming Soon"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-muted text-muted-foreground px-4 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.15em] cursor-not-allowed opacity-75 shadow-none border border-border/50"
                >
                  <span>Coming Soon</span>
                  <span>🔒</span>
                </button>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export default Gallery