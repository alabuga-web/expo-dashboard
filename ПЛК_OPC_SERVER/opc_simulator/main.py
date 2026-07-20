#!/usr/bin/env python3
"""Запуск OPC UA симулятора."""

from __future__ import annotations

import argparse
import asyncio
import logging
import signal
from pathlib import Path

from opc_simulator.server import OpcSimulator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    parser = argparse.ArgumentParser(description="OPC UA PLC Simulator")
    parser.add_argument(
        "--nodeset",
        default="Выставка демо.PLC_2.OPCUA.xml",
        help="Path to NodeSet XML",
    )
    parser.add_argument(
        "--endpoint",
        default="opc.tcp://0.0.0.0:4840",
        help="OPC UA endpoint",
    )
    parser.add_argument(
        "--groups",
        nargs="*",
        default=["inputs", "outputs", "memory"],
        help="Tag groups to expose",
    )
    parser.add_argument("--interval", type=float, default=0.5, help="Update interval (sec)")
    args = parser.parse_args()

    base = Path(__file__).resolve().parent.parent
    nodeset = (base / args.nodeset).resolve()
    groups = {g.lower() for g in args.groups}

    sim = OpcSimulator(nodeset=nodeset, endpoint=args.endpoint, groups=groups)
    await sim.start()

    stop_event = asyncio.Event()

    def _stop(*_: object) -> None:
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _stop)

    updater = asyncio.create_task(sim.update_loop(args.interval))
    await stop_event.wait()

    updater.cancel()
    await sim.stop()
    logger.info("Simulator stopped")


if __name__ == "__main__":
    asyncio.run(main())
