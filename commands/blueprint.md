---
description: Draw on a screenshot and hand Claude the marked-up image plus your notes (no copy-paste)
argument-hint: [path/to/screenshot.png]
allowed-tools: Bash, Read, Glob
---

Starting Blueprint. A browser tab will open with the screenshot. Draw your marks (circle, box,
arrow, pin), add a short note to each, then click **Done**.

!`bash "${CLAUDE_PLUGIN_ROOT}/bin/launch.sh" "$ARGUMENTS"`

The annotation tool is now open in the user's browser and is running in the background.

What to do next:

1. Tell the user: "Draw on the screenshot, add a note to each mark, click Done, then say **done** here and I'll pick up your marks." Then end your turn and wait. Do not poll.

2. When the user says they are done (or on your next turn), check for the result:
   - If `${CLAUDE_PROJECT_DIR}/.blueprint/paths.json` exists, read the two files it was written
     alongside:
     - Read `${CLAUDE_PROJECT_DIR}/.blueprint/annotated.png` (the marked-up image, enters vision)
     - Read `${CLAUDE_PROJECT_DIR}/.blueprint/blueprint.md` (the structured notes)
   - If there is no `.blueprint/paths.json` (Node was not installed, so Blueprint ran in download
     mode), the two files saved to the user's Downloads folder instead. Use Glob to find the newest
     `blueprint.png` and `blueprint.md` under `~/Downloads`, then Read both.

3. Apply each numbered mark to the design. Every mark has a tag and the numbers match the circled
   numbers on the image:
   - **ADD** — create the described element here
   - **MOVE** — relocate the referenced element here
   - **REMOVE** — delete the marked element
   - **CONNECT** — visually/structurally link the two referenced spots
   - **RESTYLE** — restyle the marked element as noted
   - **NOTE** — a plain comment to take into account (not necessarily an action)

   For each mark, state what you are about to change before changing it, then make the change.
