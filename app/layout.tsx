import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-jost',
});

export const metadata: Metadata = {
  title: 'Pradip & Soumili — A Wedding Invitation',
  description:
    'You are warmly invited to celebrate the wedding of Pradip & Soumili. Open our invitation to discover our story, event details, and more.',
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f6e9df',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`light bg-background ${cormorant.variable} ${jost.variable}`}
    >
      <body className="font-sans antialiased bg-[#f6e9df]/20 text-[#2c2420]">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}