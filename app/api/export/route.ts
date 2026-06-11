/**
 * Transition CSV export for Linda's current Excel workflow.
 * Protected by a shared token: GET /api/export?token=EXPORT_TOKEN
 * (set EXPORT_TOKEN in env; route disabled when unset).
 */
import { NextRequest, NextResponse } from "next/server";
import { crm } from "@/lib/crm";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const expected = process.env.EXPORT_TOKEN;
  const token = req.nextUrl.searchParams.get("token");
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const csv = await crm.exportCSV();
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leads-rdportage-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
