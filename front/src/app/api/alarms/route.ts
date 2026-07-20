import { NextResponse } from "next/server";
import { generateAlarms, getActiveScenarioId } from "@/shared/lib/mock/engine";
import { getScenario } from "@/shared/lib/mock/scenarios";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("active") === "true";
  const scenario = getScenario(getActiveScenarioId());
  const alarms = generateAlarms(scenario);
  return NextResponse.json(activeOnly ? alarms.filter((a) => a.active) : alarms);
}
