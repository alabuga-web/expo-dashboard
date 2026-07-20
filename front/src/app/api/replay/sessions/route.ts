import { NextResponse } from "next/server";
import { REPLAY_SESSIONS } from "@/shared/lib/mock/generators";

export async function GET() {
  return NextResponse.json(REPLAY_SESSIONS);
}
