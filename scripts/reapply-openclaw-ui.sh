#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_ROOT_DEFAULT="$(cd "$REPO_ROOT/.." && pwd)/dist/control-ui"
DIST_ROOT="${OPENCLAW_CONTROL_UI_DIST:-$DIST_ROOT_DEFAULT}"
CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-$HOME/.openclaw/openclaw.json}"

log() {
  printf '[openclaw-ui] %s\n' "$*"
}

log "repo=$REPO_ROOT"
log "dist=$DIST_ROOT"
log "config=$CONFIG_PATH"

cd "$REPO_ROOT"

if [ -f package-lock.json ]; then
  log "installing deps with npm ci"
  npm ci
else
  log "installing deps with npm install"
  npm install
fi

log "building UI bundle"
npm run build

if [ ! -f "$DIST_ROOT/index.html" ]; then
  echo "ERROR: built UI not found at $DIST_ROOT/index.html" >&2
  exit 1
fi

if [ ! -f "$CONFIG_PATH" ]; then
  echo "ERROR: OpenClaw config not found: $CONFIG_PATH" >&2
  exit 1
fi

log "pinning gateway.controlUi.root to $DIST_ROOT"
python3 - "$CONFIG_PATH" "$DIST_ROOT" <<'PY'
import json
import pathlib
import sys

config_path = pathlib.Path(sys.argv[1]).expanduser()
ui_root = sys.argv[2]
with config_path.open('r', encoding='utf-8') as f:
    data = json.load(f)

data.setdefault('gateway', {})
data['gateway'].setdefault('controlUi', {})
data['gateway']['controlUi']['root'] = ui_root

with config_path.open('w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')
print(config_path)
PY

log "restarting gateway"
openclaw gateway restart

log "done"
