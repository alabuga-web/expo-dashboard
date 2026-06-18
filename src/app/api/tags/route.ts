import { NextResponse } from "next/server";
import { getAllTags } from "@/shared/lib/mock/model";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zone = searchParams.get("zone");
  const type = searchParams.get("type");
  const direction = searchParams.get("direction");

  let tags = getAllTags();
  if (zone) tags = tags.filter((t) => t.zoneId === zone);
  if (type) tags = tags.filter((t) => t.type === type);
  if (direction) tags = tags.filter((t) => t.direction === direction);

  return NextResponse.json(tags);
}
