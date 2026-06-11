#!/usr/bin/env bash
# Blueprint Stop hook.
# When a fresh blueprint has just been captured (the server wrote .blueprint/paths.json),
# block the stop once and tell Claude to read the two output files. Otherwise allow the
# stop normally. Consuming (deleting) the sentinel guarantees this never loops.

cat >/dev/null 2>&1   # drain the hook's stdin JSON; we don't need it

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
OUT_DIR="$PROJECT_DIR/.blueprint"
SENTINEL="$OUT_DIR/paths.json"

# No capture pending -> let Claude stop.
[ -f "$SENTINEL" ] || exit 0

# Stale capture (older than 30 minutes) -> ignore it.
if [ -z "$(find "$OUT_DIR" -maxdepth 1 -name paths.json -mmin -30 2>/dev/null)" ]; then
  exit 0
fi

# Fresh, unconsumed blueprint: consume it, then ask Claude to read the files.
rm -f "$SENTINEL"
printf '%s\n' '{"decision":"block","reason":"A Blueprint was just captured. Read .blueprint/annotated.png (the marked-up image) and .blueprint/blueprint.md (the structured notes) from the project root, then apply each numbered mark to the design. Each mark has a tag (ADD / MOVE / REMOVE / CONNECT / RESTYLE / NOTE) and the numbers match the circled numbers on the image."}'
exit 0
