import { NextResponse } from "next/server";
import { getAllTags } from "@/shared/lib/mock/model";
import { getPlcHistory, getPlcTags } from "@/shared/lib/plc-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zone = searchParams.get("zone");
  const type = searchParams.get("type");
  const direction = searchParams.get("direction");
  const source = searchParams.get("source"); // plc | mock | auto
  const historyTag = searchParams.get("history");
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 1000);

  if (historyTag) {
    const points = getPlcHistory(historyTag, limit);
    return NextResponse.json(points);
  }

  const preferPlc = source !== "mock";
  if (preferPlc) {
    const plcTags = await getPlcTags({ zone, type, direction });
    if (plcTags.length > 0) {
      return NextResponse.json(plcTags, {
        headers: { "x-plc-source": "plc" },
      });
    }
    if (source === "plc") {
      return NextResponse.json([], { headers: { "x-plc-source": "unavailable" } });
    }
  }

  let tags = getAllTags();
  if (zone) tags = tags.filter((t) => t.zoneId === zone);
  if (type) tags = tags.filter((t) => t.type === type);
  if (direction) tags = tags.filter((t) => t.direction === direction);

  return NextResponse.json(tags, {
    headers: { "x-plc-source": "mock" },
  });
}
