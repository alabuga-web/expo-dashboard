import { NextResponse } from "next/server";
import { buildEquipmentPayload } from "@/shared/lib/mock/engine";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = buildEquipmentPayload(id);
  if (!payload) return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
  return NextResponse.json(payload);
}
