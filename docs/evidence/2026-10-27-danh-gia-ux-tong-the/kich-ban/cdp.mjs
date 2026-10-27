// Kế thừa từ kịch bản cùng tên của phiên a45f9ae5 (nhánh worktree-danh-gia-ux-tong-the, 27/10/2026); phiên này (v2) đổi cổng 8795 + kho ~/tourdao-ux-2026-10-27-v2 và bổ sung theo đề bài bản mới.
// Khung Chrome (CDP) tối giản cho đánh giá UX 27/10/2026: một Chrome headless, MỖI tài khoản một ngăn trình duyệt riêng (browser context —
// cookie không lẫn giữa các bộ quyền, khác a2-cdp.mjs dùng chung kho cookie). Node 22 có WebSocket gốc, không thêm dependency.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const freePort = () => new Promise((res, rej) => { const s = createServer(); s.unref(); s.on("error", rej); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => res(port)); }); });

export async function moChrome() {
  const profile = mkdtempSync(join(tmpdir(), "ux-chrome-"));
  const port = await freePort();
  const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--disable-gpu", "--hide-scrollbars", "--lang=vi-VN", "about:blank"], { stdio: "ignore" });
  let ver;
  for (let i = 0; ; i++) {
    ver = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()).catch(() => null);
    if (ver) break;
    if (i > 80) throw new Error("Chrome không lên");
    await sleep(250);
  }
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map();
  const listeners = new Map(); // sessionId → fn(msg)
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.sessionId && listeners.has(m.sessionId)) listeners.get(m.sessionId)(m);
  });
  // Mọi lệnh CDP có hạn 45 s: lần quét 27/10 15:38 treo vĩnh viễn ở Page.captureScreenshot cả trang của /help (trang rất dài) vì không có hạn.
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; const t = setTimeout(() => { pending.delete(i); rej(new Error(`CDP ${method} không trả lời sau 45 s`)); }, 45000); pending.set(i, (m) => { clearTimeout(t); res(m); }); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); });
  // Bị dừng (TaskStop / Ctrl+C) thì tắt Chrome theo, không để tiến trình mồ côi.
  const dungKhiBiGiet = () => { try { chrome.kill("SIGKILL"); } catch { /* đã thoát */ } try { rmSync(profile, { recursive: true, force: true }); } catch { /* bỏ */ } process.exit(130); };
  process.on("SIGTERM", dungKhiBiGiet); process.on("SIGINT", dungKhiBiGiet);

  /** Một ngăn trình duyệt mới (cookie riêng) + một tab. */
  async function moNgan() {
    const { result: { browserContextId } } = await send("Target.createBrowserContext", { disposeOnDetach: true });
    const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank", browserContextId });
    const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    const loi = [];
    const mang = { dangCho: 0 };
    listeners.set(sessionId, (m) => {
      if (m.method === "Runtime.exceptionThrown") loi.push(m.params.exceptionDetails.exception?.description?.slice(0, 300) ?? m.params.exceptionDetails.text);
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") loi.push(m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300));
      if (m.method === "Network.requestWillBeSent") mang.dangCho++;
      if (m.method === "Network.loadingFinished" || m.method === "Network.loadingFailed") mang.dangCho = Math.max(0, mang.dangCho - 1);
    });
    await s("Network.enable"); await s("Runtime.enable"); await s("Page.enable");
    await s("Emulation.setFocusEmulationEnabled", { enabled: true });
    const ev = async (expression) => {
      const r = await s("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error(`evaluate lỗi: ${JSON.stringify(r.result.exceptionDetails).slice(0, 400)}`);
      return r.result?.result?.value;
    };
    const khung = async (width, height, mobile) => {
      await s("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
      await s("Emulation.setTouchEmulationEnabled", { enabled: mobile });
      await s("Emulation.setUserAgentOverride", { userAgent: mobile ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36" });
    };
    /** Đi tới url, chờ tải xong + mạng lặng 600 ms (tối đa 12 s). */
    const di = async (url) => {
      loi.length = 0;
      await s("Page.navigate", { url });
      const het = Date.now() + 12000;
      let lang = 0;
      for (;;) {
        await sleep(150);
        const xong = await ev("document.readyState").catch(() => "") === "complete";
        lang = xong && mang.dangCho === 0 ? lang + 150 : 0;
        if (lang >= 600 || Date.now() > het) break;
      }
    };
    /** Ảnh JPEG; `full` = cả trang nhưng CẮT tối đa 9.000 px chiều cao (trang dài hơn — Hướng dẫn với nhật ký thay đổi — làm Chrome treo khi chụp không giới hạn). */
    const chup = async (path, full = true) => {
      let clip;
      if (full) { const cao = await ev("Math.min(document.documentElement.scrollHeight, 9000)"); const rong = await ev("innerWidth"); clip = { x: 0, y: 0, width: rong, height: cao, scale: 1 }; }
      const r = await s("Page.captureScreenshot", { format: "jpeg", quality: 62, captureBeyondViewport: full, ...(clip ? { clip } : {}) });
      if (!r.result?.data) throw new Error(`chụp ảnh lỗi: ${JSON.stringify(r.error ?? r).slice(0, 200)}`);
      writeFileSync(path, Buffer.from(r.result.data, "base64"));
    };
    const cookie = (c, url) => s("Network.setCookie", { ...c, url, httpOnly: true });
    const phim = async (key, code, keyCode, shift = false) => {
      for (const type of ["keyDown", "keyUp"]) await s("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: keyCode, modifiers: shift ? 8 : 0 });
    };
    const matMang = (offline) => s("Network.emulateNetworkConditions", { offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    const dong = async () => { listeners.delete(sessionId); await send("Target.disposeBrowserContext", { browserContextId }); };
    return { s, ev, khung, di, chup, cookie, phim, matMang, loi, dong };
  }

  const tat = async () => {
    try { chrome.kill("SIGTERM"); } catch { /* đã thoát */ }
    await sleep(800);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* bỏ */ }
  };
  return { moNgan, tat };
}

/** Đăng nhập bằng API (giống a2-cdp.mjs `login`), trả cookie phiên. */
export async function dangNhap(base, phone, pin) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: base, "cf-connecting-ip": `10.7.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}` }, body: JSON.stringify({ phone, pin, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" }) });
      if (r.status !== 200) throw new Error(`đăng nhập ${phone}: ${r.status} ${await r.text()}`);
      const [pair] = r.headers.get("set-cookie").split(";");
      const k = pair.indexOf("=");
      return { name: pair.slice(0, k), value: pair.slice(k + 1) };
    } catch (e) {
      if (i >= 2 || !["ECONNRESET", "UND_ERR_SOCKET"].includes(e?.cause?.code)) throw e;
      await sleep(300);
    }
  }
}
