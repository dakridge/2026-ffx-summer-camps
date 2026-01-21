import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ErrorBoundary } from "./components";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fairfax County Summer Camps 2026 | Free Camp Finder & Planner",
  description:
    "Find and compare 2000+ FCPA summer camps in Fairfax County, VA. Filter by age, location, price, dates, and activities. Free planning tool for parents.",
  keywords: [
    "Fairfax County summer camps",
    "FCPA camps 2026",
    "summer camps near me",
    "kids summer camps Virginia",
    "Fairfax County Parks camps",
    "summer camp finder",
    "camp planner",
    "Northern Virginia summer camps",
  ],
  authors: [{ name: "Cradley", url: "https://searchcradley.com" }],
  creator: "Cradley",
  publisher: "Cradley",
  metadataBase: new URL("https://ffxcamps.searchcradley.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://ffxcamps.searchcradley.com",
    siteName: "Fairfax County Summer Camp Explorer",
    title: "Find 2000+ Fairfax County Summer Camps | Free Finder & Planner",
    description:
      "Search, filter, and plan your child's perfect summer. Compare FCPA camps by age, location, price, and activities. 100% free tool for parents.",
    locale: "en_US",
    images: [
      {
        url: "https://ffxcamps.searchcradley.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fairfax County Summer Camp Explorer - Find and plan summer camps for kids",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find 2000+ Fairfax County Summer Camps | Free Tool",
    description:
      "Search, filter, and plan your child's perfect summer. Compare FCPA camps by age, location, price, and activities.",
    images: ["https://ffxcamps.searchcradley.com/og-image.png"],
    creator: "@searchcradley",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD structured data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Fairfax County Summer Camp Explorer",
  description: "Free tool to find and plan summer camps in Fairfax County, VA",
  url: "https://ffxcamps.searchcradley.com",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Organization",
    name: "Cradley",
    url: "https://searchcradley.com",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "50",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-camp-cream">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-camp-terracotta focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>
        <ErrorBoundary>{children}</ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
