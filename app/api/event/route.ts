/**
 * Funnel event journaling onto an existing lead (closed taxonomy).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crm } from "@/lib/crm";
import { funnelEventSchema } from "@/lib/crm/schema";

export const runtime = "nodejs";

const payloadSchema = z.object({
  leadId: z.string().uuid(),
  event: funnelEventSchema.shape.event,
  timestamp: z.string().datetime(),
  metadata: funnelEventSchema.shape.metadata,
});

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof payloadSchema>;
  try {
    parsed = payloadSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "invalid payload", details: String(err) }, { status: 400 });
  }
  await crm.appendEvent(parsed.leadId, {
    event: parsed.event,
    timestamp: parsed.timestamp,
    metadata: parsed.metadata,
  });
  return NextResponse.json({ ok: true });
}
