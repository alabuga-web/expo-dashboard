#!/usr/bin/env bash
# Запуск стека: ./stack.sh dev | prod | down | logs | ui
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

COMPOSE_BAKE="${COMPOSE_BAKE:-false}"
DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-0}"
export COMPOSE_BAKE DOCKER_BUILDKIT
ACTION="${1:-dev}"

_read_env() {
  local key="$1" file="$2" default="${3:-}"
  if [[ -f "$file" ]] && grep -q "^${key}=" "$file"; then
    grep "^${key}=" "$file" | head -1 | cut -d= -f2-
  else
    echo "$default"
  fi
}

_env_file() {
  case "$1" in
    dev)  echo "$ROOT/.env.dev" ;;
    prod) echo "$ROOT/.env.prod" ;;
    *)    echo "$ROOT/.env.$1" ;;
  esac
}

case "$ACTION" in
  dev|prod)
    ENV_FILE="$(_env_file "$ACTION")"
    if [[ ! -f "$ENV_FILE" ]]; then
      echo "Файл $ENV_FILE не найден"
      exit 1
    fi

    echo "==> Режим: $ACTION ($ENV_FILE)"
    export COMPOSE_BAKE DOCKER_BUILDKIT
    docker compose --env-file "$ENV_FILE" up -d --build

    UI_PORT="$(_read_env UI_PORT "$ENV_FILE" 8000)"
    echo ""
    echo "  Dashboard:  http://localhost:${UI_PORT}"
    if [[ "$ACTION" == "dev" ]]; then
      SIM_PORT="$(_read_env OPC_SIMULATOR_PORT "$ENV_FILE" 4840)"
      echo "  Simulator:  opc.tcp://localhost:${SIM_PORT}"
    else
      ENDPOINT="$(_read_env PLC_OPC_ENDPOINT "$ENV_FILE" "opc.tcp://192.168.0.1:4840")"
      echo "  PLC:        ${ENDPOINT}"
      echo "  (убедись: sudo ./setup_network.sh)"
    fi
    echo ""
    echo "  Логи:       ./stack.sh logs"
    echo "  Стоп:       ./stack.sh down"
    ;;

  down)
    # Останавливаем оба профиля на случай переключения
    export COMPOSE_BAKE DOCKER_BUILDKIT
    docker compose --env-file "$ROOT/.env.dev" --profile dev down 2>/dev/null || true
    docker compose --env-file "$ROOT/.env.prod" down 2>/dev/null || true
    echo "Стек остановлен"
    ;;

  logs)
    ENV_FILE="$(_env_file "${2:-dev}")"
    export COMPOSE_BAKE DOCKER_BUILDKIT
    docker compose --env-file "$ENV_FILE" logs -f --tail=50
    ;;

  ui)
    ENV_FILE="$(_env_file "${2:-dev}")"
    UI_PORT="$(_read_env UI_PORT "$ENV_FILE" 8000)"
    URL="http://localhost:${UI_PORT}"
    echo "Открываю ${URL}"
    if command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$URL" 2>/dev/null || true
    fi
    ;;

  status)
    ENV_FILE="$(_env_file "${2:-dev}")"
    export COMPOSE_BAKE DOCKER_BUILDKIT
    docker compose --env-file "$ENV_FILE" ps
    ;;

  *)
    echo "Использование: $0 {dev|prod|down|logs|ui|status}"
    echo ""
    echo "  dev     — симулятор + Kafka + listener + UI"
    echo "  prod    — реальный ПЛК + Kafka + listener + UI"
    echo "  down    — остановить всё"
    echo "  logs    — логи (./stack.sh logs [dev|prod])"
    echo "  ui      — открыть дашборд в браузере"
    echo "  status  — статус контейнеров"
    exit 1
    ;;
esac
