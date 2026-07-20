import { NextResponse } from "next/server";
import { buildEquipmentPayload } from "@/shared/lib/mock/engine";
import { getPlcHistory, getPlcSnapshot, getPlcTagsForEquipment } from "@/shared/lib/plc-data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = buildEquipmentPayload(id);
  if (!payload) return NextResponse.json({ error: "Equipment not found" }, { status: 404 });

  const plc = await getPlcSnapshot();
  if (plc) {
    const plcTags = getPlcTagsForEquipment(id, plc.tags);
    if (plcTags.length > 0) {
      payload.tags = plcTags;

      if (id === "EQ_Z04_PP") {
        const pos = getPlcHistory("fx5_pick_place_x_position", 60);
        const set = getPlcHistory("fx5_pick_place_x_setpoint", 60);
        payload.trend = pos.length ? pos : payload.trend;
        payload.trendLabel = "Pick & Place X: позиция / уставка";
        // если есть setpoint — можно отдать позицию; detail рисует один ряд
        if (set.length && !pos.length) payload.trend = set;

        const dis = plcTags.find((t) => t.name === "fx5_dis1");
        payload.equipment = {
          ...payload.equipment,
          status: dis?.value === true ? "running" : "idle",
        };
        payload.interlocks = [
          { name: "FX5 DIS1 (деталь на позиции)", satisfied: dis?.value === true },
          {
            name: "ПЛК в RUN",
            satisfied: plc.status.operatingMode === 8 || plc.status.operatingMode === 9,
          },
          { name: "Heartbeat OPC", satisfied: plc.status.heartbeatAlive },
          { name: "Сброс Factory I/O не активен", satisfied: true },
        ];
      }

      if (id === "EQ_Z02_CONV") {
        const run = plcTags.find((t) => t.name === "belt_conveyor_1");
        payload.equipment = {
          ...payload.equipment,
          status: run?.value === true ? "running" : "idle",
        };
      }

      if (id === "EQ_Z01_PE") {
        const pe = plcTags.find((t) => t.name === "diffuse_sensor_1");
        payload.equipment = {
          ...payload.equipment,
          status: pe?.value === true ? "running" : "idle",
        };
      }

      if (id === "EQ_PLC") {
        payload.equipment = {
          ...payload.equipment,
          status: plc.status.lineStatus === "running" ? "running" : plc.status.lineStatus === "alarm" ? "fault" : "idle",
        };
        payload.stateMachine = {
          current: plc.status.operatingModeLabel,
          states: ["Stop", "Startup", "Run", "Halt", "Defective"],
          transitions: ["Stop → Startup → Run", "Run → Halt / Stop", "любой → Defective"],
        };
      }
    }
  }

  return NextResponse.json(payload);
}
