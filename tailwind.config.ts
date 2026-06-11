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
      maxWidth: { page: "1140px" },
      borderRadius: { DEFAULT: "2px", sm: "2px", md: "2px", lg: "2px" },
      transitionDuration: { DEFAULT: "200ms" },
      transitionTimingFunction: { DEFAULT: "ease-out" },
      letterSpacing: { display: "-0.01em" },
    },
  },
  plugins: [],
};
export default config;
