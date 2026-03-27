import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';

import { PostHogProvider } from "@/components/posthog-provider";
import { PostHogUser } from "@/components/posthog-user";
import { env } from "@/lib/env";
import { site } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  alternates: {
    canonical: site.url
  },
  title: {
    default: site.name,
    template: `%s | ${site.name}`
  },
  description: site.description,
  applicationName: site.name,
  icons: {
    icon: [
      { url: "/favicons/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/favicons/icon-256.png", sizes: "256x256", type: "image/png" },
      { url: "/favicons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: ["/favicons/favicon-64.png"],
    apple: [{ url: "/favicons/icon-256.png", sizes: "256x256", type: "image/png" }]
  },
  openGraph: {
    title: site.name,
    description: site.description,
    url: site.url,
    siteName: site.name,
    locale: "en_GB",
    images: [
      {
        url: "/brand/og-1024.png",
        width: 1024,
        height: 1024,
        alt: "Ruksak.ai"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.description,
    images: [
      {
        url: "/brand/og-1024.png",
        alt: "Ruksak.ai"
      }
    ]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <PostHogProvider apiHost={env.posthogHost} apiKey={env.posthogKey}>
            <PostHogUser />
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
