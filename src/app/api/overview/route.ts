import { NextResponse } from "next/server";
import { buildOverviewPayload } from "@/shared/lib/mock/engine";

export async function GET() {
  return NextResponse.json(buildOverviewPayload());
}
