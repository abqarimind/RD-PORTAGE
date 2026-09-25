/**
 * Les canaux de contact, affichés sous le bouton « Nous contacter » (#16).
 * Téléphone et email toujours ; WhatsApp Business et prise de rendez-vous
 * seulement quand leur variable est renseignée — jamais de lien mort.
 */
import { EMAIL_ENTREPRISE, PHONE_LABEL, RDV_BOOKING_URL, TEL_URL, WHATSAPP_URL } from "@/config/contact";

export function ContactOptions({ className = "mt-2 text-sm text-[#7A8093]" }: { className?: string }) {
  const lien = "font-semibold text-[#0B0D12] underline underline-offset-2";
  return (
    <p className={className}>
      Appelez-nous au{" "}
      <a href={TEL_URL} className={`${lien} tabular-nums`}>
        {PHONE_LABEL}
      </a>
      , écrivez à{" "}
      <a href={`mailto:${EMAIL_ENTREPRISE}`} className={lien}>
        {EMAIL_ENTREPRISE}
      </a>
      {WHATSAPP_URL && (
        <>
          {", "}
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={lien}>
            sur WhatsApp
          </a>
        </>
      )}
      {RDV_BOOKING_URL && (
        <>
          {" ou "}
          <a href={RDV_BOOKING_URL} target="_blank" rel="noopener noreferrer" className={lien}>
            choisissez un créneau
          </a>
        </>
      )}
      .
    </p>
  );
}
