#!/usr/bin/env bash
# Blueprint launcher. Called by the /blueprint slash command.
#   launch.sh "<screenshot path or empty>"
#
# Starts the loopback annotation server in the background (so it survives past this
# command and is not killed by a bash timeout). The server opens the browser itself.
# When the user clicks Done, the server writes <project>/.blueprint/{annotated.png,
# blueprint.md,paths.json} and the Stop hook surfaces them to Claude.
#
# If Node is not installed, falls back to opening the canvas directly in the browser
# in download mode; the user downloads the two files and Claude reads them from Downloads.

SCREENSHOT="$1"
PLUGIN_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
OUT_DIR="$PROJECT_DIR/.blueprint"

mkdir -p "$OUT_DIR"
# Clear any stale sentinel so the Stop hook never reads a previous run.
rm -f "$OUT_DIR/paths.json" "$OUT_DIR/consumed"

if command -v node >/dev/null 2>&1; then
  nohup node "$PLUGIN_ROOT/bin/blueprint-server.js" "$SCREENSHOT" "$PROJECT_DIR" \
    > "$OUT_DIR/server.log" 2>&1 &
  echo "Blueprint is opening in your browser."
  echo "Draw your marks, add a note to each, then click Done."
  echo "When you're back, say \"done\" and I'll read your marks."
else
  HTML="$PLUGIN_ROOT/assets/blueprint.html"
  echo "Node.js was not found, so Blueprint is opening in download mode."
  echo "Drop your screenshot in, draw your marks, click Done (the two files save to Downloads),"
  echo "then come back and say \"done\"."
  case "$(uname)" in
    Darwin) open "file://$HTML" ;;
    Linux)  xdg-open "file://$HTML" 2>/dev/null || echo "Open this file in your browser: $HTML" ;;
    *)      echo "Open this file in your browser: $HTML" ;;
  esac
fi
