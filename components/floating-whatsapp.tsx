'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function FloatingWhatsApp() {
  const [whatsappNumber, setWhatsappNumber] = useState('')

  useEffect(() => {
    async function fetchWhatsapp() {
      const { data } = await supabase.from('site_settings').select('whatsapp_number').eq('id', 'main_config').single()
      if (data && data.whatsapp_number) {
        // লিংকের জন্য নম্বরের ভেতরের স্পেস বা ক্যারেক্টার মুছে শুধু সংখ্যা রাখা হচ্ছে
        const cleanNumber = data.whatsapp_number.replace(/\D/g, '')
        setWhatsappNumber(cleanNumber)
      }
    }
    fetchWhatsapp()
  }, [])

  // যদি অ্যাডমিনে কোনো নম্বর দেওয়া না থাকে, তাহলে বাটনটি লুকানো থাকবে
  if (!whatsappNumber) return null

  return (
    <a
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-2xl"
      aria-label="Chat on WhatsApp"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.334.101.154.453.726.963 1.154.658.553 1.218.728 1.378.814.16.086.253.072.347-.029l.482-.601c.116-.145.231-.116.362-.072.13.043.823.391.968.462.145.072.246.108.282.166.036.058.036.333-.108.738z" />
        <path d="M12.031 2C6.5 2 2 6.5 2 12.034c0 1.77.466 3.5 1.348 5.035L2 22l5.084-1.319A9.957 9.957 0 0012.031 22c5.53 0 10.031-4.5 10.031-10.034C22.062 6.5 17.56 2 12.031 2zm0 18.232c-1.48 0-2.932-.381-4.198-1.103l-.3-.173-3.118.81.828-3.033-.196-.307A8.256 8.256 0 013.73 12.034c0-4.57 3.721-8.293 8.301-8.293 4.58 0 8.302 3.723 8.302 8.293 0 4.57-3.722 8.293-8.302 8.293z" />
      </svg>
    </a>
  )
}