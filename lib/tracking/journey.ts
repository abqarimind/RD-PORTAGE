/**
 * Angle d'arrivée du parcours (ex. « lp_b » pour la landing B), mémorisé à la
 * première landing vue de la session. Il accompagne le lead (« page ou angle
 * d'arrivée ») et les objectifs Plausible. Ce n'est qu'un nom d'écran : il ne
 * porte aucune donnée de la personne.
 */
const ANGLE_KEY = "rdp_angle";

export function rememberLandingAngle(angle: string): void {
  try {
    if (!sessionStorage.getItem(ANGLE_KEY)) sessionStorage.setItem(ANGLE_KEY, angle.slice(0, 64));
  } catch {
    /* stockage indisponible : l'angle manquera, rien d'autre */
  }
}

export function getLandingAngle(): string | undefined {
  try {
    return sessionStorage.getItem(ANGLE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
