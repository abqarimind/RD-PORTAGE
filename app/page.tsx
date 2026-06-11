/**
 * Landing de capture — single page, imposed section order:
 * hero+diag flash → transparence 3D → Atarhib → Targhib → fondateur →
 * preuve+comparatif → CTA final → footer conformité.
 */
import { HeroDiagnostic } from "@/components/landing/HeroDiagnostic";
import { TransparencySection } from "@/components/landing/TransparencySection";
import {
  AtarhibSection,
  FinalCta,
  FounderSection,
  ProofSection,
  SiteFooter,
  TarghibSection,
} from "@/components/landing/sections";

export default function LandingPage() {
  return (
    <main>
      <HeroDiagnostic />
      <TransparencySection />
      <AtarhibSection />
      <TarghibSection />
      <FounderSection />
      <ProofSection />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}
