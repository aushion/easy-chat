#!/usr/bin/env bash

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # Prefer the project's pinned Node version when available.
  . "$HOME/.nvm/nvm.sh"
  nvm use >/dev/null
fi

pick_backend_port() {
  port=3001
  while lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}

echo "[easy-chat] seeding test users"
npm run init:test-users

BACKEND_PORT="$(pick_backend_port)"
BACKEND_TARGET="http://127.0.0.1:${BACKEND_PORT}"

echo "[easy-chat] backend port: ${BACKEND_PORT}"

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  if [ -n "${WEB_PID:-}" ]; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

echo "[easy-chat] starting server"
PORT="$BACKEND_PORT" npm run dev:server &
SERVER_PID=$!

wait_for_backend() {
  attempt=0
  until curl -s "$BACKEND_TARGET/api/auth/me" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
      echo "[easy-chat] backend did not become ready in time"
      exit 1
    fi
    sleep 1
  done
}

echo "[easy-chat] waiting for backend"
wait_for_backend

echo "[easy-chat] starting web"
VITE_BACKEND_TARGET="$BACKEND_TARGET" npm run dev:web &
WEB_PID=$!

wait "$SERVER_PID" "$WEB_PID"
