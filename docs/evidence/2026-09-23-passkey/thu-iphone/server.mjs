// Bản thử lát 0 (ADR-0016 điều 9): passkey + chuyển hướng kiểu Google trên iPhone thật ở chế độ app cài. KHÔNG thuộc app, không đụng D1/production.
// Chạy từ gốc repo: node docs/evidence/2026-09-23-passkey/thu-iphone/server.mjs   (chủ dự án tự chạy cloudflared ở cửa sổ khác — xem HUONG-DAN.md)
import { createServer } from "node:http";
import { appendFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const DIR = new URL("./", import.meta.url);
const ICONS = new URL("../../../../public/icons/", import.meta.url);
const PORT = Number(process.env.PORT ?? 8799);
const OUT = new URL("ket-qua.jsonl", DIR);
const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8", DIR],
  "/app.js": ["app.js", "text/javascript; charset=utf-8", DIR],
  "/manifest.webmanifest": ["manifest.webmanifest", "application/manifest+json", DIR],
  "/icon-192.png": ["icon-192.png", "image/png", ICONS],
  "/apple-touch-icon.png": ["apple-touch-icon.png", "image/png", ICONS],
};
const b64u = (buf) => Buffer.from(buf).toString("base64url");
const cookieOf = (req, name) => (req.headers.cookie ?? "").split(/;\s*/).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
const record = (entry) => appendFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  const origin = `https://${req.headers.host}`; // cloudflared giữ nguyên Host của tên miền tạm
  const file = STATIC[url.pathname];
  if (req.method === "GET" && file) {
    res.writeHead(200, { "content-type": file[1], "cache-control": "no-store" });
    return res.end(readFileSync(new URL(file[0], file[2])));
  }
  if (req.method === "GET" && url.pathname === "/challenge") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    return res.end(JSON.stringify({ challenge: b64u(randomBytes(32)) }));
  }
  if (req.method === "POST" && url.pathname === "/report") {
    let body = "";
    req.on("data", (c) => (body.length < 50_000 ? (body += c) : null));
    req.on("end", () => {
      try { record({ report: JSON.parse(body) }); } catch { record({ report: "không đọc được" }); }
      res.writeHead(204).end();
    });
    return;
  }
  // Mô phỏng Google: đặt cookie tạm, rời sang MỘT TÊN MIỀN KHÁC (httpbin.org), tên miền đó chuyển hướng 302 về lại. Không cần OAuth client thật.
  if (req.method === "GET" && url.pathname === "/bounce/start") {
    const state = b64u(randomBytes(16));
    const back = `${origin}/bounce/back?state=${state}`;
    res.writeHead(302, {
      "set-cookie": `sim=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
      location: `https://httpbin.org/redirect-to?url=${encodeURIComponent(back)}&status_code=302`,
    });
    return res.end();
  }
  if (req.method === "GET" && url.pathname === "/bounce/back") {
    const kept = cookieOf(req, "sim") !== null && cookieOf(req, "sim") === url.searchParams.get("state");
    record({ bounce: { cookieKept: kept, ua: req.headers["user-agent"] } });
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    return res.end(`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><body style="font:18px system-ui;padding:24px">
<h1>Đã quay về</h1><p>Cookie còn giữ: <b>${kept ? "CÓ" : "KHÔNG"}</b></p><p>Đang ở: <b id="m"></b></p><p><a href="/">Về trang thử</a></p>
<script>const s = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches; document.getElementById("m").textContent = s ? "cửa sổ app cài" : "tab Safari / khung trình duyệt";
fetch("/report", { method: "POST", body: JSON.stringify({ action: "bounce", cookieKept: ${kept}, standalone: s }) });</script></body>`);
  }
  res.writeHead(404).end();
}).listen(PORT, () => console.log(`Bản thử passkey chạy ở http://localhost:${PORT} — mở đường hầm: cloudflared tunnel --url http://localhost:${PORT}`));
