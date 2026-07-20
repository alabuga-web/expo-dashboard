import { NextResponse } from "next/server";
import { buildOverviewPayload, getActiveScenarioId, getScenarios, setActiveScenario } from "@/shared/lib/mock/engine";
import type { ScenarioId } from "@/entities/types";

export async function GET() {
  return NextResponse.json({
    active: getActiveScenarioId(),
    scenarios: getScenarios().map((s) => ({ id: s.id, label: s.label })),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const scenarioId = (body.scenarioId ?? "normal") as ScenarioId;
  setActiveScenario(scenarioId);
  return NextResponse.json({
    active: getActiveScenarioId(),
    overview: buildOverviewPayload(),
  });
}
