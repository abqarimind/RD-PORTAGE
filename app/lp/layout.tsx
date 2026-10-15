/**
 * Dedicated "ads" layout for paid Meta traffic (anciennes landings /lp/*,
 * réécrites par le middleware vers l'accueil de leur angle, voir
 * components/landing/Landing.tsx). Pas de navigation de site.
 */
export default function LpLayout({ children }: { children: React.ReactNode }) {
  return <div data-traffic="ads">{children}</div>;
}
