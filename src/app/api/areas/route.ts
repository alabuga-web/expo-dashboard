import { NextResponse } from "next/server";
import { buildAreasList } from "@/shared/lib/mock/engine";

export async function GET() {
  return NextResponse.json(buildAreasList());
}
