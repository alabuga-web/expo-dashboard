#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -d .venv ]]; then
  uv venv
fi

source .venv/bin/activate
uv pip install -r requirements.txt -q

CONFIG="${PLC_WEB_CONFIG:-config_web.yaml}"
AUTH_FILE="${PLC_WEB_AUTH_FILE:-auth.json}"
COOKIES_FILE="${PLC_WEB_COOKIES_FILE:-cookies.txt}"

ARGS=("$@")

# Логин только если нет cookies или явно запрошен --login
if [[ ! -f "$COOKIES_FILE" ]] || [[ "${ARGS[0]:-}" == "--login" ]]; then
  python plc_web_reader.py -c "$CONFIG" --login
  if [[ "${ARGS[0]:-}" == "--login" && ${#ARGS[@]} -eq 1 ]]; then
    exit 0
  fi
  if [[ "${ARGS[0]:-}" == "--login" ]]; then
    ARGS=("${ARGS[@]:1}")
  fi
fi

if [[ -f "$AUTH_FILE" ]]; then
  AUTH_TYPE=$(python -c "import json; print(json.load(open('$AUTH_FILE')).get('auth_type',''))")
  if [[ "$AUTH_TYPE" == "api" && -f "${PLC_WEB_TOKEN_FILE:-token.txt}" ]]; then
    export PLC_WEB_TOKEN
    PLC_WEB_TOKEN="$(tr -d '\n' < "${PLC_WEB_TOKEN_FILE:-token.txt}")"
    echo "API-токен загружен (${#PLC_WEB_TOKEN} символов)"
  else
    unset PLC_WEB_TOKEN 2>/dev/null || true
    echo "Сессия FormLogin (cookies)"
  fi
fi

if [[ ${#ARGS[@]} -eq 0 ]]; then
  ARGS=(--probe)
fi

python plc_web_reader.py -c "$CONFIG" "${ARGS[@]}"
