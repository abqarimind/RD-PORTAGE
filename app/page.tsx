import { LandingC } from "@/components/lp/LandingC";

/**
 * Page d'accueil du site : on affiche la landing validée (design clair
 * moderne), angle B « vrai net » par défaut, avec la navigation du site.
 * L'ancienne home (design sombre, components/landing/*) est retirée du
 * public — remplacée par cette landing. Indexable (pas de noindex ici,
 * contrairement à /lp/* qui sont des destinations d'annonces).
 */
export default function HomePage() {
  return <LandingC angle="b" variant="flash" showNav />;
}
