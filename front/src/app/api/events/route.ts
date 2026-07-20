import { NextResponse } from "next/server";
import { generateEvents, getActiveScenarioId } from "@/shared/lib/mock/engine";
import { getScenario } from "@/shared/lib/mock/scenarios";

export async function GET() {
  const scenario = getScenario(getActiveScenarioId());
  return NextResponse.json(generateEvents(scenario, 50));
}
