import type { Metadata } from "next";
import { Suspense } from "react";

import { OfflineGate } from "@/components/states";
import { site, SITE_URL } from "@/content/site";

import { nunito } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${site.name} · ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: site.name,
    title: site.name,
    description: site.description,
    images: [{ url: "/brand/steamy_logo.png", width: 995, height: 263, alt: site.name }],
  },
  twitter: { card: "summary", title: site.name, description: site.description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        {/* WX01 : l'URL fixe le registre ; `usePathname()` suspend au prérendu d'une route dynamique. */}
        <Suspense fallback={null}>
          <OfflineGate />
        </Suspense>
      </body>
    </html>
  );
}
