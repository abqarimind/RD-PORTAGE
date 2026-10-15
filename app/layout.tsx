import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Tracker } from "@/components/Tracker";
import { MetaRouteTracker } from "@/components/MetaRouteTracker";
import { ConsentBanner } from "@/components/ConsentBanner";
import { ANALYTICS_ENABLED, ANALYTICS_OPT_OUT_KEY, PLAUSIBLE_SCRIPT_URL } from "@/lib/tracking/analytics";

export const metadata: Metadata = {
  title: "RD Portage — Calculez votre meilleur taux d'imposition",
  description:
    "Vous payez trop d'impôts sans le savoir. Calculez votre meilleur taux d'imposition en 2 à 3 minutes. Gratuit, sans engagement. Portage salarial 100 % légal, 4 % de frais de gestion.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0B0D12" };

/**
 * Initialisation Plausible (extrait officiel du script `pa-…`), plus
 * `transformRequest` : chaque envoi est filtré AVANT de partir —
 *  - appareil exclu par la personne (politique de confidentialité) : rien ne part ;
 *  - URL réduite au chemin et aux UTM ; /dossier part sans aucun paramètre,
 *    son lien porte le récapitulatif (vérifié par e2e/tracking.spec.ts).
 */
const PLAUSIBLE_INIT = `window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
plausible.init({transformRequest:function(p){try{if(localStorage.getItem(${JSON.stringify(ANALYTICS_OPT_OUT_KEY)})==="1")return null}catch(e){}
try{var u=new URL(p.u),k=new URLSearchParams(),x=u.pathname==="/dossier"||u.pathname.indexOf("/dossier/")===0;
if(!x)u.searchParams.forEach(function(v,n){if(/^utm_(source|medium|campaign|content|term)$/.test(n))k.set(n,v)});
u.search=k.toString();u.hash="";p.u=u.toString()}catch(e){}return p}});`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preload" href="/fonts/manrope-latin-wght.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {ANALYTICS_ENABLED && (
          <>
            <Script id="plausible-init" strategy="afterInteractive">
              {PLAUSIBLE_INIT}
            </Script>
            <Script src={PLAUSIBLE_SCRIPT_URL} strategy="afterInteractive" />
          </>
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
