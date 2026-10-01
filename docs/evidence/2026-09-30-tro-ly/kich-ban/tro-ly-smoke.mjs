// Kiểm khung "Hỗ trợ" (ADR-0066 điều 9) bằng Chrome thật (môi trường A2: D1 tạm + wrangler dev + Chrome headless qua CDP). KHÔNG cần mạng ngoài:
// máy OpenAI GIẢ chạy ngay trong kịch bản (http://127.0.0.1:<cổng>), wrangler dev trỏ vào nó bằng --var OPENAI_BASE_URL + khoá giả.
// Chạy từ GỐC repo: npm run build:web && CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-30-tro-ly/kich-ban/tro-ly-smoke.mjs
//   a  đăng nhập bằng màn /login THẬT (390): khung Hỗ trợ TỰ MỞ một lần ở trang đầu; đóng rồi tải lại ⇒ không tự mở nữa
//   b  390: nút "Hỗ trợ" không che thanh tab (đáy nút ≤ đỉnh thanh tab), vùng chạm ≥ 44px; 1040: nút trong khung nhìn, không che thanh bên
//   c  trang có thanh nút dính đáy (/order-form, 390 + 1040): nút nâng lên, không che nút nào của thanh
//   d  gửi & nhận với máy giả: câu trả lời + dòng "Nguồn: …"; SĐT trong câu hỏi bị che TRƯỚC khi tới máy giả; ô gõ 16px
//   e2 bảo trì bật: người được phép vẫn có nút Hỗ trợ và hỏi được (30/9)
//   e  lỗi lời thường: Toàn quyền tắt trợ lý ⇒ câu "Trợ lý chưa bật…" trong khung (không màn bảo trì, không chữ Anh)
//   f  320: mở khung, không tràn ngang; console sạch ở mọi trang đã mở
//   g  trang Tôi (ADR-0069, sửa 30/9): khối cài đặt cũ đã chuyển sang trang riêng — Toàn quyền có dòng "Trợ lý Hỗ trợ" → /tro-ly-cai-dat; Bán hàng không có
//      (trang riêng kiểm ở docs/evidence/2026-09-30-bang-dieu-khien-tro-ly/kich-ban/bang-dieu-khien-tro-ly-smoke.mjs)
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { ACCOUNTS, ok, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-30-tro-ly";
mkdirSync(join(OUT, "anh"), { recursive: true });
const M = { width: 390, height: 844, mobile: true };
const NARROW = { width: 320, height: 568, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
ACCOUNTS.owner = { name: "Chủ Hệ Thống", phone: "0900000299", pin: "135246", permissions: ["SUPER_ADMIN"] }; // startEnv gieo mọi ACCOUNTS vào D1 tạm

// ---- máy OpenAI giả
const nhan = [];
const may = createServer((req, res) => {
  let raw = "";
  req.on("data", (d) => (raw += d));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    // ADR-0082: cửa dấu vân nghĩa TẮT (503) ⇒ máy chủ lùi về từ khoá; `nhan` chỉ ghi /v1/responses như trước (bảng điều khiển canh đường mới).
    if (req.url === "/v1/embeddings") { res.writeHead(503, { "content-type": "application/json" }); return res.end("{}"); }
    nhan.push(body);
    // Tên đoạn ĐẦU TIÊN của khối "TÀI LIỆU:" CUỐI (máy chủ luôn nối khối này sau lời nhắc — ADR-0073 B4); lời nhắc có "[tên mục]" ở luật Nguồn không tính.
    const ins = String(body.instructions ?? "");
    const ten = /\[([^\]]+)\]/.exec(ins.slice(ins.lastIndexOf("TÀI LIỆU:")))?.[1] ?? "";
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: `1. Vào trang Tôi.\n2. Ở mục Đổi mã PIN, gõ PIN hiện tại và PIN mới.\n3. Bấm Đổi PIN.${ten ? `\nNguồn: [${ten}]` : ""}` }] }],
      usage: { input_tokens: 4000, input_tokens_details: { cached_tokens: 0 }, output_tokens: 500 },
    }));
  });
});
await new Promise((r) => may.listen(0, "127.0.0.1", r));
const PORT = may.address().port;

const failures = [];
async function step(id, name, fn) {
  try {
    await fn();
    ok(`${id}) ${name}`);
  } catch (e) {
    failures.push(id);
    console.log(`✗ ${id}) ${name}\n    ${String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ")}`);
  }
}
const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const rect = (sel) => `(() => { const el = ${q(sel)}; if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; })()`;
const khungMo = `!!${q("#tl-khung.tl-khung")}`;
const tatCa = [];

const env = await startEnv({ vars: { OPENAI_API_KEY: "khoa-gia-chrome", OPENAI_BASE_URL: `http://127.0.0.1:${PORT}` } });
const api = async (account, method, path, body) => {
  const c = await env.login(account);
  const r = await fetch(env.base + path, { method, headers: { cookie: `${c.name}=${c.value}`, "content-type": "application/json", origin: env.base }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
};
try {
  await step("a", "đăng nhập qua /login ⇒ khung Hỗ trợ tự mở một lần; tải lại ⇒ không tự mở", async () => {
    const p = await env.openPage(M);
    tatCa.push(p);
    await p.send("Page.navigate", { url: env.base + "/login" });
    // Chờ login.js CHẠY XONG (nó ghi dòng phiên bản #release đồng bộ) rồi mới gõ — gõ trước khi script gắn trình nghe thì lần bấm đầu có thể không gửi (đã gặp: chập chờn).
    await p.waitFor(`!!${q("#phone")} && !!${q("#release")}?.textContent.trim()`, "màn đăng nhập dựng xong (login.js đã chạy)", 15000);
    await p.ev(`(() => { const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }; set('phone', ${JSON.stringify(ACCOUNTS.salesA.phone)}); set('pin', ${JSON.stringify(ACCOUNTS.salesA.pin)}); return true; })()`);
    await p.waitFor(`!${q("#submit")}.disabled`, "nút Đăng nhập mở (đủ SĐT + PIN, đã biết cấu hình)", 15000);
    await p.ev(`${q("#submit")}.click(), true`);
    await p.waitFor(`location.pathname !== '/login'`, "rời trang đăng nhập", 15000);
    await p.waitFor(`location.pathname === '/' && ${khungMo}`, "về Trang chủ và khung Hỗ trợ tự mở", 15000);
    assert.equal(await p.ev(`${q(".tl-khung .tl-tieu-de")}.textContent`), "Hỗ trợ");
    // Chủ dự án 1/10 (bản 1.57): bỏ hai dòng nhắc trong khung (ý vẫn ở trang Trợ giúp) — khẳng định KHÔNG còn.
    assert.equal(await p.ev(`document.querySelectorAll(".tl-khung .tl-luu-y").length`), 0);
    const chuKhung = await p.ev(`${q(".tl-khung")}.innerText`);
    assert.ok(!chuKhung.includes("Trả lời do AI") && !chuKhung.includes("Câu hỏi được lưu"), "hai dòng nhắc đã bỏ");
    await p.shot(join(OUT, "anh/a-tu-mo-390.png"));
    await p.ev(`${q(".tl-khung .tl-dong")}.click(), true`);
    await p.waitFor(`!${khungMo}`, "đóng khung");
    await p.send("Page.reload", {});
    await p.waitFor(`document.readyState === 'complete' && !!${q("#tl-fab")}`, "tải lại xong, có nút", 10000);
    await sleep(800);
    assert.equal(await p.ev(khungMo), false, "tải lại KHÔNG tự mở lần nữa");
  });

  await step("b", "390: nút không che thanh tab, ≥ 44px; 1040: nút trong khung nhìn, không đè thanh bên", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/orders", M);
    tatCa.push(p);
    await p.waitFor(`!!${q("#tl-fab")} && !!${q("#tabbar")}`, "có nút và thanh tab", 10000);
    const [fab, tab] = [await p.ev(rect("#tl-fab")), await p.ev(rect("#tabbar"))];
    assert.ok(fab.bottom <= tab.top, `đáy nút ${fab.bottom} phải ≤ đỉnh thanh tab ${tab.top}`);
    assert.ok(fab.height >= 43.5, `nút cao ${fab.height}px`);
    assert.ok(fab.right <= 390 && fab.left >= 0);
    await p.shot(join(OUT, "anh/b-nut-390.png"));
    const d = await env.as(ACCOUNTS.salesA, "/orders", DESK);
    tatCa.push(d);
    await d.waitFor(`!!${q("#tl-fab")} && !!${q("#sidebar")}`, "có nút và thanh bên", 10000);
    const [f2, sb] = [await d.ev(rect("#tl-fab")), await d.ev(rect("#sidebar"))];
    assert.ok(f2.bottom <= 800 && f2.right <= 1040, JSON.stringify(f2));
    assert.ok(f2.left >= sb.right, "nút không đè thanh bên");
    await d.shot(join(OUT, "anh/b-nut-1040.png"));
  });

  await step("c", "/order-form (thanh nút dính đáy): nút nâng lên, không che nút nào của thanh — 390 + 1040", async () => {
    for (const vp of [M, DESK]) {
      const p = await env.as(ACCOUNTS.salesA, "/order-form", vp);
      tatCa.push(p);
      await p.waitFor(`!!${q("#tl-fab")} && !!${q(".form-actions")}`, "có nút và thanh lưu", 10000);
      await p.ev("window.scrollTo(0, 0), true");
      await sleep(300);
      const f = await p.ev(rect("#tl-fab"));
      const nut = await p.ev(`[...document.querySelectorAll('.form-actions button, .form-actions a')].filter((b) => b.offsetParent).map((b) => { const r = b.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, t: b.textContent.trim() }; })`);
      assert.ok(nut.length > 0, "thanh có nút");
      for (const b of nut) {
        const giao = !(f.right <= b.left || f.left >= b.right || f.bottom <= b.top || f.top >= b.bottom);
        assert.equal(giao, false, `${vp.width}: nút Hỗ trợ đè nút "${b.t}" ${JSON.stringify({ f, b })}`);
      }
      await p.shot(join(OUT, `anh/c-order-form-${vp.width}.png`));
    }
  });

  await step("d", "gửi & nhận: câu trả lời + Nguồn; SĐT bị che trước khi tới máy giả; ô gõ 16px", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/orders", M);
    tatCa.push(p);
    await p.waitFor(`!!${q("#tl-fab")}`, "có nút", 10000);
    await p.ev(`${q("#tl-fab")}.click(), true`);
    await p.waitFor(khungMo, "mở khung");
    assert.equal(await p.ev(`getComputedStyle(${q(".tl-o")}).fontSize`), "16px");
    const n = nhan.length;
    await p.ev(`(() => { const o = ${q(".tl-o")}; o.value = 'Khách 0905 123 456 hỏi đổi mã PIN thế nào?'; ${q(".tl-gui")}.click(); return true; })()`);
    await p.waitFor(`document.querySelectorAll('.tl-tin-tro-ly:not(.tl-dang-tra)').length >= 2`, "có câu trả lời", 15000);
    assert.equal(nhan.length, n + 1);
    const input = String(nhan.at(-1).input);
    assert.ok(!/\d{3}/.test(input) && input.includes("[đã che]"), input);
    const tra = await p.ev(`[...document.querySelectorAll('.tl-tin-tro-ly:not(.tl-dang-tra)')].at(-1).innerText`);
    assert.match(tra, /Bấm Đổi PIN\./);
    assert.match(tra, /Nguồn: /);
    assert.equal(await p.ev(`${q(".tl-gui")}.disabled`), false);
    await p.shot(join(OUT, "anh/d-hoi-dap-390.png"));
  });

  await step("e", "Toàn quyền tắt ⇒ khung báo 'Trợ lý chưa bật…' lời thường, không màn bảo trì", async () => {
    assert.equal((await api(ACCOUNTS.owner, "POST", "/api/tro-ly/cai-dat", { bat: false, tranThangUsd: 5, tranNgay: 30 })).status, 200);
    try {
      const p = await env.as(ACCOUNTS.salesA, "/orders", M);
      tatCa.push(p);
      await p.waitFor(`!!${q("#tl-fab")}`, "có nút", 10000);
      await p.ev(`${q("#tl-fab")}.click(), true`);
      await p.waitFor(khungMo, "mở khung");
      await p.ev(`(() => { ${q(".tl-o")}.value = 'đổi PIN'; ${q(".tl-gui")}.click(); return true; })()`);
      await p.waitFor(`!!${q(".tl-tin-loi")}`, "có câu lỗi", 10000);
      assert.match(await p.ev(`${q(".tl-tin-loi")}.textContent`), /^Trợ lý chưa bật/);
      assert.equal(await p.ev(`!!${q(".maint-screen")}`), false, "không bật màn bảo trì");
      await p.shot(join(OUT, "anh/e-chua-bat-390.png"));
    } finally {
      await api(ACCOUNTS.owner, "POST", "/api/tro-ly/cai-dat", { bat: true, tranThangUsd: 5, tranNgay: 30 });
    }
  });

  // e2 (thêm 30/9 sau khi chủ báo "chưa thấy trợ lý bật lên" lúc bảo trì đang bật): người ĐƯỢC PHÉP dùng app khi bảo trì vẫn có nút Hỗ trợ và hỏi được.
  await step("e2", "bảo trì đang bật: người được phép vẫn thấy nút Hỗ trợ và hỏi được", async () => {
    env.sql(`UPDATE mnt_setting SET allowed_phones = '${ACCOUNTS.owner.phone}' WHERE id = 'default'`);
    const han = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    assert.equal((await api(ACCOUNTS.owner, "PUT", "/api/maintenance", { on: true, endsAt: han })).status, 200);
    try {
      const p = await env.as(ACCOUNTS.owner, "/account", M);
      tatCa.push(p);
      await p.waitFor(`!!${q("#tl-fab")}`, "có nút Hỗ trợ khi bảo trì", 10000);
      await p.ev(`${q("#tl-fab")}.click(), true`);
      await p.waitFor(khungMo, "mở khung");
      await p.ev(`(() => { ${q(".tl-o")}.value = 'đổi PIN'; ${q(".tl-gui")}.click(); return true; })()`);
      await p.waitFor(`document.querySelectorAll(".tl-tin-tro-ly:not(.tl-dang-tra)").length >= 2 || !!${q(".tl-tin-loi")}`, "có trả lời (ngoài câu chào)", 15000);
      assert.equal(await p.ev(`!!${q(".tl-tin-loi")}`), false, "không báo lỗi khi bảo trì");
      await p.shot(join(OUT, "anh/e2-bao-tri-390.png"));
    } finally {
      await api(ACCOUNTS.owner, "PUT", "/api/maintenance", { on: false });
    }
  });

  await step("f", "320: khung mở không tràn ngang", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/orders", NARROW);
    tatCa.push(p);
    await p.waitFor(`!!${q("#tl-fab")}`, "có nút", 10000);
    assert.equal(await p.ev("document.documentElement.scrollWidth - innerWidth"), 0, "trang không tràn");
    await p.ev(`${q("#tl-fab")}.click(), true`);
    await p.waitFor(khungMo, "mở khung");
    await sleep(400);
    assert.equal(await p.ev("document.documentElement.scrollWidth - innerWidth"), 0, "khung không tràn");
    const k = await p.ev(rect(".tl-khung"));
    assert.ok(k.left >= 0 && k.right <= 320, JSON.stringify(k));
    await p.shot(join(OUT, "anh/f-khung-320.png"));
  });

  await step("g", "trang Tôi: Toàn quyền có dòng 'Trợ lý Hỗ trợ' sang trang riêng (khối cũ đã bỏ); Bán hàng không", async () => {
    const s = await env.as(ACCOUNTS.salesA, "/account", M);
    tatCa.push(s);
    await s.waitFor(`!!${q("#links")} && ${q("#links")}.children.length > 0`, "trang Tôi dựng xong", 10000);
    await sleep(500);
    assert.equal(await s.ev(`[...document.querySelectorAll('#links a')].some((a) => a.getAttribute('href') === '/tro-ly-cai-dat')`), false, "Bán hàng không có dòng");
    const o = await env.as(ACCOUNTS.owner, "/account", M);
    tatCa.push(o);
    await o.waitFor(`[...document.querySelectorAll('#links a')].some((a) => a.getAttribute('href') === '/tro-ly-cai-dat')`, "Toàn quyền có dòng Trợ lý Hỗ trợ", 10000);
    assert.equal(await o.ev(`!!document.getElementById('tro-ly-cai-dat')`), false, "khối cài đặt cũ đã bỏ");
    await o.shot(join(OUT, "anh/g-dong-tro-ly-toan-quyen-390.png"));
  });

  await step("h", "console sạch ở mọi trang đã mở", async () => {
    const loi = tatCa.flatMap((p) => p.consoleErrors).filter((e) => !/Failed to load resource: the server responded with a status of 503/.test(e));
    assert.deepEqual(loi, []);
  });
} finally {
  for (const p of tatCa) p.close();
  may.close();
  await env.stop();
}
if (failures.length) {
  console.log(`\n${failures.length} bước lỗi: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nTất cả bước đạt.");
