/**
 * Local NDJSON journal — the zero-lead-loss guarantee. EVERY write is
 * journaled BEFORE the CRM call; if the CRM API is down after retries, the
 * lead still exists here and can be replayed (scripts/replay-journal.ts).
 * On serverless (Vercel) the filesystem is ephemeral: the journal then acts
 * as a request-scoped safety net and the queue's retries are the primary
 * guarantee — for production, point JOURNAL_DIR at a mounted volume or
 * replace with a durable store (see docs/bascule-crm.md §4).
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Sur Vercel, seul /tmp est inscriptible : le dossier du projet
 * (/var/task) est en lecture seule, et chaque écriture du journal y échouait
 * (`ENOENT mkdir '/var/task/data'`, 18 erreurs entre le 07 et le 14/10).
 * /tmp reste éphémère : le journal y protège la requête en cours, pas plus.
 */
const JOURNAL_DIR = process.env.JOURNAL_DIR ?? (process.env.VERCEL ? path.join(tmpdir(), "rdp-journal") : path.join(process.cwd(), "data"));
const JOURNAL_FILE = path.join(JOURNAL_DIR, "leads-fallback.ndjson");

export interface JournalEntry {
  kind: "upsertLead" | "appendEvent" | "triggerSequence" | "deleteLead";
  at: string;
  payload: unknown;
  /** Set when the CRM write ultimately failed — replay targets these. */
  failed?: boolean;
}

export async function journalAppend(entry: JournalEntry): Promise<void> {
  try {
    await mkdir(JOURNAL_DIR, { recursive: true });
    await appendFile(JOURNAL_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    // Last resort: never throw from the journal, log loudly instead.
    console.error("[crm-journal] write failed", err);
  }
}

export async function journalRead(): Promise<JournalEntry[]> {
  try {
    const raw = await readFile(JOURNAL_FILE, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as JournalEntry);
  } catch {
    return [];
  }
}
