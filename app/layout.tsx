import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RESCASAP — Excedentes que todavía valen',
  description: 'Packs de comida a precio rescate, cerca tuyo y antes del cierre.',
  metadataBase: new URL('https://rescasap.uy'),
  openGraph: {
    title: 'RESCASAP — Excedentes que todavía valen',
    description: 'Packs de comida a precio rescate, cerca tuyo y antes del cierre.',
    images: ['/og.png'],
    locale: 'es_UY',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RESCASAP — Excedentes que todavía valen',
    description: 'Packs de comida a precio rescate, cerca tuyo y antes del cierre.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-UY">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
