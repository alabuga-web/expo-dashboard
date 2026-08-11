import { NextResponse } from "next/server";
import { getProcessPayload } from "@/shared/lib/plc-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const payload = await getProcessPayload();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
