import { NextResponse } from "next/server";
import { buildOverviewPayload } from "@/shared/lib/mock/engine";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? "15m";
  const overview = buildOverviewPayload();
  const minutes = range === "5m" ? 5 : range === "60m" ? 60 : 15;

  return NextResponse.json({
    range,
    minutes,
    throughput: overview.trend.throughput,
    cycleTime: overview.trend.cycleTime,
    rejectRate: overview.trend.rejectRate,
  });
}
