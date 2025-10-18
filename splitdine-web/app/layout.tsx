import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SplitDine - Split the bill in seconds, not 30 minutes",
  description: "Tired of standing at the till with a calculator? SplitDine makes group meals effortless — track what everyone owes, collect payments, and settle the bill smoothly. Free to use.",
  keywords: ["bill splitting", "group dining", "restaurant bills", "split bill app", "group meals", "payment tracking", "event management"],
  authors: [{ name: "SplitDine" }],
  creator: "SplitDine",
  publisher: "SplitDine",
  metadataBase: new URL('https://splitdine.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "SplitDine - Split the bill in seconds, not 30 minutes",
    description: "Make your next group meal stress-free. Track what everyone owes, collect payments, and skip the 30-minute chaos at the till.",
    url: 'https://splitdine.com',
    siteName: 'SplitDine',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "SplitDine - Split the bill in seconds, not 30 minutes",
    description: "Make your next group meal stress-free. Track what everyone owes and settle the bill smoothly.",
    creator: '@splitdine',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
