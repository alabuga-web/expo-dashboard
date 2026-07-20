import { NextResponse } from "next/server";
import { buildOverviewPayload } from "@/shared/lib/mock/engine";
import { getPlcSnapshot } from "@/shared/lib/plc-data";

export async function GET() {
  const payload = buildOverviewPayload();
  const plc = await getPlcSnapshot();

  if (plc) {
    const byName = new Map(plc.tags.map((t) => [t.name, t]));
    const conveyorOn = byName.get("belt_conveyor_1")?.value === true;
    const sensorOn = byName.get("diffuse_sensor_1")?.value === true;

    payload.lineStatus = plc.status.lineStatus;
    payload.visitorExplanation =
      plc.status.source === "db-replay"
        ? `ПЛК replay: ${plc.status.operatingModeLabel} · конвейер ${conveyorOn ? "ON" : "OFF"} · датчик ${sensorOn ? "ON" : "OFF"}`
        : `ПЛК live: ${plc.status.operatingModeLabel} · heartbeat ${plc.status.heartbeatAlive ? "OK" : "LOSS"}`;

    payload.processFlow = payload.processFlow.map((node) => {
      if (node.zoneId === "Z01") {
        return {
          ...node,
          status: plc.status.lineStatus === "running" ? (sensorOn ? "running" : "idle") : node.status,
        };
      }
      if (node.zoneId === "Z02") {
        return {
          ...node,
          status: conveyorOn ? "running" : "idle",
        };
      }
      if (node.zoneId === "Z04") {
        const dis = byName.get("fx5_dis1")?.value === true;
        return { ...node, status: dis ? "running" : "idle" };
      }
      return node;
    });
  }

  return NextResponse.json(payload);
}
