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

  // অ্যাডমিন প্যানেল থেকে ছবি না পেলে আগের ডিফল্ট ছবিগুলো দেখাবে
  const galleryImages = [
    { src: data?.home_gallery_1 || '/images/gallery-1.png', alt: 'Wedding rings resting on blush roses' },
    { src: data?.home_gallery_2 || '/images/gallery-2.png', alt: 'Romantic candlelit reception table setting' },
    { src: data?.home_gallery_3 || '/images/gallery-3.JPG', alt: 'Couple dancing under warm string lights' },
  ]

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

          {/* ১. Google Drive Card */}
          <Reveal delay={0.3}>
            <div className="flex aspect-square flex-col items-center justify-center rounded-lg border border-dashed border-accent/60 bg-secondary/60 p-5 text-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                className="mb-3 h-7 w-7 text-accent-foreground"
                aria-hidden="true"
              >
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
              <p className="font-serif text-lg italic text-foreground">
                Photo Gallery
                <br /> coming soon
              </p>
              <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">
                {data?.drive_note || "View all full-resolution photos from our celebration."}
              </p>
              <a
                href={data?.drive_link || "https://drive.google.com/drive/folders/1abkSLy25SXUmwJsCSg4Nl3_xGepx5iis?usp=sharing"}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center justify-center rounded-full border border-primary/40 bg-card px-4 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.15em] text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:scale-105 cursor-pointer"
              >
                Google Drive Link
              </a>
            </div>
          </Reveal>

          {/* ২. Our Journey Feed Card */}
          <Reveal delay={0.4}>
            <div className="flex aspect-square flex-col items-center justify-center rounded-lg border border-dashed border-accent/60 bg-secondary/60 p-5 text-center">
              <span className="mb-2 text-2xl">📸</span>
              <p className="font-serif text-lg italic text-foreground">
                Moments & Stories
              </p>
              <p className="mt-1 text-[0.7rem] leading-relaxed text-muted-foreground">
                Explore our daily moments, live updates & special captures.
              </p>
              <Link
                href="/gallery"
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.15em] text-primary-foreground transition-all hover:opacity-90 hover:scale-105 cursor-pointer shadow-sm"
              >
                <span>Our Journey Feed</span>
                <span>❤️</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}