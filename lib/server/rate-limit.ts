/**
 * Limite de débit en mémoire, par empreinte d'IP (fenêtre glissante).
 *
 * Limite assumée : en serverless, chaque instance a sa propre mémoire. Ce
 * n'est donc pas une barrière absolue, mais cela suffit à arrêter un script
 * qui martèle le formulaire depuis une même adresse, ce qui est le cas
 * courant. Une règle « Rate limiting » du pare-feu Vercel sur /api/lead
 * peut compléter (voir le rapport de la PR).
 */
const hits = new Map<string, number[]>();

export function rateLimited(key: string, { max, windowMs, now = Date.now() }: { max: number; windowMs: number; now?: number }): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  const limited = recent.length >= max;
  if (!limited) recent.push(now);
  hits.set(key, recent);
  // Ménage : la carte ne doit pas grossir sans fin sur une instance chaude.
  if (hits.size > 5_000) {
    for (const [k, ts] of hits) if (ts.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return limited;
}
