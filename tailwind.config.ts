import type { Config } from "tailwindcss";

/**
 * Brand lock "TRIBUNAL FISCAL" — exhaustive palette, no default Tailwind
 * colors may appear in the final render.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#FFFFFF",
      black: "#000000",
      nuit: "#0E1B33", // primary background
      laiton: "#B08D57", // accents, secondary CTAs, rules
      creme: "#F4EFE6", // light backgrounds, text on nuit
      encre: "#1A1A1A", // text on creme
      valide: "#2F6B4F", // single validation green (simulator results only)
    },
    extend: {
      fontFamily: {
        display: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      /**
       * LARGEURS — un système nommé plutôt que des valeurs au cas par cas.
       * Les trois valeurs reprennent exactement celles déjà en place
       * (max-w-page 1140, max-w-3xl 768, max-w-2xl 672) : aucun changement
       * visuel, mais l'intention devient lisible et partagée.
       */
      maxWidth: {
        page: "1140px", // sections pleine largeur (landings, pied de page)
        reading: "768px", // lecture longue (dossier)
        form: "672px", // formulaire en une colonne (simulateur)
      },
      /**
       * RYTHME VERTICAL — les sections employaient py-12, py-14, pt-8 md:pt-12
       * sans rythme commun. Ces jetons donnent une seule échelle, déclinée par
       * palier, pour que le site se lise comme un seul produit.
       */
      spacing: {
        section: "3rem", // 48px — rythme téléphone
        "section-md": "3.5rem", // 56px — tablette
        "section-lg": "4.5rem", // 72px — desktop
      },
      borderRadius: { DEFAULT: "2px", sm: "2px", md: "2px", lg: "2px" },
      transitionDuration: { DEFAULT: "200ms" },
      transitionTimingFunction: { DEFAULT: "ease-out" },
      letterSpacing: { display: "-0.01em" },
    },
  },
  plugins: [],
};
export default config;
