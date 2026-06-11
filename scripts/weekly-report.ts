/**
 * Weekly KPI report — Markdown output structured by funnel act, emailed to
 * the client via Brevo transactional (or printed to stdout when no key).
 * Run: npm run report:weekly
 * Data source: the NDJSON journal (single source available without CRM keys);
 * once Brevo/Airtable are wired, swap the reader for adapter exports.
 */
import { journalRead } from "../lib/crm/journal";
import type { FunnelEventName, Lead } from "../lib/crm/schema";

const CAC_TARGET = { low: 400, high: 800 };

async function main() {
  const entries = await journalRead();
  const since = Date.now() - 7 * 24 * 3600 * 1000;
  const recent = entries.filter((e) => new Date(e.at).getTime() >= since);

  const leads = recent
    .filter((e) => e.kind === "upsertLead")
    .map((e) => e.payload as Lead);
  const events = recent
    .filter((e) => e.kind === "appendEvent")
    .map((e) => (e.payload as { event: { event: FunnelEventName } }).event.event);

  const count = (name: FunnelEventName) =>
    events.filter((e) => e === name).length +
    leads.flatMap((l) => l.funnel_events).filter((ev) => ev.event === name).length;

  const bySource = new Map<string, number>();
  for (const lead of leads) {
    bySource.set(lead.attribution.lead_source, (bySource.get(lead.attribution.lead_source) ?? 0) + 1);
  }

  const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)} %` : "—");
  const pageViews = count("page_view");
  const diagDone = count("diag_completed");
  const simDone = count("sim_completed");
  const leadsCount = leads.length;
  const rdv = count("rdv_booked");
  const calls = count("call_done");
  const signed = count("signe");

  const report = `# Rapport hebdo funnel RD Portage — ${new Date().toISOString().slice(0, 10)}

## Acte 1 — INTÉRÊT
| Étape | Volume | Conversion |
|---|---|---|
| Visiteurs (page_view) | ${pageViews} | — |
| Diagnostics flash complétés | ${diagDone} | ${pct(diagDone, pageViews)} |

## Acte 2 — CONSIDÉRATION
| Étape | Volume | Conversion |
|---|---|---|
| Simulations complétées | ${simDone} | ${pct(simDone, diagDone)} |
| Leads capturés | ${leadsCount} | ${pct(leadsCount, simDone)} |

## Acte 3 — DÉCISION
| Étape | Volume | Conversion |
|---|---|---|
| RDV réservés | ${rdv} | ${pct(rdv, leadsCount)} |
| Calls réalisés (saisie manuelle) | ${calls} | ${pct(calls, rdv)} |
| Signatures (saisie manuelle) | ${signed} | ${pct(signed, calls)} |

## Répartition par source
${[...bySource.entries()].map(([s, n]) => `- ${s} : ${n}`).join("\n") || "- aucune donnée"}

## Coût implicite vs CAC cible
CAC cible : ${CAC_TARGET.low}–${CAC_TARGET.high} €. Renseigner les dépenses média de la
semaine pour calculer le CAC réel (dépenses / signatures).
`;

  console.log(report);

  const key = process.env.BREVO_API_KEY;
  const to = process.env.REPORT_EMAIL_TO;
  if (key && to) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        sender: { name: "Funnel RD Portage", email: process.env.REPORT_EMAIL_FROM ?? "noreply@rdportage.com" },
        to: [{ email: to }],
        subject: `Rapport hebdo funnel — ${new Date().toISOString().slice(0, 10)}`,
        textContent: report,
      }),
    });
    console.log(res.ok ? "Report emailed." : `Brevo error ${res.status}: ${await res.text()}`);
  } else {
    console.log("(BREVO_API_KEY / REPORT_EMAIL_TO not set — stdout only.)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
