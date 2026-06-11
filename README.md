# Blueprint

A Claude Code plugin. Draw on a screenshot, pin a note to each mark, and hand Claude the
marked-up image **plus** your notes automatically. No copy-paste.

The point: let Claude *see* what you mean and *where*, instead of guessing from a wall of text.
Circle the middle of your dashboard, write "Vee tile here, wired to every other tile like a
motherboard," and Claude gets the picture and the intent in one shot.

## What it looks like

1. You run `/blueprint ./screenshot.png`
2. A browser tab opens with your screenshot on a canvas
3. You draw circles / boxes / arrows / pins and type a short note on each (tag it add / move /
   remove / connect / restyle / note)
4. You click **Done**
5. Claude automatically reads the annotated image and your notes, then acts on them

## Install

```
/plugin marketplace add <path-or-repo-of-this-folder>
/plugin install blueprint
```

Then in any project:

```
/blueprint path/to/screenshot.png
```

You can also run `/blueprint` with no path and drag an image into the page.

## Requirements

- **Node.js** for the smooth no-copy-paste path (the plugin runs a tiny local server on
  `127.0.0.1`). If Node is not found, Blueprint falls back to a simple download-and-read so it
  still works with zero setup.
- Any modern browser (Chrome, Safari, Firefox, Edge).

## How it works (under the hood)

- `/blueprint` launches a tiny **loopback web server** that serves the annotation canvas at
  `http://127.0.0.1:PORT/` and catches your finished work via a same-origin POST. Loopback to
  loopback needs no permission prompt and no CORS, so it is friction-free in every browser.
- On **Done**, the page POSTs the annotated PNG + your marks. The server writes
  `annotated.png`, `blueprint.md`, and a `paths.json` sentinel into `.blueprint/` in your project.
- Claude reads the PNG **by path** (so it enters vision context cleanly) and reads the small
  `blueprint.md` inline, then applies each numbered mark.

Output lives in `<your project>/.blueprint/` and is git-ignored by default.

## What Claude receives

`blueprint.md` looks like:

```
# Blueprint
Target: screenshot.png
Marks: 2

[1] circle at dead center — ADD
      Vee tile goes here. Make it the motherboard, wired to every other tile.
      coords: center {x:0.50,y:0.50} r {x:0.12,y:0.18} (img 1280x720)

[2] arrow at top right — CONNECT
      Wire the Vee tile to every other tile.
      coords: from {x:0.78,y:0.12} to {x:0.41,y:0.55} (img 1280x720)
---
Instruction to Claude: apply each mark to the design. Numbers above match the circled numbers on annotated.png.
```

## License

MIT
