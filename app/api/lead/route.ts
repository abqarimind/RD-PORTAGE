/**
 * Lead submission — server-side only (no CRM key ever reaches the client).
 * Validates lead_schema_v1 at the boundary, hashes the IP for the consent
 * register, writes through the reliable CRM queue, triggers the 14-day
 * sequence, and journals the lead_submitted event.
 */
import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crm } from "@/lib/crm";
import { leadSchema, type Lead } from "@/lib/crm/schema";

export const runtime = "nodejs";

const SEQUENCE_ID = "seq14";

const payloadSchema = leadSchema
  .omit({ lead_id: true, created_at: true, schema_version: true, funnel_stage: true, funnel_events: true })
  .extend({
    consent: leadSchema.shape.consent.omit({ ip_hash: true }),
  });

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof payloadSchema>;
  try {
    parsed = payloadSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid payload", details: String(err) }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const now = new Date().toISOString();

  const lead: Lead = leadSchema.parse({
    ...parsed,
    lead_id: randomUUID(),
    schema_version: "lead_schema_v1",
    created_at: now,
    consent: { ...parsed.consent, ip_hash: ipHash },
    funnel_stage: "consideration",
    funnel_events: [{ event: "lead_submitted", timestamp: now }],
  });

  await crm.upsertLead(lead);
  if (lead.consent.marketing_optin) {
    await crm.triggerSequence(lead.lead_id, SEQUENCE_ID);
  }

  return NextResponse.json({ leadId: lead.lead_id });
}
