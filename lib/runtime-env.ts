/**
 * Environnement de déploiement, côté navigateur comme côté serveur.
 *
 * NODE_ENV vaut « production » sur la production ET sur chaque Preview Vercel :
 * il ne suffit pas à couper le Pixel Meta ou la mesure d'audience hors
 * production. VERCEL_ENV le fait ; next.config.js le fige au build sous
 * NEXT_PUBLIC_DEPLOY_ENV (vide hors Vercel : build local, CI).
 */
export const DEPLOY_ENV = process.env.NEXT_PUBLIC_DEPLOY_ENV ?? "";

export const isProductionDeploy = (deployEnv: string = DEPLOY_ENV): boolean => deployEnv === "production";
