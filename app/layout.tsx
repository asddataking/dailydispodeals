import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daily Dispo Deals - Best Cannabis Deals in Michigan | Zero Searching",
  description: "Get the best daily cannabis deals delivered to your inbox. We scan dispensaries across Michigan and email you personalized deals on flower, vapes, edibles, and more. No searching required.",
  keywords: [
    "cannabis deals",
    "marijuana deals",
    "dispensary deals",
    "Michigan cannabis",
    "daily deals",
    "weed deals",
    "cannabis discounts",
    "marijuana sales",
    "dispensary sales",
    "cannabis coupons",
    "best weed deals",
    "cheap cannabis",
    "cannabis price comparison",
    "daily dispo deals",
    "Detroit cannabis deals",
    "Grand Rapids cannabis deals",
    "Ann Arbor cannabis deals",
    "Michigan dispensary deals",
  ],
  openGraph: {
    title: "Daily Dispo Deals - Best Cannabis Deals in Michigan",
    description: "Zero searching. Better weed deals. We find the best dispensary deals so you don't have to.",
    type: "website",
    locale: "en_US",
    url: process.env.APP_URL || "https://dailydispodeals.com",
    siteName: "Daily Dispo Deals",
    images: [
      {
        url: "/lake.webp",
        width: 1200,
        height: 630,
        alt: "Daily Dispo Deals - Best Cannabis Deals in Michigan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Dispo Deals - Best Cannabis Deals in Michigan",
    description: "Zero searching. Better weed deals. We find the best dispensary deals so you don't have to.",
    images: ["/lake.webp"],
  },
  alternates: {
    canonical: process.env.APP_URL || "https://dailydispodeals.com",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JFZQ7GTNK9"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-JFZQ7GTNK9');
          `}
        </Script>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
