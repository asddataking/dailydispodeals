import type { Metadata, Viewport } from "next";
import { Archivo_Black, DM_Sans, Permanent_Marker } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/site/Header";
import { Footer } from "./components/site/Footer";
import { MobileTabBar } from "./components/site/MobileTabBar";
import "./globals.css";

const display = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const marker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-marker",
});

const TITLE = "Daily Dispo Deals — Today's Best Dispo Deals. No Hunting.";
const DESCRIPTION =
  "Today's best dispo deals. No hunting. Find current Michigan dispensary specials in one place — submitted by shops, free for shoppers.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "cannabis deals",
    "dispensary deals",
    "Michigan cannabis",
    "Detroit cannabis deals",
    "Port Huron dispensary deals",
    "daily dispo deals",
    "weed deals Michigan",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "en_US",
    url: process.env.APP_URL || "https://dailydispodeals.com",
    siteName: "Daily Dispo Deals",
    images: [
      {
        url: "/hero-city.png",
        width: 1200,
        height: 900,
        alt: "Daily Dispo Deals — Today's best dispensary deals.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/hero-city.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  alternates: {
    canonical: process.env.APP_URL || "https://dailydispodeals.com",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A0C0B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${marker.variable} font-sans site-grain`}>
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
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '892171203807837');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- 1x1 Facebook Pixel fallback */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=892171203807837&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <ErrorBoundary>
          <Header />
          <main className="min-h-screen bg-ink text-cream">{children}</main>
          <Footer />
          <MobileTabBar />
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
