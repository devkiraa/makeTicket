import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: 'swap'
});

export const metadata: Metadata = {
  title: {
    default: "MakeTicket - Free Online Event Ticketing Platform | Create Tickets in Minutes",
    template: "%s | MakeTicket"
  },
  description: "Create event tickets online for free. MakeTicket is the #1 event ticketing platform for conferences, concerts, workshops, and festivals. Generate QR code tickets, manage registrations, and scan attendees instantly.",
  keywords: [
    "make ticket",
    "create ticket",
    "event ticket",
    "online ticketing",
    "ticket generator",
    "event registration",
    "QR code ticket",
    "free ticketing platform",
    "event management",
    "ticket booking",
    "conference tickets",
    "concert tickets",
    "workshop registration",
    "festival tickets",
    "ticket scanner",
    "check-in app",
    "event organizer",
    "ticketing software",
    "digital tickets",
    "mobile tickets"
  ],
  authors: [{ name: "MakeTicket", url: "https://maketicket.app" }],
  creator: "MakeTicket",
  publisher: "MakeTicket",
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
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://maketicket.app",
    siteName: "MakeTicket",
    title: "MakeTicket - Free Online Event Ticketing Platform",
    description: "Create event tickets online for free. Generate QR code tickets, manage registrations, and scan attendees instantly. The easiest way to make tickets for your events.",
    images: [
      {
        url: "https://maketicket.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "MakeTicket - Event Ticketing Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MakeTicket - Free Online Event Ticketing Platform",
    description: "Create event tickets online for free. Generate QR code tickets, manage registrations, and scan attendees instantly.",
    images: ["https://maketicket.app/og-image.png"],
    creator: "@maketicket",
  },
  alternates: {
    canonical: "https://maketicket.app",
  },
  category: "technology",
  verification: {
    google: "your-google-verification-code",
  },
};

import { Toaster } from "@/components/ui/toaster";
import { CaptchaProvider } from "@/providers/CaptchaProvider";
import { headers } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || undefined;

  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background antialiased",
          spaceGrotesk.className
        )}
      >
        <CaptchaProvider nonce={nonce}>
          {children}
          <Toaster />
        </CaptchaProvider>
      </body>
    </html >
  );
}
