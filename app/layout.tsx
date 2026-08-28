import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Tracker } from "@/components/Tracker";
import { MetaRouteTracker } from "@/components/MetaRouteTracker";
import { ConsentBanner } from "@/components/ConsentBanner";

export const metadata: Metadata = {
  title: "RD Portage — Calculez votre meilleur taux d'imposition",
  description:
    "Vous payez trop d'impôts sans le savoir. Calculez votre meilleur taux d'imposition en 2 à 3 minutes. Gratuit, sans engagement. Portage salarial 100 % légal, 4 % de frais de gestion.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600&family=IBM+Plex+Sans:wght@400;500&family=Manrope:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
        {PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body>
        <Tracker />
        <MetaRouteTracker />
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}
