import type { Metadata } from "next";
import { Manrope, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/theme-provider";
import { GlobalChat } from "./components/global-chat";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-instrument-sans",
  display: "swap",
});

// fb:app_id requires a Facebook App ID from developers.facebook.com.
// To set up: create a Consumer app, copy the App ID, add to Vercel env
// as NEXT_PUBLIC_FB_APP_ID, then replace the placeholder below.
const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID ?? "000000000000000"

export const metadata: Metadata = {
  metadataBase: new URL("https://peaqhealth.vercel.app"),
  title: "Oravi — We fill in the gaps.",
  description:
    "The first platform connecting your oral microbiome, blood biomarkers, and sleep data into a single longevity score.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Oravi",
  },
  openGraph: {
    title: "Oravi",
    description:
      "The first platform connecting your oral microbiome, blood biomarkers, and sleep data into a single longevity score.",
    url: "https://peaqhealth.vercel.app",
    siteName: "Oravi",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Oravi — Three signals. One measure of resilience.",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oravi",
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
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${instrumentSans.variable}`}>
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
        {/* Runs synchronously before hydration — no theme flicker on return visits.
            - Authenticated app always gets data-theme="light" (unchanged product behavior)
            - Landing reads localStorage and sets data-landing-theme before CSS paints */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;d.setAttribute('data-theme','light');try{var t=localStorage.getItem('peaq-landing-theme');d.setAttribute('data-landing-theme',t==='light'?'light':'dark')}catch(e){d.setAttribute('data-landing-theme','dark')}})()`,
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
