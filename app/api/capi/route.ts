/**
 * Meta Conversions API relay — receives a browser event (same event_name +
 * event_id as the Pixel fire) and re-sends it server-side with hashed PII,
 * the client IP, user agent, and fbp/fbc for match quality.
 *
 * No-op (still returns ok) when Meta credentials are unset, so the funnel
 * runs without any tracking configured.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendCapiEvent } from "@/lib/server/capi";

export const runtime = "nodejs";

/** Closed allow-list — mirrors the events fired by lib/tracking/meta.ts. */
const ALLOWED_EVENTS = new Set([
  "PageView",
  "ViewContent",
  "Lead",
  "Schedule",
  "Contact",
  "DiagnosticStart",
  "DiagnosticComplete",
  "SimulateurStart",
  "SimulateurComplete",
]);

const payloadSchema = z.object({
  event_name: z.string().min(1).max(64),
  event_id: z.string().min(1).max(128),
  event_source_url: z.string().url().optional(),
  custom_data: z.record(z.unknown()).optional(),
  user_data: z
    .object({
      em: z.string().optional(),
      ph: z.string().optional(),
      fbp: z.string().optional(),
      fbc: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof payloadSchema>;
  try {
    body = payloadSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }
  if (!ALLOWED_EVENTS.has(body.event_name)) {
    return NextResponse.json({ ok: false, error: "unknown event" }, { status: 400 });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const fbp = body.user_data?.fbp ?? req.cookies.get("_fbp")?.value;
  const fbc = body.user_data?.fbc ?? req.cookies.get("_fbc")?.value;

  const result = await sendCapiEvent({
    eventName: body.event_name,
    eventId: body.event_id,
    eventSourceUrl: body.event_source_url,
    customData: body.custom_data,
    userData: { email: body.user_data?.em, phone: body.user_data?.ph, fbp, fbc, clientIp, userAgent },
  });

  return NextResponse.json({ ok: true, sent: result.sent });
}
