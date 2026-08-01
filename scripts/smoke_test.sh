#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8080}"

echo "== health =="
curl -fsS "$BASE_URL/health" | tee /tmp/xiaoai-health.json
echo

echo "== launch =="
curl -fsS -X POST "$BASE_URL/xiaoai/skill" \
  -H 'Content-Type: application/json' \
  -d '{"query":"打开杨凯助手","session":{"session_id":"smoke"},"request":{"type":0}}'
echo

echo "== keyword gate =="
curl -fsS -X POST "$BASE_URL/xiaoai/skill" \
  -H 'Content-Type: application/json' \
  -d '{"query":"播放音乐","session":{"session_id":"smoke"},"request":{"type":1}}'
echo

echo "Smoke checks finished."
