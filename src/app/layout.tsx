import type { Metadata, Viewport } from "next";
import { DM_Sans, Newsreader } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "LessonLeads | Turn your golf website traffic into booked lessons",
    template: "%s | LessonLeads",
  },
  description:
    "An embeddable widget that learns from your website and videos, answers golfers' questions, captures qualified leads, and sends them to the booking system you already use.",
  applicationName: "LessonLeads",
  category: "business",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "LessonLeads",
    title: "Turn your golf website traffic into booked lessons",
    description:
      "LessonLeads learns from your website and videos, answers golfers' questions, captures qualified leads, and sends them to your booking page.",
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "LessonLeads golf coaching widget and lead capture" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Turn your golf website traffic into booked lessons",
    description:
      "An AI widget trained on your coaching content that answers questions, captures leads, and hands off to your booking system.",
    images: ["/og.png"],
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f5ef",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
