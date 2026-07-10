---
description: Draw on a URL or screenshot and hand Claude your marks (no copy-paste)
argument-hint: [url or screenshot path — optional]
allowed-tools: Bash, Read, Glob
---

You are running **Blueprint**: get an image in front of the user to draw on, then read back their marks and apply them. Follow these steps exactly.

## Step 1 — work out what to mark up, from `$ARGUMENTS`

- **If `$ARGUMENTS` is empty:** reply with exactly this and then STOP and end your turn (do not run anything):
  > Send me a URL or a screenshot to mark up. (Paste a link, drop an image, or give me a file path.)
- **If it is a URL** (starts with `http://` or `https://`): capture a **full-page** screenshot of it to `/tmp/blueprint-capture.png`, trying these in order until one works:
  1. **Your browser tool** (Playwright or similar MCP), if you have one: navigate to the URL, take a full-page screenshot saved to that path.
  2. **Headless Chrome via Bash** (works with no browser tool installed). On macOS:
     `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars --window-size=1440,2400 --screenshot=/tmp/blueprint-capture.png "<URL>"`
     On Linux try `google-chrome`, `chromium`, or `chromium-browser` with the same flags. Ignore stderr noise; only check that the PNG file exists afterwards.
  3. **Neither worked:** tell the user "I can't screenshot URLs on this machine. Take a screenshot of the page yourself (Cmd+Shift+4 on Mac) and drop it here instead." Then STOP.
  - Set the image path to `/tmp/blueprint-capture.png`.
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

## Step 4 — map the image to the project, THEN apply

**Before changing anything**, work out what the screenshot actually is:

- If it is a page/component **from this project**, find the source file(s) it corresponds to. Say which file you matched it to in one line.
- If you **cannot confidently map it** to anything in this project (a random image, a screenshot of someone else's app, a photo), do NOT guess and do NOT edit unrelated files. Instead, tell the user in plain words what you see and ask ONE question: "What should I apply these marks to — a file in this project, or should I build this as a new page?" Then STOP and wait.
- If the user says build it new, create it fresh (a standalone HTML file unless they say otherwise) honoring every mark.

Each mark has a number (matching the badge on the image), a shape, a position, a tag, and the user's note. For each one, say in one line what you are about to change, then change it:
- **ADD** — create the described element at that spot
- **MOVE** — relocate the referenced element there
- **REMOVE** — delete the marked element
- **EDIT** — change the wording / numbers / content of the marked element (keep it, just fix what it says)
- **RESTYLE** — restyle the marked element as noted
- **NOTE** — a plain comment to take into account
