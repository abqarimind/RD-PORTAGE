import type { Metadata } from "next";
import { ConceptC } from "@/components/concepts/ConceptC";

export const metadata: Metadata = {
  title: "Concept C — Variante UI fintech claire (prototype)",
  robots: { index: false, follow: false },
};

export default function ConceptCPage() {
  return <ConceptC />;
}
