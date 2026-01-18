import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ErrorBoundary } from "./components";
import "./globals.css";

export const metadata: Metadata = {
  title: "Summer Camp Explorer | FCPA 2026",
  description:
    "Find the perfect summer camp for your child in Fairfax County. Filter by age, location, dates, and activities.",
  openGraph: {
    type: "website",
    url: "https://ffxcamps.searchcradley.com",
    title: "Summer Camp Explorer | Fairfax County 2026",
    description:
      "Find the perfect summer camp for your child. Filter by age, location, dates, and activities.",
    images: [
      {
        url: "https://ffxcamps.searchcradley.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Summer Camp Explorer - Find Fairfax County summer camps for kids with filters for age, location, dates and activities",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Summer Camp Explorer | Fairfax County 2026",
    description:
      "Find the perfect summer camp for your child. Filter by age, location, dates, and activities.",
    images: ["https://ffxcamps.searchcradley.com/og-image.png"],
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
