import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daily Dispo Deals — Stop searching. Local dispensary deals, delivered.",
  description: "Stop searching. Local dispensary deals, delivered.",
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
    title: "Daily Dispo Deals — Stop searching. Local dispensary deals, delivered.",
    description: "Stop searching. Local dispensary deals, delivered.",
    type: "website",
    locale: "en_US",
    url: process.env.APP_URL || "https://dailydispodeals.com",
    siteName: "Daily Dispo Deals",
    images: [
      {
        url: "/socialshare.png",
        width: 1200,
        height: 630,
        alt: "Daily Dispo Deals — Stop searching. Local dispensary deals, delivered.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Dispo Deals — Stop searching. Local dispensary deals, delivered.",
    description: "Stop searching. Local dispensary deals, delivered.",
    images: ["/socialshare.png"],
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
        {/* Meta Pixel Code */}
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
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=892171203807837&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
