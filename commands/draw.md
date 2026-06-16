---
description: Draw on a URL or screenshot and hand Claude your marks (no copy-paste)
argument-hint: [url or screenshot path — optional]
allowed-tools: Bash, Read, Glob
---

You are running **Blueprint**: get an image in front of the user to draw on, then read back their marks and apply them. Follow these steps exactly.

## Step 1 — work out what to mark up, from `$ARGUMENTS`

- **If `$ARGUMENTS` is empty:** reply with exactly this and then STOP and end your turn (do not run anything):
  > Send me a URL or a screenshot to mark up. (Paste a link, drop an image, or give me a file path.)
- **If it is a URL** (starts with `http://` or `https://`): capture a **full-page** screenshot of it to `/tmp/blueprint-capture.png` using your browser screenshot tool (navigate to the URL, then take a full-page screenshot saved to that path). Set the image path to `/tmp/blueprint-capture.png`.
  - If the captured page looks like a **login / sign-in screen**, tell the user: "That page is behind a login, so I only see the sign-in screen. Send me a screenshot of your actual view instead." Then STOP.
- **Otherwise** treat `$ARGUMENTS` as a path to an image file already on disk. Use that path. (If the user pasted/attached an image, save it to `/tmp/blueprint-capture.png` and use that.)

## Step 2 — launch the canvas

Run this with the Bash tool (replace `<IMG>` with the path from Step 1), running it in the background so it survives:

```
bash "${CLAUDE_PLUGIN_ROOT}/bin/launch.sh" "<IMG>"
```

Then tell the user, briefly:
> A browser tab is opening with your page in it. Draw your marks (circle / box / arrow / pin), add a short note to each, click **Done**, then come back and say **done**.

Then end your turn and wait. Do NOT poll.

## Step 3 — when the user says "done"

Read the marks the user saved:
- If `${CLAUDE_PROJECT_DIR}/.blueprint/paths.json` exists, read the two files beside it:
  - Read `${CLAUDE_PROJECT_DIR}/.blueprint/annotated.png` (the marked image — enters your vision)
  - Read `${CLAUDE_PROJECT_DIR}/.blueprint/blueprint.md` (the structured notes)
- If there is no `paths.json` (Blueprint ran in download mode), use Glob to find the newest `blueprint.png` and `blueprint.md` under `~/Downloads`, then read both.

## Step 4 — apply each mark

Each mark has a number (matching the badge on the image), a shape, a position, a tag, and the user's note. For each one, say in one line what you are about to change, then change it:
- **ADD** — create the described element at that spot
- **MOVE** — relocate the referenced element there
- **REMOVE** — delete the marked element
- **EDIT** — change the wording / numbers / content of the marked element (keep it, just fix what it says)
- **RESTYLE** — restyle the marked element as noted
- **NOTE** — a plain comment to take into account
