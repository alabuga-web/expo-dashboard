"""Парсинг TIA Portal OPC UA NodeSet XML."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

UA_NS = {"ua": "http://opcfoundation.org/UA/2011/03/UANodeSet.xsd"}
GROUP_BY_PARENT = {
    "ns=3;s=Inputs": "inputs",
    "ns=3;s=Outputs": "outputs",
    "ns=3;s=Memory": "memory",
    "ns=3;s=PLC": "plc",
}


@dataclass(frozen=True)
class OpcNode:
    name: str
    node_id: str
    group: str = ""
    data_type: str = ""


def parse_opcua_xml(path: Path, groups: set[str] | None = None) -> list[OpcNode]:
    root = ET.parse(path).getroot()
    nodes: list[OpcNode] = []

    for element in root.findall("ua:UAVariable", UA_NS):
        node_id = element.attrib.get("NodeId", "")
        browse_name = element.attrib.get("BrowseName", "")
        data_type = element.attrib.get("DataType", "")
        parent = element.attrib.get("ParentNodeId", "")
        name = browse_name.split(":", 1)[-1] if ":" in browse_name else browse_name

        if not node_id or name == "EnumValues":
            continue

        group = GROUP_BY_PARENT.get(parent, "other")
        if groups and group not in groups:
            continue

        nodes.append(
            OpcNode(
                name=name,
                node_id=node_id,
                group=group,
                data_type=data_type,
            )
        )

    return nodes
