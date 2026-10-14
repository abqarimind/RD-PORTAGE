"use client";

/** Lien tel: mesuré (contact_click Plausible, Contact Meta après consentement). */
import { trackContact } from "@/lib/tracking/analytics";
import { PHONE_E164 } from "@/config/contact";

export function TelLink({ from, className, children }: { from: string; className?: string; children: React.ReactNode }) {
  return (
    <a href={`tel:${PHONE_E164}`} onClick={() => trackContact(from)} className={className}>
      {children}
    </a>
  );
}
