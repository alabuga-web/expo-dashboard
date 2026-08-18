import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function plcApiBase(): string {
  return (process.env.PLC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
}

/** Proxy: clear pipeline events/history so Production can track from zero. */
export async function POST() {
  const base = plcApiBase();
  try {
    const res = await fetch(`${base}/api/reset`, {
      method: "POST",
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { status: "error", detail: body?.detail ?? "Reset failed", upstream: res.status },
        { status: res.status },
      );
    }

    // Drop in-process chart rings on this Next server.
    try {
      const { clearLiveRingBuffer } = await import("@/shared/lib/plc-data");
      clearLiveRingBuffer?.();
    } catch {
      /* optional */
    }

    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json(
      { status: "error", detail: e instanceof Error ? e.message : "Reset failed" },
      { status: 502 },
    );
  }
}
