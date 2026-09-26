// Môi trường kiểm giao diện A2 (bằng chứng, nằm trong repo): D1 tạm + wrangler dev + Chrome headless điều khiển qua CDP (Node 22 có WebSocket gốc).
// Chạy từ GỐC repo (cwd): node docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-*.mjs
// `startEnv()` mặc định chạy máy chủ với Turnstile TẮT; `startEnv({ turnstile: true })` BẬT bằng khoá thử của Cloudflare (v1.0, kich-ban/v1-dang-nhap.mjs).
import { execFileSync, spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

export const ROOT = process.cwd();
const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res, rej) => { const s = createServer(); s.unref(); s.on("error", rej); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => res(port)); }); });

export const ACCOUNTS = {
  salesA: { name: "Sales Một", phone: "0900000201", pin: "246810", permissions: ["SALES"] },
  salesB: { name: "Sales Hai", phone: "0900000202", pin: "246811", permissions: ["SALES"] },
  accounting: { name: "Kế Toán", phone: "0900000203", pin: "246812", permissions: ["ACCOUNTING"] },
  admin: { name: "Quản Trị", phone: "0900000204", pin: "112233", permissions: ["ADMIN"] },
};

/** Ngày dân sự giờ Việt Nam, cách hôm nay n ngày. */
export const vnDate = (n = 0) => new Date(Date.now() + 7 * 3600e3 + n * 864e5).toISOString().slice(0, 10);

// Danh mục GIẢ chèn thẳng vào D1 (không phụ thuộc Google Sheet) và đánh dấu "đã đồng bộ" để /api/catalog không tự đồng bộ từ Sheet.
const T = "'2026-01-01T00:00:00.000Z'";
const CATALOG_SQL = `INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('TD101','Tour 4 đảo Nha Trang','perPax',1350000,950000,1200000,0,'Trẻ 5–10 tuổi','Từ 60 tuổi','Dưới 5 tuổi, miễn phí',2,1,${T},${T}),
  ('TTB03','Phao chuối','per5Pax',1500000,NULL,NULL,NULL,NULL,NULL,NULL,3,1,${T},${T}),
  ('TTB06','Motor nước','perPax',800000,NULL,NULL,NULL,NULL,NULL,NULL,4,1,${T},${T});
UPDATE catalog_sync SET last_attempt_at = ${T}, last_success_at = ${T} WHERE id = 'default';`;

/** Khoá thử CHÍNH THỨC của Cloudflare (luôn đạt; không phải khoá thật, không tạo tài nguyên nào trên Cloudflare). Cùng giá trị với `TURNSTILE_TEST` ở tests/e2e/lib.mjs. */
export const TURNSTILE_TEST = { siteKey: "1x00000000000000000000AA", secret: "1x0000000000000000000000000000000AA" };

/**
 * `turnstile: true` → máy chủ BẬT Turnstile bằng khoá thử (cần mạng: widget tải script của Cloudflare, máy chủ gọi siteverify); mặc định TẮT (offline).
 * `passkey: true` → máy chủ BẬT Face ID (`PASSKEY_RP_ID=localhost`, `PASSKEY_ORIGIN=http://localhost:<port>`); mặc định TẮT (rỗng), để `vars` production của
 * `wrangler.jsonc` (`booking.tourdao.vn`) KHÔNG lọt vào các kịch bản Chrome cũ không chủ đích kiểm Face ID (B-22) — nút Face ID và lời mời sau đăng nhập PIN sẽ hiện
 * ở MỌI môi trường cục bộ nếu không ghi đè rỗng ở đây. Trình duyệt không cho tạo passkey trên địa chỉ IP nên khi bật phải dùng `localhost`, không phải `127.0.0.1`.
 */
export async function startEnv({ turnstile = false, passkey = false } = {}) {
  const { insertStaffSql } = await import(pathToFileURL(join(ROOT, "scripts", "staff-lib.mjs")).href);
  const persist = mkdtempSync(join(tmpdir(), "tourdao-a2-"));
  const profile = mkdtempSync(join(tmpdir(), "tourdao-a2-chrome-"));
  const logs = [];
  const wrangler = (args) => execFileSync("npx", ["wrangler", ...args], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", env: { ...process.env, CI: "1" } });
  wrangler(["d1", "migrations", "apply", "tourdao-sales-db", "--local", "--persist-to", persist]);
  const seed = join(persist, "seed.sql");
  writeFileSync(seed, [...(await Promise.all(Object.values(ACCOUNTS).map((a) => insertStaffSql(a)))), CATALOG_SQL].join("\n"));
  wrangler(["d1", "execute", "tourdao-sales-db", "--local", "--persist-to", persist, "--file", seed]);

  const [port, inspector] = [await freePort(), await freePort()];
  const base = `http://127.0.0.1:${port}`;
  const localBase = `http://localhost:${port}`;
  // Turnstile mặc định TẮT có chủ đích: `--var` rỗng ghi đè cả `.dev.vars` của máy (đã kiểm: --var thắng .dev.vars, giá trị rỗng = chưa cấu hình),
  // nên kịch bản chạy offline (không gọi siteverify) và không vỡ dù .dev.vars có khoá Turnstile thật. `startEnv({ turnstile: true })` thay bằng khoá thử của Cloudflare
  // (cần mạng) để kiểm widget ở trang đăng nhập — login() bên dưới đã gửi sẵn token thử nên chạy được ở cả hai chế độ.
  const turnstileVars = turnstile ? [TURNSTILE_TEST.siteKey, TURNSTILE_TEST.secret] : ["", ""];
  // Face ID (ADR-0016) mặc định TẮT cùng lý do trên (B-22): rỗng ghi đè `vars` production của wrangler.jsonc. `startEnv({ passkey: true })` bật bằng `localhost`
  // (Chrome cấm tạo passkey trên địa chỉ IP) — kịch bản dùng `env.localBase` để điều hướng, KHÔNG dùng `env.base` (127.0.0.1) cho các bước cần WebAuthn.
  const passkeyVars = passkey ? ["localhost", localBase] : ["", ""];
  const server = spawn("npx", ["wrangler", "dev", "--port", String(port), "--ip", "127.0.0.1", "--inspector-port", String(inspector), "--persist-to", persist, "--var", `SESSION_SECRET:${randomBytes(48).toString("base64url")}`, "--var", `TURNSTILE_SITE_KEY:${turnstileVars[0]}`, "--var", `TURNSTILE_SECRET_KEY:${turnstileVars[1]}`, "--var", `PASSKEY_RP_ID:${passkeyVars[0]}`, "--var", `PASSKEY_ORIGIN:${passkeyVars[1]}`],
    { cwd: ROOT, detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, CI: "1" } });
  server.stdout.on("data", (d) => logs.push(String(d)));
  server.stderr.on("data", (d) => logs.push(String(d)));
  for (let i = 0; ; i++) {
    if ((await fetch(`${base}/api/auth/me`).catch(() => null))?.status === 401) break;
    if (i > 240 || server.exitCode !== null) throw new Error(`wrangler dev không lên:\n${logs.join("").slice(-2000)}`);
    await sleep(500);
  }

  const cdpPort = await freePort();
  const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  for (let i = 0; ; i++) {
    if ((await fetch(`http://127.0.0.1:${cdpPort}/json/version`).catch(() => null))?.ok) break;
    if (i > 80) throw new Error("Chrome không lên");
    await sleep(250);
  }

  const sql = (query) => JSON.parse(wrangler(["d1", "execute", "tourdao-sales-db", "--local", "--persist-to", persist, "--json", "--command", query]))[0].results;
  /**
   * 2026-09-26 (DK-T3-01 R1 — chủ dự án "loại bỏ hoàn toàn dịch vụ nhập tay"): API không nhận dịch vụ nhập tay MỚI (400), nhưng dữ liệu CŨ vẫn có dịch vụ
   * nhập tay và giao diện vẫn phải hiện đúng chúng. Kịch bản cần một dịch vụ nhập tay thì lập đơn qua API với một dịch vụ DANH MỤC giữ chỗ (vd TTB06), rồi
   * gọi hàm này KHI ĐƠN CÒN NHÁP (trigger 0008 khoá dịch vụ của đơn đã xác nhận): đổi dịch vụ `serviceId` thành nhập tay tên `name`, `adult` khách, thay
   * các dòng tiền của nó bằng `items` ({ description, detail, quantity, unitPrice } — chi tiết rỗng lưu NULL như máy chủ), giữ thứ tự dòng, rồi tính lại
   * tiền đơn trong MỘT câu (trigger tiền 0007). Giảm giá + cọc đã lưu phải ≤ tạm tính mới. Xác nhận đơn (nếu cần) SAU khi gọi hàm này.
   */
  const legacyManual = (orderId, serviceId, { name, adult = 1, items }) => {
    const q = (v) => (v === null || v === undefined || v === "" ? "NULL" : `'${String(v).replaceAll("'", "''")}'`);
    const [{ first }] = sql(`SELECT MIN(sort_order) AS first FROM order_item WHERE service_id = '${serviceId}' AND order_id = '${orderId}'`);
    assert.ok(first !== null, `legacyManual: dịch vụ ${serviceId} không có dòng tiền nào trong đơn ${orderId}`);
    const rows = items.map((it, j) =>
      `('${randomUUID()}','${orderId}','${serviceId}',NULL,NULL,NULL,${q(it.description)},${q(it.detail)},${it.quantity},${it.unitPrice},${it.quantity * it.unitPrice},${first * 1000 + j})`);
    const sum = `(SELECT SUM(line_total) FROM order_item WHERE order_id = '${orderId}')`;
    // MỘT lệnh wrangler cho mọi câu ghi (mỗi lệnh mất vài giây; khoảng lặng dài làm kết nối giữ-sống của fetch chết — xem `login` dưới).
    // Giãn thứ tự dòng của cả đơn ×1000 để chèn các dòng mới đúng chỗ dịch vụ giữ chỗ (ITEM_SELECT xếp theo sort_order của CẢ đơn).
    sql([
      `UPDATE order_item SET sort_order = sort_order * 1000 WHERE order_id = '${orderId}'`,
      `DELETE FROM order_item WHERE service_id = '${serviceId}' AND order_id = '${orderId}'`,
      `INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, catalog_price, description, detail, quantity, unit_price, line_total, sort_order) VALUES ${rows.join(",")}`,
      `UPDATE order_service SET catalog_code = NULL, unit = 'manual', name = ${q(name)}, pax_adult = ${adult}, pax_child = 0, pax_senior = 0, pax_infant = 0 WHERE id = '${serviceId}' AND order_id = '${orderId}'`,
      `UPDATE orders SET subtotal = ${sum}, total = ${sum} - discount, remaining_amount = ${sum} - discount - deposit_amount WHERE id = '${orderId}'`,
    ].join(";\n"));
  };
  // Gửi luôn token thử của Cloudflare (`turnstileToken`): máy chủ không bật Turnstile thì bỏ qua, bật bằng khoá thử thì token này qua được.
  // 2026-09-26: thử lại (tối đa 3 lần) khi ECONNRESET — sau vài lệnh `wrangler d1 execute` (mỗi lệnh vài giây, vd `legacyManual`) kết nối giữ-sống của fetch
  // Node tới máy chủ đã bị đóng; lần gửi đầu dùng lại kết nối chết đó → ECONNRESET, máy chủ KHÔNG nhận yêu cầu (đã đo: không có dòng log nào) nên gửi lại
  // là an toàn (cùng hiện tượng và cách xử lý với va3-smoke.mjs). Mọi `call` của các kịch bản đều đăng nhập trước nên đi qua đây.
  const login = async (account) => {
    const post = () => fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: base, "cf-connecting-ip": `10.9.${Math.floor(Math.random() * 250)}.1` }, body: JSON.stringify({ phone: account.phone, pin: account.pin, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" }) });
    let r;
    for (let i = 0; ; i++) {
      try {
        r = await post();
        break;
      } catch (e) {
        if (i >= 2 || e?.cause?.code !== "ECONNRESET") throw e;
        await sleep(200);
      }
    }
    assert.equal(r.status, 200, `đăng nhập ${account.phone}: ${r.status}`);
    const [pair] = r.headers.get("set-cookie").split(";");
    const i = pair.indexOf("=");
    return { name: pair.slice(0, i), value: pair.slice(i + 1) };
  };

  /** Mở một trang mới (viewport iPhone 390×844 mặc định); trả các hàm điều khiển. */
  async function openPage({ width = 390, height = 844, mobile = true } = {}) {
    const t = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r));
    let id = 0;
    const pending = new Map();
    const consoleErrors = [];
    // Thêm cho v1.0 (không đổi hành vi của `consoleErrors`): `logEntries` = thông điệp do TRÌNH DUYỆT tự ghi (vd "Refused to load the script … Content Security Policy" — vi phạm CSP
    // KHÔNG đi qua Runtime.consoleAPICalled mà qua miền Log); `requests` = mọi yêu cầu mạng của trang (url, method, thân gửi đi); `failed` = yêu cầu hỏng/bị chặn.
    const logEntries = [];
    const requests = [];
    const failed = [];
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
      if (m.method === "Runtime.exceptionThrown") consoleErrors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
      if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
      if (m.method === "Log.entryAdded") logEntries.push({ level: m.params.entry.level, source: m.params.entry.source, text: m.params.entry.text, url: m.params.entry.url });
      if (m.method === "Network.requestWillBeSent") requests.push({ url: m.params.request.url, method: m.params.request.method, postData: m.params.request.postData ?? null });
      if (m.method === "Network.loadingFailed") failed.push({ requestId: m.params.requestId, error: m.params.errorText, blockedReason: m.params.blockedReason ?? null });
    });
    const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    await send("Network.enable"); await send("Runtime.enable"); await send("Page.enable"); await send("Log.enable");
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
    if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true });
    await send("Emulation.setFocusEmulationEnabled", { enabled: true }); // Chrome headless không cấp tiêu điểm cho trang: thiếu dòng này `el.focus()` không bắn sự kiện focus (ô chọn danh mục không mở)
    const ev = async (expression) => {
      const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error(`evaluate lỗi: ${JSON.stringify(r.result.exceptionDetails).slice(0, 500)} ← ${expression.slice(0, 160)}`);
      return r.result.result.value;
    };
    const waitFor = async (expression, what, ms = 8000) => {
      const end = Date.now() + ms;
      for (;;) {
        if (await ev(expression).catch(() => false)) return;
        if (Date.now() > end) throw new Error(`hết giờ chờ: ${what}\n${expression}`);
        await sleep(100);
      }
    };
    const shot = async (path) => { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }); writeFileSync(path, Buffer.from(r.result.data, "base64")); };
    return { send, ev, waitFor, shot, consoleErrors, logEntries, requests, failed, close: () => ws.close() };
  }

  /** Mở `path` với phiên đã đăng nhập của `account`. */
  async function as(account, path, viewport) {
    const page = await openPage(viewport);
    const c = await login(account);
    await page.send("Network.setCookie", { name: c.name, value: c.value, url: base, httpOnly: true });
    await page.send("Page.navigate", { url: base + path });
    await page.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
    return page;
  }

  /** Dọn tiến trình rồi xoá D1 tạm + hồ sơ Chrome (hàng chục MB mỗi lần chạy). Gọi bằng `await env.stop()` trong `finally`: phải đợi Chrome thoát thì xoá thư mục mới sạch. */
  const stop = async () => {
    const exited = chrome.exitCode !== null ? Promise.resolve() : new Promise((r) => chrome.once("exit", r));
    try { chrome.kill("SIGTERM"); } catch { /* đã thoát */ }
    try { process.kill(-server.pid, "SIGTERM"); } catch { /* đã thoát */ }
    await Promise.race([exited, sleep(4000)]);
    await sleep(300); // Chrome ghi nốt hồ sơ trước khi thoát
    for (const dir of [persist, profile]) {
      try { rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* còn tiến trình ghi vào thư mục: bỏ qua, không làm hỏng kết quả kiểm */ }
    }
  };
  return { base, localBase, persist, sql, legacyManual, login, openPage, as, stop, logs };
}

/** Biểu thức JS: gõ `value` vào phần tử `el` (biểu thức trả phần tử) và bắn sự kiện input/change. */
export const setInput = (el, value) => `(() => { const el = ${el}; el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
/** Biểu thức JS: bấm nút có chữ `text` trong `scope` (bộ chọn CSS). */
export const clickText = (scope, text) => `(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)} + ' button, ' + ${JSON.stringify(scope)} + ' a')].find((x) => x.textContent.trim() === ${JSON.stringify(text)}); if (!b) return false; b.click(); return true; })()`;
export const ok = (m) => console.log(`✓ ${m}`);
