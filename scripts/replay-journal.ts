/**
 * Replays journal entries marked failed=true against the configured CRM —
 * run after an outage: npx tsx scripts/replay-journal.ts
 */
import { getAdapter } from "../lib/crm";
import { journalRead } from "../lib/crm/journal";
import type { FunnelEvent, Lead } from "../lib/crm/schema";

async function main() {
  const adapter = getAdapter();
  const failed = (await journalRead()).filter((e) => e.failed);
  console.log(`${failed.length} failed entries → replaying against "${adapter.name}"`);
  let ok = 0;
  for (const entry of failed) {
    try {
      if (entry.kind === "upsertLead") await adapter.upsertLead(entry.payload as Lead);
      else if (entry.kind === "appendEvent") {
        const { leadId, event } = entry.payload as { leadId: string; event: FunnelEvent };
        await adapter.appendEvent(leadId, event);
      } else if (entry.kind === "triggerSequence") {
        const { leadId, sequenceId } = entry.payload as { leadId: string; sequenceId: string };
        await adapter.triggerSequence(leadId, sequenceId);
      } else if (entry.kind === "deleteLead") {
        await adapter.deleteLead((entry.payload as { leadId: string }).leadId);
      }
      ok++;
    } catch (err) {
      console.error(`still failing: ${entry.kind} @ ${entry.at}`, err);
    }
  }
  console.log(`${ok}/${failed.length} replayed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
