#!/usr/bin/env bash
# Настройка Ethernet для подключения к ПЛК Siemens (подсеть 192.168.0.x)
# Запуск: sudo ./setup_network.sh

set -euo pipefail

IFACE="${PLC_IFACE:-eno1}"
PC_IP="${PLC_PC_IP:-192.168.0.10}"
NETMASK="${PLC_NETMASK:-24}"

echo "Интерфейс: $IFACE"
echo "IP ПК:     $PC_IP/$NETMASK"
echo "ПЛК:       обычно 192.168.0.1 или 192.168.0.20"

ip link set "$IFACE" up
ip addr flush dev "$IFACE" 2>/dev/null || true
ip addr add "${PC_IP}/${NETMASK}" dev "$IFACE"

echo ""
echo "Текущие адреса:"
ip -4 addr show "$IFACE"

echo ""
echo "Проверка связи:"
for target in 192.168.0.1 192.168.0.20; do
  if ping -c 1 -W 2 "$target" >/dev/null 2>&1; then
    echo "  $target — OK"
  else
    echo "  $target — нет ответа"
  fi
done

echo ""
echo "Маршрут к ПЛК:"
ip route get 192.168.0.20
