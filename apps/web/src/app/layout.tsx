import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Draftline", template: "%s · Draftline" },
  description: "Queue a brief and let the worker write the draft.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
