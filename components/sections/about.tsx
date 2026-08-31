'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Reveal } from '@/components/reveal'
import { supabase } from '@/lib/supabaseClient'

export function About() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      const { data: conf } = await supabase
        .from('site_settings')
        .select('story, about_image_1, about_image_2')
        .eq('id', 'main_config')
        .single()
      if (conf) setData(conf)
    }
    fetchData()
  }, [])

  if (!data) return null;

  const story = data.story || [];
  // ডাটাবেজে ছবি না থাকলে ডিফল্ট ছবি দেখাবে
  const img1 = data.about_image_1 || "/images/about-1.JPG";
  const img2 = data.about_image_2 || "/images/about-2.JPG";

  return (
    <section id="story" className="relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent-foreground">
            Our Story
          </p>
          <h2 className="mt-4 font-serif text-4xl font-light text-balance sm:text-5xl">
            Two hearts, one beautiful journey
          </h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Every love story is beautiful, but ours is our favorite. Here are a
            few of the moments that led us here.
          </p>
        </Reveal>

        <div className="mt-16 grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <Reveal className="grid grid-cols-2 gap-4">
            <div className="relative mt-10 aspect-[3/4] overflow-hidden rounded-lg shadow-lg">
              <Image 
                src={img1} 
                alt="Story image 1" 
                fill 
                sizes="(max-width: 768px) 50vw, 25vw" 
                className="object-cover transition-transform duration-700 hover:scale-105 cursor-pointer" 
              />
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-lg">
              <Image 
                src={img2} 
                alt="Story image 2" 
                fill 
                sizes="(max-width: 768px) 50vw, 25vw" 
                className="object-cover transition-transform duration-700 hover:scale-105 cursor-pointer" 
              />
            </div>
          </Reveal>

          <ol className="relative space-y-10 border-l border-border pl-8">
            {story.map((item: any, i: number) => (
              <Reveal key={i} delay={i * 0.12}>
                <li className="relative">
                  <span className="absolute -left-[2.35rem] top-1 flex h-4 w-4 items-center justify-center rounded-full border border-accent bg-background">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  <span className="font-serif text-sm italic text-accent-foreground">{item.year}</span>
                  <h3 className="mt-1 font-serif text-2xl font-light">{item.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{item.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}