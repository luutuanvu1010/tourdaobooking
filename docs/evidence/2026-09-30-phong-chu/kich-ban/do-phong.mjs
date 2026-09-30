// Đo phông THẬT Chrome dùng cho từng đoạn chữ (CDP CSS.getPlatformFontsForNode) + chụp ảnh.
// Chạy từ gốc repo sau npm run build:web (macOS, Chrome ở /Applications): node docs/evidence/2026-09-30-phong-chu/kich-ban/do-phong.mjs public moi <thư mục ra>
// So bản cũ: git archive <commit> public | tar -x -C <tạm>, rồi chạy với <tạm>/public cu <thư mục ra>. Tiêu chí: mọi dòng trừ "symbols" chỉ một phông "Be Vietnam Pro [tệp web]" (riêng "pin" là phông đơn cách hệ thống).
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const [PUB, LABEL, OUT] = process.argv.slice(2);
const HERE = dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });
const TYPES = { ".css": "text/css", ".woff2": "font/woff2", ".html": "text/html; charset=utf-8" };
const srv = createServer((req, res) => {
  const p = req.url.split("?")[0];
  const file = p === "/do-phong.html" ? join(HERE, "do-phong.html") : join(PUB, p);
  if (!existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const port = srv.address().port;

const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${mkdtempSync(join(tmpdir(), "do-phong-chrome-"))}`, "--no-first-run", "--disable-gpu", "about:blank",
]);
const wsUrl = await new Promise((resolve) => {
  let buf = "";
  chrome.stderr.on("data", (d) => { buf += d; const m = /DevTools listening on (ws:\S+)/.exec(buf); if (m) resolve(m[1]); });
});
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const wait = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } });
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const i = ++id; wait.set(i, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id: i, method, params, sessionId }));
});

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId: s } = await send("Target.attachToTarget", { targetId, flatten: true });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }, s)).result.value;
await send("Page.enable", {}, s); await send("DOM.enable", {}, s); await send("CSS.enable", {}, s);
const result = {};
for (const [vw, name] of [[1040, "may-tinh"], [390, "dien-thoai"]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: vw, height: 900, deviceScaleFactor: 2, mobile: vw < 500 }, s);
  await send("Page.navigate", { url: `http://127.0.0.1:${port}/do-phong.html` }, s);
  await new Promise((r) => setTimeout(r, 800));
  await ev("document.fonts.ready.then(() => true)");
  if (name === "may-tinh") {
    const { root } = await send("DOM.getDocument", { depth: -1 }, s);
    const { nodeIds } = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "[data-k]" }, s);
    for (const nodeId of nodeIds) {
      const { attributes } = await send("DOM.getAttributes", { nodeId }, s);
      const k = attributes[attributes.indexOf("data-k") + 1];
      let target = nodeId;
      if (k === "input") { // chữ trong ô gõ nằm ở cây bóng của <input>
        const d = await send("DOM.describeNode", { nodeId, depth: -1, pierce: true }, s);
        const find = (n) => (n.nodeName === "#text" ? n : (n.shadowRoots ?? []).concat(n.children ?? []).map(find).find(Boolean));
        const t = find(d.node);
        if (t) target = (await send("DOM.pushNodesByBackendIdsToFrontend", { backendNodeIds: [t.backendNodeId] }, s)).nodeIds[0];
      }
      const { fonts } = await send("CSS.getPlatformFontsForNode", { nodeId: target }, s);
      result[k] = fonts.map((f) => `${f.familyName}${f.isCustomFont ? " [tệp web]" : " [hệ thống]"} ×${f.glyphCount}`);
    }
  }
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, s);
  writeFileSync(join(OUT, `${LABEL}-${name}.png`), Buffer.from(data, "base64"));
}
writeFileSync(join(OUT, `${LABEL}.json`), JSON.stringify(result, null, 2));
for (const [k, v] of Object.entries(result)) console.log(`${LABEL} ${k.padEnd(9)} ${v.join(" | ")}`);
ws.close(); chrome.kill(); srv.close();
