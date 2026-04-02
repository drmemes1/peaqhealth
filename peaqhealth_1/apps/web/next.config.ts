import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/peaqhealth\.me\/dashboard/,
      handler: "NetworkFirst" as const,
      options: {
        cacheName: "dashboard-cache",
        expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
      },
    },
    {
      urlPattern: /^https:\/\/peaqhealth\.me\/api\//,
      handler: "NetworkFirst" as const,
      options: {
        cacheName: "api-cache",
        expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$/,
      handler: "CacheFirst" as const,
      options: {
        cacheName: "static-cache",
        expiration: { maxEntries: 100, maxAgeSeconds: 2592000 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  // next-pwa uses webpack; tell Next.js 16 to use webpack for the build
  turbopack: {},
  // Bundle pdfkit font data files for serverless (Vercel)
  outputFileTracingIncludes: {
    "/api/account/export": [
      "./node_modules/pdfkit/js/data/**/*",
      "../../node_modules/pdfkit/js/data/**/*",
    ],
  },
};

export default withPWA(nextConfig);
