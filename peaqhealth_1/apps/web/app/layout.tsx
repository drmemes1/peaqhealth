import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import { GlobalChat } from "./components/global-chat";

// fb:app_id requires a Facebook App ID from developers.facebook.com.
// To set up: create a Consumer app, copy the App ID, add to Vercel env
// as NEXT_PUBLIC_FB_APP_ID, then replace the placeholder below.
const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID ?? "000000000000000"

export const metadata: Metadata = {
  metadataBase: new URL("https://peaqhealth.me"),
  title: "Peaq Health — Reach for the peaq.",
  description:
    "The first platform connecting your oral microbiome, blood biomarkers, and sleep data into a single longevity score.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Peaq",
  },
  openGraph: {
    title: "Peaq Health",
    description:
      "The first platform connecting your oral microbiome, blood biomarkers, and sleep data into a single longevity score.",
    url: "https://peaqhealth.me",
    siteName: "Peaq Health",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Peaq — Three signals. One measure of resilience.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Peaq Health",
    description:
      "The first platform connecting your oral microbiome, blood biomarkers, and sleep data into a single longevity score.",
    images: ["/og-image.png"],
  },
  other: {
    "fb:app_id": FB_APP_ID,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#141410" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Instrument+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){document.documentElement.setAttribute('data-theme','light')})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <GlobalChat />
        </ThemeProvider>
      </body>
    </html>
  );
}
