/**
 * Phase-2 adapter stubs — interfaces ready, intentionally not implemented.
 * They throw loudly so a misconfigured CRM_PROVIDER is caught immediately
 * (the queue will then journal the payload: zero lead lost).
 */
import type { CRMAdapter } from "./adapter";

function notImplemented(name: string): CRMAdapter {
  const fail = async () => {
    throw new Error(
      `${name} adapter is a phase-2 stub. Implement lib/crm/${name}.ts following docs/bascule-crm.md before selecting CRM_PROVIDER=${name}.`,
    );
  };
  return {
    name,
    upsertLead: fail,
    appendEvent: fail,
    triggerSequence: fail,
    deleteLead: fail,
    exportCSV: fail as unknown as CRMAdapter["exportCSV"],
  };
}

/** Google Sheet destination (Sheets API, one row per lead). */
export const googleSheetAdapter = notImplemented("google-sheet");

/** Future custom CRM (phase 2 — out of current scope by design). */
export const customCrmAdapter = notImplemented("custom");
