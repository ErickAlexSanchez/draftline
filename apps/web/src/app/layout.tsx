import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SkipLink } from "../components/SkipLink";
import { PREFS_BOOT } from "../lib/prefs-boot";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Draftline", template: "%s · Draftline" },
  description: "Queue a brief and let the worker write the draft.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
      </head>
      <body>
        <Providers>
          <SkipLink />
          {children}
        </Providers>
      </body>
    </html>
  );
}
