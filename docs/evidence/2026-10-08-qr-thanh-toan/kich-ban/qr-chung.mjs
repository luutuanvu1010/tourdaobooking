// Phần DÙNG CHUNG của hai kịch bản Chrome QR thanh toán (qr-smoke.mjs, qr-ma-smoke.mjs) — ADR-0108 + ADR-0092 Đ6. Không chạy riêng.
// Cùng môi trường với các kịch bản Chrome khác: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs), không --remote.
// Quy tắc ADR-0074/0075: một lần đăng nhập MỚI của cùng tài khoản làm phiên của trang đang mở bị thay. Nên: dựng dữ liệu bằng API TRƯỚC khi mở trang; trong lúc có trang
// mở thì đọc / ghi bằng chính trang đó (`p.ev(fetch…)`); đóng trang trước khi mở trang kế của cùng tài khoản.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

export { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate };

export const DESK = { width: 1040, height: 900, mobile: false };
export const MOB = { width: 390, height: 844, mobile: true };
/** Hai khổ chạy mọi khối: điện thoại 390 và máy tính 1040. */
export const KHO = [["390", MOB], ["1040", DESK]];
/** Thư mục ảnh. Ảnh của kịch bản này mang tiền tố `smoke-` để không ghi đè ảnh chụp của Task 10 / 11 cùng thư mục. */
export const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-08-qr-thanh-toan");
mkdirSync(OUT, { recursive: true });

/** Mã nguồn axe-core: lấy bản NGOÀI repo (`npm pack axe-core`, giải nén) và đặt AXE_JS=<…/package/axe.min.js>. Thiếu thì dừng NGAY, trước khi dựng môi trường. */
export function docAxe() {
  const duong = process.env.AXE_JS;
  if (!duong) throw new Error("Thiếu biến AXE_JS: lấy axe-core bằng `npm pack axe-core` (chạy NGOÀI repo), giải nén rồi đặt AXE_JS=<đường dẫn>/package/axe.min.js");
  return readFileSync(duong, "utf8");
}

/** Chụp phần đang nhìn thấy (không chụp cả trang), chờ 0,9 giây cho bảng trượt / cuộn êm xong. Tên tệp tự thêm tiền tố `smoke-`. */
export async function chup(page, ten) {
  await sleep(900);
  const r = await page.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, `smoke-${ten}.png`), Buffer.from(r.result.data, "base64"));
}

/** Chụp đúng khung của phần tử `selector` (lề 12px). */
export async function chupKhung(page, selector, ten) {
  await page.ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'center' }), true`);
  await sleep(900);
  const r = await page.ev(`(() => { const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: Math.max(0, b.left + scrollX - 12), y: Math.max(0, b.top + scrollY - 12), width: Math.min(innerWidth, b.width + 24), height: b.height + 24 }; })()`);
  const s = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...r, scale: 1 } });
  writeFileSync(join(OUT, `smoke-${ten}.png`), Buffer.from(s.result.data, "base64"));
}

/** Biểu thức: banner lỗi (#error) đang hiện và nằm trọn trong khung nhìn, không bị thanh đầu trang dính che. */
export const TRONG_TAM_NHIN = `(() => { const e = document.getElementById('error'); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); const bar = document.getElementById('topbar'); const lim = bar && getComputedStyle(bar).position === 'sticky' ? bar.getBoundingClientRect().bottom : 0; return r.top >= lim - 1 && r.bottom <= innerHeight + 1; })()`;

/**
 * axe-core theo bộ luật chặt (WCAG 2 A + AA + best-practice), MỌI mức độ phải sạch. Chỉ tắt `meta-viewport`: thẻ viewport của mọi trang Nền tảng tắt phóng to theo thiết kế PWA
 * (không do màn QR hay màn Danh bạ). `ctx`: biểu thức JS cho phạm vi (mặc định cả trang).
 */
export async function axeSach(page, AXE, nhan, ctx = "document") {
  if (!(await page.ev("typeof axe !== 'undefined'"))) await page.ev(`${AXE}\n;true`);
  const vi = await page.ev(`axe.run(${ctx}, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => v.impact + ' ' + v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(' | ')))`);
  assert.deepEqual(vi, [], `axe (${nhan}): ${JSON.stringify(vi)}`);
}

/** Không có yêu cầu mạng nào ra ngoài địa chỉ máy chủ thử (bỏ qua data:, blob:, about:). */
export function khongRaNgoai(page, env, nhan) {
  const ngoai = page.requests.map((r) => r.url).filter((u) => !u.startsWith(env.base) && !/^(data|blob|about):/.test(u));
  assert.deepEqual(ngoai, [], `${nhan}: có yêu cầu ra ngoài`);
}

/** Dựng dữ liệu bằng API (mỗi lời gọi đăng nhập lại): CHỈ dùng cho tài khoản chưa có trang nào đang mở. */
export function goiApi(env) {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, {
      method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  /** Đơn ĐÃ XÁC NHẬN `soNguoi` người lớn × 1.350.000 (dịch vụ TD101 của danh mục thử), do Bán hàng một (salesA) lập. */
  const lapDon = async (ten, sdt, soNguoi = 1) => {
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
      customerName: ten, customerPhone: sdt, customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
      services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: soNguoi, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
        departDate: vnDate(3), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
    });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    const x = await call(ACCOUNTS.salesA, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" });
    assert.equal(x.status, 200, JSON.stringify(x.json));
    return r.json.order;
  };
  return { call, lapDon };
}

/** Bấm một nút `<select>` / ô theo bộ chọn, đổi giá trị và bắn sự kiện change. */
export const chonGiaTri = (selector, v) => `(() => { const s = ${selector}; s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
