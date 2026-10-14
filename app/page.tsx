import { defaultHeadline } from "@/config/headlines";
import { Landing } from "@/components/landing/Landing";

/**
 * Accueil sans pub reconnue (accès direct, référencement) : variante par
 * défaut. Avec un `utm_content` connu, le middleware sert la variante de la
 * pub à la place (app/v/[variant]).
 */
export default function HomePage() {
  return <Landing headline={defaultHeadline()} />;
}
