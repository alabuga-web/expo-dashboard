import { NextResponse } from "next/server";
import { getProcessPayload } from "@/shared/lib/plc-data";

export async function GET() {
  const payload = await getProcessPayload();
  return NextResponse.json(payload);
}
