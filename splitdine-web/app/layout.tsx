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
  title: "SplitDine - Group Dining Management Tool | Split the Bill in Seconds",
  description: "The complete group dining management platform for hosts. Track RSVPs, collect deposits, manage what everyone owes, and settle the bill in seconds — not 30 minutes. Free to use.",
  keywords: ["group dining management", "bill splitting", "group meals", "restaurant organizer", "RSVP tracking", "deposit collection", "payment tracking", "event management", "group event planning"],
  authors: [{ name: "SplitDine" }],
  creator: "SplitDine",
  publisher: "SplitDine",
  metadataBase: new URL('https://splitdine.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "SplitDine - Group Dining Management Tool",
    description: "Your group dining control centre — track RSVPs, collect deposits, manage what everyone owes, and settle the bill in seconds. Free for hosts.",
    url: 'https://splitdine.com',
    siteName: 'SplitDine',
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "SplitDine - Group Dining Management Tool",
    description: "Track RSVPs, collect deposits, and split the bill in seconds. The complete platform for managing group meals.",
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
