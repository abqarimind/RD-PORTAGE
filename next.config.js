/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    /**
     * Environnement Vercel du déploiement (« production », « preview »,
     * « development »), figé au build. Il distingue la production des
     * Preview, que NODE_ENV ne sépare pas : les deux valent « production ».
     * Vide hors Vercel (build local, CI). Lu par lib/runtime-env.ts.
     */
    NEXT_PUBLIC_DEPLOY_ENV: process.env.VERCEL_ENV || "",
  },
};
module.exports = nextConfig;
