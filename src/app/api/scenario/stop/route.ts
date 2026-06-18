import { NextResponse } from "next/server";
import { setActiveScenario } from "@/shared/lib/mock/engine";

export async function POST() {
  setActiveScenario("normal");
  return NextResponse.json({ active: "normal" });
}
