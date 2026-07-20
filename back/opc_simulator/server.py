"""OPC UA сервер-симулятор на базе NodeSet XML."""

from __future__ import annotations

import asyncio
import logging
import math
import random
from dataclasses import dataclass, field
from pathlib import Path

from asyncua import Server, ua

from shared.opc_xml import OpcNode, parse_opcua_xml

logger = logging.getLogger(__name__)

NS_URI = "http://www.siemens.com/simatic-s7-opcua"
NS_INDEX = 3

DT_DEFAULTS: dict[str, object] = {
    "i=1": False,
    "i=3": 0,
    "i=4": 0,
    "i=6": 0,
    "i=10": 0.0,
    "i=12": "",
    "ns=3;i=3001": 0,
    "ns=3;i=3006": 0,
}


def _parse_node_id(node_id: str) -> ua.NodeId:
    return ua.NodeId.from_string(node_id)


def _variant_type(data_type: str) -> ua.VariantType:
    mapping = {
        "i=1": ua.VariantType.Boolean,
        "i=3": ua.VariantType.Byte,
        "i=4": ua.VariantType.Int16,
        "i=6": ua.VariantType.Int32,
        "i=10": ua.VariantType.Float,
        "i=12": ua.VariantType.String,
        "ns=3;i=3001": ua.VariantType.Byte,
        "ns=3;i=3006": ua.VariantType.UInt32,
    }
    return mapping.get(data_type, ua.VariantType.Int32)


@dataclass
class SimVariable:
    node: OpcNode
    opc_node: object
    counter: int = 0
    phase: float = field(default_factory=lambda: random.random() * math.pi * 2)


class OpcSimulator:
    def __init__(
        self,
        nodeset: Path,
        endpoint: str = "opc.tcp://0.0.0.0:4840",
        groups: set[str] | None = None,
    ) -> None:
        self._nodeset = nodeset
        self._endpoint = endpoint
        self._groups = groups
        self._server = Server()
        self._variables: list[SimVariable] = []

    async def start(self) -> None:
        await self._server.init()
        self._server.set_endpoint(self._endpoint)
        self._server.set_server_name("PLC_2 Simulator")

        await self._server.register_namespace(NS_URI)
        await self._build_address_space()
        await self._server.start()
        logger.info("OPC Simulator started at %s (%d tags)", self._endpoint, len(self._variables))

    async def stop(self) -> None:
        await self._server.stop()

    async def _build_address_space(self) -> None:
        nodes = parse_opcua_xml(self._nodeset, self._groups)
        objects = self._server.nodes.objects

        folders: dict[str, object] = {}
        for folder_name in ("Inputs", "Outputs", "Memory", "PLC"):
            folder_id = ua.NodeId(folder_name, NS_INDEX)
            try:
                folders[folder_name.lower()] = await objects.add_object(folder_id, folder_name)
            except ua.UaStatusCodeError:
                folders[folder_name.lower()] = self._server.get_node(folder_id)

        group_folder = {
            "inputs": "inputs",
            "outputs": "outputs",
            "memory": "memory",
            "plc": "plc",
        }

        for node in nodes:
            parent_key = group_folder.get(node.group, "plc")
            parent = folders.get(parent_key, objects)
            default = DT_DEFAULTS.get(node.data_type, 0)
            vtype = _variant_type(node.data_type)
            node_id = _parse_node_id(node.node_id)

            try:
                var = await parent.add_variable(node_id, node.name, default, vtype)
                await var.set_writable()
                self._variables.append(SimVariable(node=node, opc_node=var))
            except ua.UaStatusCodeError as error:
                logger.warning("Skip %s: %s", node.name, error)

    async def update_loop(self, interval: float = 0.5) -> None:
        tick = 0
        while True:
            tick += 1
            for sim in self._variables:
                name = sim.node.name.lower()
                dt = sim.node.data_type

                if dt == "i=1":
                    if name in ("alwaystrue",):
                        value = True
                    elif name in ("alwaysfalse",):
                        value = False
                    elif "clock" in name:
                        value = (tick % 2) == 0
                    else:
                        value = (tick + sim.counter) % 4 < 2
                elif dt in ("i=6", "i=4"):
                    sim.counter += 1
                    value = int(50 + 30 * math.sin(tick * 0.1 + sim.phase))
                elif dt == "i=10":
                    value = round(20.0 + 15.0 * math.sin(tick * 0.15 + sim.phase), 2)
                elif dt == "i=12":
                    value = f"sim_{sim.node.name}_{tick}"
                else:
                    value = (tick + sim.counter) % 256

                try:
                    if dt == "i=1":
                        await sim.opc_node.write_value(value, ua.VariantType.Boolean)
                    else:
                        await sim.opc_node.write_value(value)
                except ua.UaStatusCodeError as error:
                    logger.debug("Write %s: %s", sim.node.name, error)

            await asyncio.sleep(interval)
