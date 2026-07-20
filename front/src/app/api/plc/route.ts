import { NextResponse } from "next/server";
import { getPlcSnapshot, getPlcStatus, PLC_TAG_MAP } from "@/shared/lib/plc-data";

/** Снимок ПЛК + маппинг тегов для Dashboard */
export async function GET() {
  const snap = await getPlcSnapshot();
  const status = snap?.status ?? (await getPlcStatus());

  return NextResponse.json({
    status,
    tags: snap?.tags ?? [],
    mapping: Object.values(PLC_TAG_MAP).map((m) => ({
      tagName: m.tagName,
      label: m.label,
      description: m.description,
      zoneId: m.zoneId,
      equipmentId: m.equipmentId,
      direction: m.direction,
      type: m.type,
      ui: m.ui,
    })),
  });
}
