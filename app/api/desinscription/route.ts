/**
 * Désinscription en un clic depuis les emails (#13). GET pour le lien du
 * corps et de la version texte ; POST pour le désabonnement en un clic des
 * clients mail (RFC 8058), qui appellent la même URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { crm } from "@/lib/crm";
import { verifyUnsubscribe } from "@/lib/email/unsubscribe";

export const runtime = "nodejs";

const page = (titre: string, texte: string) =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titre}</title></head>` +
  `<body style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:64px auto;padding:0 16px;color:#0B0D12">` +
  `<h1 style="font-size:22px">${titre}</h1><p style="font-size:15px;line-height:1.6;color:#4A5061">${texte}</p>` +
  `<p><a href="/" style="color:#0B0D12">Retour au site RD Portage</a></p></body></html>`;

async function traiter(req: NextRequest) {
  const url = new URL(req.url);
  const email = verifyUnsubscribe(url.searchParams.get("e"), url.searchParams.get("s"));
  if (!email) {
    return new NextResponse(page("Lien invalide", "Ce lien de désinscription n'est pas valide. Écrivez-nous à marketing@rdportage.com et nous vous retirerons à la main."), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  const applique = await crm.unsubscribe(email).catch((err) => {
    console.error("[desinscription] échec", JSON.stringify({ email, error: String(err) }));
    return false;
  });
  if (!applique) {
    return new NextResponse(
      page("Demande reçue", "Votre demande est bien reçue. Si vous recevez encore un email de notre part, écrivez-nous à marketing@rdportage.com : nous vous retirerons à la main."),
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
  return new NextResponse(page("Vous êtes désinscrit·e", "Vous ne recevrez plus d'emails de conseil de RD Portage. Votre simulation et votre dossier restent accessibles."), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export const GET = traiter;
export const POST = traiter;
