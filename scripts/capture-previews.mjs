// Screenshots each component's demo into docs/previews/<name>.png (1280x800).
// By default only components without a preview are captured; pass --all to redo every one,
// or component names to redo just those:  node scripts/capture-previews.mjs depth-field-card-drift
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, access } from "node:fs/promises";
import { join, extname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const args = process.argv.slice(2);
const all = args.includes("--all");
const only = args.filter((a) => !a.startsWith("--"));
const exists = (p) => access(p).then(() => true, () => false);

const { components } = JSON.parse(await readFile(join(root, "index.json"), "utf8"));
const todo = [];
for (const c of components) {
  if (!c.demo?.file) continue;
  const out = join(root, "docs/previews", `${c.name}.png`);
  if (only.length ? only.includes(c.name) : all || !(await exists(out))) todo.push({ c, out });
}
if (!todo.length) { console.log("All previews present."); process.exit(0); }

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".jsx": "text/javascript",
  ".tsx": "text/javascript", ".ts": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm" };
const server = createServer(async (req, res) => {
  try {
    const p = join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!p.startsWith(root)) throw 0;
    res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" });
    res.end(await readFile(p));
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
let failed = 0;
for (const { c, out } of todo) {
  try {
    await page.goto(base + `${c.path}/${c.demo.file}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.mouse.move(820, 420);          // wake cursor-reactive demos
    await page.waitForTimeout(2500);          // let intro animations settle
    await page.screenshot({ path: out });
    console.log("captured", c.name);
  } catch (e) { failed++; console.error("failed", c.name, e.message); }
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
