#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -d .venv ]]; then
  uv venv
fi

source .venv/bin/activate
uv pip install -r requirements.txt -q

CONFIG="${PLC_OPC_CONFIG:-config_opc.yaml}"

if [[ $# -eq 0 ]]; then
  python plc_opc_reader.py -c "$CONFIG"
else
  python plc_opc_reader.py -c "$CONFIG" "$@"
fi
