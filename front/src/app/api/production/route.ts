import { NextResponse } from "next/server";
import { getProductionPayload } from "@/shared/lib/plc-data";

export async function GET() {
  const payload = await getProductionPayload();
  return NextResponse.json(payload);
}
