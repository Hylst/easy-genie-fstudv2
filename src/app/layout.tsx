import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { MagicHeader } from '@/components/common/magic-header';
import { Footer } from '@/components/common/footer';
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Easy Genie - Outils Magiques pour Neurodivergents',
  description: 'Une suite d\'outils web minimalistes pour aider les personnes neurodivergentes et celles qui luttent contre la procrastination.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <MagicHeader />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
