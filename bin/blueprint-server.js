#!/usr/bin/env node
/*
 * Blueprint loopback server.
 *   node blueprint-server.js [screenshotPath] [projectDir]
 *
 * Serves the annotation canvas at http://127.0.0.1:<free-port>/, opens the browser,
 * waits for the page to POST /save, then writes three files into <projectDir>/.blueprint/:
 *   annotated.png   the screenshot with marks burned in (Claude reads this BY PATH)
 *   blueprint.md    the structured per-mark notes (Claude reads this inline)
 *   paths.json      sentinel { png, md, ts } so the command/hook knows it is done
 * Then it prints those paths and exits 0. On timeout it exits 1.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const screenshotArg = process.argv[2] && process.argv[2].trim() ? process.argv[2].trim() : null;
const projectDir = process.argv[3] && process.argv[3].trim() ? process.argv[3].trim() : process.cwd();

const PLUGIN_ROOT = path.join(__dirname, '..');
const HTML_PATH = path.join(PLUGIN_ROOT, 'assets', 'blueprint.html');
const OUT_DIR = path.join(projectDir, '.blueprint');
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const screenshotPath = screenshotArg
  ? (path.isAbsolute(screenshotArg) ? screenshotArg : path.resolve(projectDir, screenshotArg))
  : null;
const hasImage = !!(screenshotPath && fs.existsSync(screenshotPath));

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp', '.svg': 'image/svg+xml'
};

function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    fs.readFile(HTML_PATH, (err, buf) => {
      if (err) return send(res, 500, 'text/plain', 'blueprint.html not found');
      send(res, 200, 'text/html; charset=utf-8', buf);
    });
    return;
  }

  if (req.method === 'GET' && url === '/config') {
    const target = hasImage ? path.basename(screenshotPath) : 'your screenshot';
    return send(res, 200, 'application/json', JSON.stringify({ target, hasImage, mode: 'server' }));
  }

  if (req.method === 'GET' && url === '/screenshot') {
    if (!hasImage) return send(res, 404, 'text/plain', 'no image');
    fs.readFile(screenshotPath, (err, buf) => {
      if (err) return send(res, 404, 'text/plain', 'no image');
      const ext = path.extname(screenshotPath).toLowerCase();
      send(res, 200, MIME[ext] || 'application/octet-stream', buf);
    });
    return;
  }

  if (req.method === 'POST' && url === '/save') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 60 * 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const written = writeBlueprint(payload);
        send(res, 200, 'application/json', JSON.stringify({ ok: true, ...written }));
        finish(written);
      } catch (e) {
        send(res, 400, 'application/json', JSON.stringify({ ok: false, error: String(e) }));
      }
    });
    return;
  }

  send(res, 404, 'text/plain', 'not found');
});

function writeBlueprint(payload) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pngPath = path.join(OUT_DIR, 'annotated.png');
  const mdPath = path.join(OUT_DIR, 'blueprint.md');
  const sentinel = path.join(OUT_DIR, 'paths.json');

  const dataUrl = payload.png || '';
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(pngPath, Buffer.from(base64, 'base64'));
  fs.writeFileSync(mdPath, formatMarkdown(payload));
  fs.writeFileSync(sentinel, JSON.stringify({ png: pngPath, md: mdPath, ts: Date.now() }, null, 2));

  return { png: pngPath, md: mdPath };
}

function formatMarkdown(p) {
  const marks = Array.isArray(p.marks) ? p.marks : [];
  let s = `# Blueprint\nTarget: ${p.target || 'screenshot'}\nMarks: ${marks.length}\n\n`;
  marks.forEach(m => {
    s += `[${m.n}] ${m.shape} at ${m.region} — ${String(m.tag || '').toUpperCase()}\n`;
    s += `      ${m.note || ''}\n`;
    s += `      coords: ${JSON.stringify(m.coords)} (img ${p.imageW}x${p.imageH})\n\n`;
  });
  s += `---\nInstruction to Claude: apply each mark to the design. Numbers above match the circled numbers on the attached image (annotated.png).\n`;
  return s;
}

function openBrowser(url) {
  try {
    if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    else if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  } catch (e) { /* user can open the URL manually */ }
}

let timer = null;
function finish(written) {
  clearTimeout(timer);
  // Print the result for the slash command to surface, then shut down.
  process.stdout.write('\nBLUEPRINT_SAVED\n');
  process.stdout.write('annotated_png: ' + written.png + '\n');
  process.stdout.write('blueprint_md:  ' + written.md + '\n');
  setTimeout(() => { server.close(); process.exit(0); }, 150);
}

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/`;
  process.stdout.write('Blueprint is open in your browser: ' + url + '\n');
  if (hasImage) process.stdout.write('Marking up: ' + screenshotPath + '\n');
  else process.stdout.write('No screenshot passed. Drop one into the page.\n');
  process.stdout.write('Draw your marks, add a note to each, then click Done. Waiting...\n');
  if (!process.env.BLUEPRINT_NO_OPEN) openBrowser(url);
  timer = setTimeout(() => {
    process.stdout.write('\nBLUEPRINT_TIMEOUT after 10 minutes. Re-run /blueprint when ready.\n');
    server.close(); process.exit(1);
  }, TIMEOUT_MS);
});
