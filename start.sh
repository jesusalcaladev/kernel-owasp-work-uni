#!/bin/bash
# start.sh — Inicia la CLI interactiva OWASP Demo
# Uso: ./start.sh o bash start.sh

cd "$(dirname "$0")"

echo "╔══════════════════════════════════════════╗"
echo "║  OWASP Demo — Kernel Shell (Ink v2.0)  ║"
echo "╚══════════════════════════════════════════╝"
echo ""

pnpm start
