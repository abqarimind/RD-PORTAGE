/**
 * Continuité pub → page (14/10) : choisit la variante d'accueil d'après
 * `utm_content` et RÉÉCRIT la requête vers la page statique /v/<clé>.
 * L'adresse affichée ne change pas (UTM et fbclid restent dans l'URL, donc
 * captés par lib/tracking/utm.ts), et la page reste servie depuis le CDN.
 *
 * Sans annonce reconnue, « / » sert la variante par défaut (app/page.tsx).
 * Les anciennes landings /lp/a|b|c gardent leur angle, sauf si l'annonce en
 * indique un autre : c'est la promesse de la pub qui prime.
 */
import { NextResponse, type NextRequest } from "next/server";
import { headlineForAd, LP_ANGLE_TO_HEADLINE } from "@/config/headlines";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const fromAd = headlineForAd(searchParams.get("utm_content"));
  const key = fromAd?.key ?? (pathname.startsWith("/lp/") ? LP_ANGLE_TO_HEADLINE[pathname.slice(4)] : undefined);
  if (!key) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/v/${key}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: ["/", "/lp/:angle"] };
