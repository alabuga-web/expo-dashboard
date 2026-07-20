"""Заполнить plc_data.db демо-историей производства Factory I/O.

Сценарий нужен для разработки UI без живой линии:
emit -> vision/color -> sorting -> FX5 pick & place -> warehouse.
"""

from __future__ import annotations

import argparse
import math
import shutil
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
DEFAULT_DB = ROOT / "plc_data.db"


@dataclass(frozen=True)
class TagDef:
    name: str
    address: str
    value_type: str


TAGS: dict[str, TagDef] = {
    "plc_operating_mode": TagDef("plc_operating_mode", "ns=3;s=OperatingMode", "int"),
    "clock_0_5hz": TagDef("clock_0_5hz", 'ns=3;s="Clock_0.5Hz"', "bool"),
    "factory_io_reset": TagDef("factory_io_reset", 'ns=3;s="FACTORY I/O (Reset)"', "bool"),
    "emitter_1_emit": TagDef("emitter_1_emit", 'ns=3;s="Emitter 1 (Emit)"', "bool"),
    "emitter_2_base": TagDef("emitter_2_base", 'ns=3;s="Emitter 2 (Base)"', "int"),
    "emitter_2_part": TagDef("emitter_2_part", 'ns=3;s="Emitter 2 (Part)"', "int"),
    "color": TagDef("color", 'ns=3;s="COLOR"', "int"),
    "vision_sensor_1_value": TagDef("vision_sensor_1_value", 'ns=3;s="Vision Sensor 1 (Value)"', "int"),
    "vision_sensor_2_value": TagDef("vision_sensor_2_value", 'ns=3;s="Vision Sensor 2 (Value)"', "int"),
    "fx3_vision_sensor_3_value": TagDef("fx3_vision_sensor_3_value", 'ns=3;s="FX3 Vision Sensor 3 (Value)"', "int"),
    "fx3_vision_sensor_4_value": TagDef("fx3_vision_sensor_4_value", 'ns=3;s="FX3 Vision Sensor 4 (Value)"', "int"),
    "diffuse_sensor_1": TagDef("diffuse_sensor_1", 'ns=3;s="Diffuse Sensor 1"', "bool"),
    "diffuse_sensor_3": TagDef("diffuse_sensor_3", 'ns=3;s="Diffuse Sensor 3"', "bool"),
    "diffuse_sensor_9": TagDef("diffuse_sensor_9", 'ns=3;s="Diffuse Sensor 9"', "bool"),
    "diffuse_sensor_10": TagDef("diffuse_sensor_10", 'ns=3;s="Diffuse Sensor 10"', "bool"),
    "fx3_diffuse_sensor_2": TagDef("fx3_diffuse_sensor_2", 'ns=3;s="FX3 Diffuse Sensor 2"', "bool"),
    "fx3_diffuse_sensor_8": TagDef("fx3_diffuse_sensor_8", 'ns=3;s="FX3 Diffuse Sensor 8"', "bool"),
    "belt_conveyor_1": TagDef("belt_conveyor_1", 'ns=3;s="Belt Conveyor (2m) 1"', "bool"),
    "belt_conveyor_2": TagDef("belt_conveyor_2", 'ns=3;s="Belt Conveyor (2m) 2"', "bool"),
    "belt_conveyor_3": TagDef("belt_conveyor_3", 'ns=3;s="Belt Conveyor (2m) 3"', "bool"),
    "belt_conveyor_4": TagDef("belt_conveyor_4", 'ns=3;s="Belt Conveyor (2m) 4"', "bool"),
    "belt_conveyor_7": TagDef("belt_conveyor_7", 'ns=3;s="Belt Conveyor 7"', "bool"),
    "belt_conveyor_8": TagDef("belt_conveyor_8", 'ns=3;s="Belt Conveyor 8"', "bool"),
    "fx3_belt_conveyor_3": TagDef("fx3_belt_conveyor_3", 'ns=3;s="FX3 Belt Conveyor 3"', "bool"),
    "fx3_belt_conveyor_4": TagDef("fx3_belt_conveyor_4", 'ns=3;s="FX3 Belt Conveyor 4"', "bool"),
    "fx3_belt_conveyor_5": TagDef("fx3_belt_conveyor_5", 'ns=3;s="FX3 Belt Conveyor 5"', "bool"),
    "fx3_belt_conveyor_6": TagDef("fx3_belt_conveyor_6", 'ns=3;s="FX3 Belt Conveyor 6"', "bool"),
    "fx3_belt_conveyor_7": TagDef("fx3_belt_conveyor_7", 'ns=3;s="FX3 Belt Conveyor 7"', "bool"),
    "fx3_belt_conveyor_8": TagDef("fx3_belt_conveyor_8", 'ns=3;s="FX3 Belt Conveyor 8"', "bool"),
    "pivot_arm_sorter_11_turn": TagDef("pivot_arm_sorter_11_turn", 'ns=3;s="Pivot Arm Sorter 11 Tern"', "bool"),
    "pivot_arm_sorter_22_turn": TagDef("pivot_arm_sorter_22_turn", 'ns=3;s="Pivot Arm Sorter 22 Tern"', "bool"),
    "pivot_arm_sorter_11_belt": TagDef("pivot_arm_sorter_11_belt", 'ns=3;s="Pivot Arm Sorter 11 Belt (+)"', "bool"),
    "pivot_arm_sorter_22_belt": TagDef("pivot_arm_sorter_22_belt", 'ns=3;s="Pivot Arm Sorter 22 Belt (+)"', "bool"),
    "pop_up_wheel_sorter_1_plus": TagDef("pop_up_wheel_sorter_1_plus", 'ns=3;s="Pop Up Wheel Sorter 1 (+)"', "bool"),
    "pop_up_wheel_sorter_1_left": TagDef("pop_up_wheel_sorter_1_left", 'ns=3;s="Pop Up Wheel Sorter 1 (Left)"', "bool"),
    "pop_up_wheel_sorter_1_right": TagDef("pop_up_wheel_sorter_1_right", 'ns=3;s="Pop Up Wheel Sorter 1 (Right)"', "bool"),
    "fx3_pivot_arm_sorter_4_turn": TagDef("fx3_pivot_arm_sorter_4_turn", 'ns=3;s="FX3 Pivot Arm Sorter 4 Turn"', "bool"),
    "fx3_pivot_arm_sorter_4_belt": TagDef("fx3_pivot_arm_sorter_4_belt", 'ns=3;s="FX3 Pivot Arm Sorter 4 Belt (+)"', "bool"),
    "fx3_pivot_arm_sorter_5_turn": TagDef("fx3_pivot_arm_sorter_5_turn", 'ns=3;s="FX3 Pivot Arm Sorter 5 Turn"', "bool"),
    "fx3_pivot_arm_sorter_5_turn_plus": TagDef("fx3_pivot_arm_sorter_5_turn_plus", 'ns=3;s="FX3 Pivot Arm Sorter 5 Turn +"', "bool"),
    "fx5_dis1": TagDef("fx5_dis1", 'ns=3;s="FX5 DIS1"', "bool"),
    "fx5_dis2": TagDef("fx5_dis2", 'ns=3;s="FX5 DIS2"', "bool"),
    "fx5_dis3": TagDef("fx5_dis3", 'ns=3;s="FX5 DIS3"', "bool"),
    "fx5_box_detected": TagDef("fx5_box_detected", 'ns=3;s="FX5 Pick & Place 1 (Box Detected)"', "bool"),
    "fx5_conv1": TagDef("fx5_conv1", 'ns=3;s="FX5 CONV1"', "bool"),
    "fx5_curved_roller_conveyor_1_cw": TagDef("fx5_curved_roller_conveyor_1_cw", 'ns=3;s="FX5 Curved Roller Conveyor 1 CW"', "bool"),
    "fx5_roller_conveyor_2m_1": TagDef("fx5_roller_conveyor_2m_1", 'ns=3;s="FX5 Roller Conveyor (2m) 1"', "bool"),
    "fx5_roller_conveyor_4m_1": TagDef("fx5_roller_conveyor_4m_1", 'ns=3;s="FX5 Roller Conveyor (4m) 1"', "bool"),
    "fx5_roller_conveyor_6m_1": TagDef("fx5_roller_conveyor_6m_1", 'ns=3;s="FX5 Roller Conveyor (6m) 1"', "bool"),
    "fx5_pick_place_grab": TagDef("fx5_pick_place_grab", 'ns=3;s="FX5 Pick & Place 1 (Grab)"', "bool"),
    "fx5_pick_place_x_position": TagDef("fx5_pick_place_x_position", 'ns=3;s="FX5 Pick & Place 1 X Position (V)"', "float"),
    "fx5_pick_place_y_position": TagDef("fx5_pick_place_y_position", 'ns=3;s="FX5 Pick & Place 1 Y Position (V)"', "float"),
    "fx5_pick_place_z_position": TagDef("fx5_pick_place_z_position", 'ns=3;s="FX5 Pick & Place 1 Z Position (V)"', "float"),
    "fx5_pick_place_x_setpoint": TagDef("fx5_pick_place_x_setpoint", 'ns=3;s="FX5 Pick & Place 1 X Set Point (V)"', "float"),
    "fx5_pick_place_y_setpoint": TagDef("fx5_pick_place_y_setpoint", 'ns=3;s="FX5 Pick & Place 1 Y Set Point(V)"', "float"),
    "fx5_pick_place_z_setpoint": TagDef("fx5_pick_place_z_setpoint", 'ns=3;s="FX5 Pick & Place 1 Z Set Point (V)"', "float"),
}


def serialize(value: Any, value_type: str) -> str:
    if value_type == "bool":
        return "ON" if bool(value) else "OFF"
    if value_type == "float":
        return f"{float(value):.4f}".rstrip("0").rstrip(".")
    return str(int(value))


def smoothstep(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def interp(a: float, b: float, x: float) -> float:
    return a + (b - a) * smoothstep(x)


def arm_position(phase: int) -> tuple[float, float, float, float, float, float, bool, bool]:
    """Return x, y, z, sx, sy, sz, grab, box."""
    # 20-секундный цикл: взять на 0/2/8, переложить на 10/8/2.
    points = [
        (0, (0.0, 2.0, 8.0), False, False),
        (4, (0.0, 2.0, 2.0), False, True),
        (6, (0.0, 2.0, 2.0), True, True),
        (12, (10.0, 8.0, 8.0), True, True),
        (16, (10.0, 8.0, 2.0), True, True),
        (18, (10.0, 8.0, 2.0), False, False),
        (20, (0.0, 2.0, 8.0), False, False),
    ]
    for idx, (start_t, start_p, grab, box) in enumerate(points[:-1]):
        end_t, end_p, _, _ = points[idx + 1]
        if start_t <= phase <= end_t:
            k = (phase - start_t) / max(end_t - start_t, 1)
            x = interp(start_p[0], end_p[0], k)
            y = interp(start_p[1], end_p[1], k)
            z = interp(start_p[2], end_p[2], k)
            sx, sy, sz = end_p
            return x, y, z, sx, sy, sz, grab, box
    x, y, z = points[0][1]
    return x, y, z, x, y, z, False, False


def build_values(second: int) -> dict[str, Any]:
    colors = [1, 4, 7, 1, 4, 1, 7, 4]
    cycle = 18
    phase = second % cycle
    part_idx = second // cycle
    vision = colors[part_idx % len(colors)]
    active_vision = vision if 5 <= phase <= 8 else 0
    active_fx3 = vision if 10 <= phase <= 13 else 0
    x, y, z, sx, sy, sz, grab, box = arm_position(second % 20)
    pulse = lambda start, end: start <= phase <= end

    return {
        "plc_operating_mode": 8,
        "clock_0_5hz": (second % 2) == 0,
        "factory_io_reset": False,
        "emitter_1_emit": phase in (0, 1),
        "emitter_2_base": vision,
        "emitter_2_part": vision,
        "color": active_vision,
        "vision_sensor_1_value": active_vision,
        "vision_sensor_2_value": active_vision if phase in (7, 8) else 0,
        "fx3_vision_sensor_3_value": active_fx3,
        "fx3_vision_sensor_4_value": active_fx3 if phase in (12, 13) else 0,
        "diffuse_sensor_1": pulse(1, 3),
        "diffuse_sensor_3": pulse(4, 6),
        "diffuse_sensor_9": pulse(8, 10),
        "diffuse_sensor_10": pulse(12, 14),
        "fx3_diffuse_sensor_2": pulse(9, 11),
        "fx3_diffuse_sensor_8": pulse(13, 15),
        "belt_conveyor_1": True,
        "belt_conveyor_2": True,
        "belt_conveyor_3": True,
        "belt_conveyor_4": True,
        "belt_conveyor_7": True,
        "belt_conveyor_8": True,
        "fx3_belt_conveyor_3": True,
        "fx3_belt_conveyor_4": True,
        "fx3_belt_conveyor_5": True,
        "fx3_belt_conveyor_6": True,
        "fx3_belt_conveyor_7": True,
        "fx3_belt_conveyor_8": True,
        "pivot_arm_sorter_11_turn": vision == 1 and pulse(9, 11),
        "pivot_arm_sorter_22_turn": vision == 4 and pulse(9, 11),
        "pivot_arm_sorter_11_belt": vision == 1 and pulse(10, 12),
        "pivot_arm_sorter_22_belt": vision == 4 and pulse(10, 12),
        "pop_up_wheel_sorter_1_plus": pulse(13, 16),
        "pop_up_wheel_sorter_1_left": vision == 1 and pulse(14, 16),
        "pop_up_wheel_sorter_1_right": vision == 4 and pulse(14, 16),
        "fx3_pivot_arm_sorter_4_turn": vision == 7 and pulse(10, 12),
        "fx3_pivot_arm_sorter_4_belt": vision == 7 and pulse(11, 13),
        "fx3_pivot_arm_sorter_5_turn": vision == 4 and pulse(12, 14),
        "fx3_pivot_arm_sorter_5_turn_plus": vision == 1 and pulse(12, 14),
        "fx5_dis1": box or pulse(2, 5),
        "fx5_dis2": pulse(7, 11),
        "fx5_dis3": pulse(14, 17),
        "fx5_box_detected": box,
        "fx5_conv1": True,
        "fx5_curved_roller_conveyor_1_cw": True,
        "fx5_roller_conveyor_2m_1": True,
        "fx5_roller_conveyor_4m_1": True,
        "fx5_roller_conveyor_6m_1": True,
        "fx5_pick_place_grab": grab,
        "fx5_pick_place_x_position": x + math.sin(second / 5) * 0.03,
        "fx5_pick_place_y_position": y + math.cos(second / 6) * 0.03,
        "fx5_pick_place_z_position": z,
        "fx5_pick_place_x_setpoint": sx,
        "fx5_pick_place_y_setpoint": sy,
        "fx5_pick_place_z_setpoint": sz,
    }


def init_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            source TEXT NOT NULL,
            tag_name TEXT NOT NULL,
            tag_address TEXT,
            value_text TEXT NOT NULL,
            value_type TEXT
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_readings_ts ON readings (ts)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_readings_tag ON readings (tag_name, ts)")
    conn.commit()


def seed(db_path: Path, minutes: int, backup: bool) -> int:
    if backup and db_path.exists():
        backup_path = db_path.with_suffix(db_path.suffix + ".bak")
        shutil.copy2(db_path, backup_path)
        print(f"Backup: {backup_path}")

    conn = sqlite3.connect(db_path)
    init_schema(conn)
    conn.execute("DELETE FROM readings")
    conn.execute("DELETE FROM sqlite_sequence WHERE name = 'readings'")

    start = datetime.now(timezone.utc).replace(microsecond=0) - timedelta(minutes=minutes)
    rows = []
    for second in range(minutes * 60):
        ts = (start + timedelta(seconds=second)).isoformat()
        values = build_values(second)
        for name, tag in TAGS.items():
            value = values[name]
            rows.append(
                (
                    ts,
                    "opc",
                    tag.name,
                    tag.address,
                    serialize(value, tag.value_type),
                    tag.value_type,
                )
            )

    conn.executemany(
        """
        INSERT INTO readings (ts, source, tag_name, tag_address, value_text, value_type)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        rows,
    )
    conn.commit()
    conn.close()
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo Factory I/O production readings.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--minutes", type=int, default=10)
    parser.add_argument("--no-backup", action="store_true")
    args = parser.parse_args()

    count = seed(args.db.resolve(), args.minutes, not args.no_backup)
    print(f"Inserted {count} rows into {args.db.resolve()}")


if __name__ == "__main__":
    main()
