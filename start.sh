#!/bin/bash
# ---------------------------------------------------------------
# Wanderlust Pro — one-command startup
#
#   ./start.sh          start everything (installs deps if needed)
#   ./start.sh stop     stop API + client
#   ./start.sh status   show what is running
#   ./start.sh logs     tail both logs
#
# MongoDB is started through Homebrew if it is not already running.
# ---------------------------------------------------------------
set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

API_PORT=8080
CLIENT_PORT=5173

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
dim()   { printf "\033[2m%s\033[0m\n" "$1"; }

port_pid() { lsof -ti:"$1" 2>/dev/null | head -1; }

wait_for() { # url, label
  for _ in $(seq 1 40); do
    if curl -s -o /dev/null --max-time 1 "$1"; then
      green "  ✓ $2 is up"
      return 0
    fi
    sleep 0.5
  done
  red "  ✗ $2 did not start — see the log below"
  return 1
}

stop_all() {
  for p in $API_PORT $CLIENT_PORT; do
    pid="$(port_pid "$p")"
    if [ -n "$pid" ]; then
      kill "$pid" 2>/dev/null && dim "  stopped process on :$p"
    fi
  done
  green "Stopped."
}

status_all() {
  for p in $API_PORT $CLIENT_PORT; do
    pid="$(port_pid "$p")"
    if [ -n "$pid" ]; then green "  :$p  running (pid $pid)"; else red "  :$p  not running"; fi
  done
  if lsof -nP -iTCP:27017 -sTCP:LISTEN >/dev/null 2>&1; then
    green "  :27017 MongoDB running"
  else
    red "  :27017 MongoDB not running"
  fi
}

case "${1:-start}" in
  stop)   stop_all; exit 0 ;;
  status) status_all; exit 0 ;;
  logs)   tail -f "$LOG_DIR/api.log" "$LOG_DIR/client.log"; exit 0 ;;
esac

echo "Wanderlust Pro — starting up"
echo

# 1. MongoDB
if lsof -nP -iTCP:27017 -sTCP:LISTEN >/dev/null 2>&1; then
  green "✓ MongoDB already running"
else
  echo "→ Starting MongoDB (brew services)…"
  brew services start mongodb-community >/dev/null 2>&1 || {
    red "Could not start MongoDB. Install it with: brew install mongodb-community"
    exit 1
  }
  sleep 3
  green "✓ MongoDB started"
fi

# 2. Dependencies (only if missing)
if [ ! -d "$ROOT/server/node_modules" ]; then
  echo "→ Installing server dependencies…"
  (cd "$ROOT/server" && npm install --no-audit --no-fund)
fi
if [ ! -d "$ROOT/client/node_modules" ]; then
  echo "→ Installing client dependencies…"
  (cd "$ROOT/client" && npm install --no-audit --no-fund)
fi
green "✓ Dependencies present"

# 3. Free the ports from old runs
for p in $API_PORT $CLIENT_PORT; do
  pid="$(port_pid "$p")"
  [ -n "$pid" ] && kill "$pid" 2>/dev/null && dim "  freed port :$p"
done
sleep 1

# 4. API
echo "→ Starting API…"
(cd "$ROOT/server" && nohup npm start >"$LOG_DIR/api.log" 2>&1 &)
wait_for "http://localhost:$API_PORT/api/health" "API (: $API_PORT)" || { tail -20 "$LOG_DIR/api.log"; exit 1; }

# 5. Client
echo "→ Starting client…"
(cd "$ROOT/client" && nohup npm run dev >"$LOG_DIR/client.log" 2>&1 &)
wait_for "http://localhost:$CLIENT_PORT" "Client (: $CLIENT_PORT)" || { tail -20 "$LOG_DIR/client.log"; exit 1; }

echo
green "All good — open http://localhost:$CLIENT_PORT"
echo
dim "  Demo logins (password: password123)"
dim "    owner@wanderlust.com   owner account"
dim "    host@wanderlust.com    second owner"
dim "    guest@wanderlust.com   guest account"
dim ""
dim "  Logs:   ./start.sh logs"
dim "  Status: ./start.sh status"
dim "  Stop:   ./start.sh stop"
