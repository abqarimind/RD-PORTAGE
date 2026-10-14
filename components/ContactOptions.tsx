"use client";

/**
 * Les canaux de contact, affichés sous le bouton « Nous contacter » (#16).
 * Téléphone et email toujours ; WhatsApp Business et prise de rendez-vous
 * seulement quand leur variable est renseignée — jamais de lien mort.
 */
import { EMAIL_ENTREPRISE, PHONE_LABEL, RDV_BOOKING_URL, TEL_URL, WHATSAPP_URL } from "@/config/contact";
import { trackContact } from "@/lib/tracking/analytics";

export function ContactOptions({
  className = "mt-2 text-sm text-[#5E6475]",
  tu = false,
}: {
  className?: string;
  /** Tutoiement dans le parcours (14/10), vouvoiement dans le dossier envoyé par e-mail. */
  tu?: boolean;
}) {
  const lien = "font-semibold text-[#0B0D12] underline underline-offset-2";
  return (
    <p className={className}>
      {tu ? "Appelle-nous au" : "Appelez-nous au"}{" "}
      <a href={TEL_URL} onClick={() => trackContact("contact_options_tel")} className={`${lien} tabular-nums`}>
        {PHONE_LABEL}
      </a>
      {tu ? ", écris à" : ", écrivez à"}{" "}
      <a href={`mailto:${EMAIL_ENTREPRISE}`} onClick={() => trackContact("contact_options_email")} className={lien}>
        {EMAIL_ENTREPRISE}
      </a>
      {WHATSAPP_URL && (
        <>
          {", "}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackContact("contact_options_whatsapp")}
            className={lien}
          >
            sur WhatsApp
          </a>
        </>
      )}
      {RDV_BOOKING_URL && (
        <>
          {" ou "}
          <a href={RDV_BOOKING_URL} target="_blank" rel="noopener noreferrer" className={lien}>
            {tu ? "choisis un créneau" : "choisissez un créneau"}
          </a>
        </>
      )}
      .
    </p>
  );
}
