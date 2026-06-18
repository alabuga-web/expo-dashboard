import { NextResponse } from "next/server";
import { buildAreaPayload } from "@/shared/lib/mock/engine";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = buildAreaPayload(id);
  if (!payload) return NextResponse.json({ error: "Zone not found" }, { status: 404 });
  return NextResponse.json(payload);
}
