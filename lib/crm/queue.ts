/**
 * Write-through queue: journal first, then CRM call with 3 retries and
 * exponential backoff (500ms, 1s, 2s). If all retries fail the journal entry
 * is marked failed=true so scripts/replay-journal.ts can replay it.
 */
import { journalAppend, type JournalEntry } from "./journal";

const RETRIES = 3;
const BASE_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function reliableWrite(
  kind: JournalEntry["kind"],
  payload: unknown,
  write: () => Promise<void>,
): Promise<{ ok: boolean }> {
  await journalAppend({ kind, at: new Date().toISOString(), payload });

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      await write();
      return { ok: true };
    } catch (err) {
      console.error(`[crm-queue] ${kind} attempt ${attempt}/${RETRIES} failed`, err);
      if (attempt < RETRIES) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  await journalAppend({ kind, at: new Date().toISOString(), payload, failed: true });
  return { ok: false };
}
