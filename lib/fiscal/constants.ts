/**
 * Back-compat re-export. The canonical, dated & sourced fiscal config now
 * lives in config/fiscal-2026.ts (spec §4 — single source of truth). This
 * module is kept so existing imports (`@/lib/fiscal/constants`) keep working.
 */
export * from "@/config/fiscal-2026";
