#!/bin/bash
# demo.sh — Abre el runner de exploits con menú interactivo
# Uso: ./demo.sh o bash demo.sh

cd "$(dirname "$0")"

echo "╔══════════════════════════════════════════╗"
echo "║  OWASP Demo — Exploit Runner (Ink v2.0) ║"
echo "╚══════════════════════════════════════════╝"
echo ""

pnpm demo
