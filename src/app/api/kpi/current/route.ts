import { NextResponse } from "next/server";
import { buildOverviewPayload } from "@/shared/lib/mock/engine";

export async function GET() {
  const overview = buildOverviewPayload();
  return NextResponse.json({
    oee: overview.oee,
    availability: overview.availability,
    performance: overview.performance,
    quality: overview.quality,
    throughputPerMin: overview.throughputPerMin,
    producedTotal: overview.producedTotal,
  });
}
