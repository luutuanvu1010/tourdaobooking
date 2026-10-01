// Phần dùng chung của các kịch bản Chrome Phần B ADR-0049 + ADR-0050 (Bảng điều phối lượt 1; bản vẽ docs/design/van-chuyen-dieu-phoi/). Dựng trên a2-cdp.mjs
// (D1 tạm + wrangler dev + Chrome headless qua CDP; không cần mạng ngoài). Mọi SĐT, tên ở đây là GIẢ.
// Tài khoản dùng một lần: SĐT 0900000431–0900000439 (1a dùng 0900000411–419; mỗi lần chạy là một D1 tạm riêng nên không đụng nhau).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

export { ACCOUNTS, assert, sleep, vnDate };
export const OUT = process.env.OUT ?? "docs/evidence/2026-09-29-adr-0049";
export const AXE = process.env.AXE_JS && existsSync(process.env.AXE_JS) ? readFileSync(process.env.AXE_JS, "utf8") : null;
mkdirSync(join(OUT, "anh"), { recursive: true });

export const DESK = { width: 1040, height: 820, mobile: false };
export const MOB = { width: 390, height: 844, mobile: true };
/** Tài khoản CHỈ Toàn quyền (khuôn nhat-ky-loc-smoke / t2b): ô settings.ops chỉ có ở quyền này. */
export const CHU = { name: "Chủ Điều Phối", phone: "0900000431", pin: "246431", permissions: ["SUPER_ADMIN"] };

/** Bộ đếm bước: bước hỏng không dừng cả kịch bản; cuối cùng `xong()` thoát 1 nếu có bước ✗. */
export function boDem(ten) {
  let passed = 0;
  const fails = [];
  return {
    async step(id, name, fn) {
      try {
        await fn();
        ok(`${id}) ${name}`);
        passed++;
      } catch (e) {
        fails.push(`${id}) ${name}`);
        const msg = String(e?.stack ?? e?.message ?? e).split("\n").slice(0, 14).join("\n    ");
        console.log(`✗ ${id}) ${name}\n    ${msg}`);
      }
    },
    xong() {
      if (fails.length) {
        console.log(`\n${ten}: ${passed} ✓, ${fails.length} ✗: ${fails.join(" | ")}`);
        process.exitCode = 1;
      } else console.log(`\n${ten} OK (${passed} bước)`);
    },
  };
}

export const axe = async (p, label) => {
  if (!AXE) return;
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, target: x.nodes.slice(0, 3).map((n) => n.target.join(' ')) })))`);
  const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
  assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
};
export const axeNote = () => (AXE ? ", axe không vi phạm critical/serious" : " (chưa chạy axe: thiếu AXE_JS)");

/** Ảnh cả trang (kéo dài theo nội dung). */
export const shotFull = async (p, name) => {
  await sleep(400);
  await p.shot(join(OUT, "anh", name));
};
/** Ảnh đúng khung nhìn — cho bảng trượt / hộp thoại đang mở. */
export const shotView = async (p, name) => {
  await sleep(450);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", name), Buffer.from(r.result.data, "base64"));
};

/** Biểu thức: chữ đã gọn khoảng trắng của phần tử khớp bộ chọn (null nếu không có). */
export const txt = (sel) => `((el) => el ? el.innerText.replace(/\\s+/g, ' ').trim() : null)(document.querySelector(${JSON.stringify(sel)}))`;
/** Biểu thức: phần tử có hiển thị thật (không display:none ở chính nó hay tổ tiên). */
export const shown = (sel) => `((el) => !!el && el.getClientRects().length > 0)(document.querySelector(${JSON.stringify(sel)}))`;
/** Biểu thức: gõ vào ô (bắn input + change). */
export const typeInto = (sel, value) =>
  `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
/** Biểu thức: bấm phần tử ĐANG HIỂN THỊ khớp bộ chọn. */
export const click = (sel) => `(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.getClientRects().length > 0); if (!el) return false; el.click(); return true; })()`;
/** Biểu thức: nhãn các mục con dưới "Vận chuyển" ở thanh bên (theo thứ tự) + mục đang sáng. */
export const vcSub = `(() => ({ items: [...document.querySelectorAll('#sidebar .sidebar-sub')].map((a) => a.innerText.replace(/\\s+/g, ' ').trim().replace(/\\s*\\d+$/, '')), current: document.querySelector('#sidebar .sidebar-sub[aria-current="page"]')?.innerText.trim() ?? null }))()`;
/** Biểu thức: trang không tràn ngang. */
export const noOverflowX = `document.documentElement.scrollWidth <= window.innerWidth + 1`;
/** Biểu thức: chữ hiển thị của `main` không lộ mã kỹ thuật (mã HOA có gạch dưới, trạng thái tiếng Anh). */
export const noCode = `(() => { const t = document.querySelector('main').innerText; const m = t.match(/\\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\\b|\\b(RUNNING|PLANNED|VEHICLE|DRIVER|PHA_LE|INSPECTION|TPL_INSURANCE|undefined|null|NaN)\\b/); return m ? m[0] : ''; })()`;
/** Đường dẫn các lời gọi /api/* một trang đã gửi (kèm phương thức). */
export const apiCalls = (p) => p.requests.map((r) => ({ method: r.method, path: new URL(r.url).pathname, body: r.postData })).filter((r) => r.path.startsWith("/api/"));

/** Dựng môi trường + tài khoản thêm + hàm gọi API (khuôn vc-lib.mjs của lượt 1a). */
export async function dungMoiTruong(extra = []) {
  const env = await startEnv();
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const a of extra) for (const stmt of (await insertStaffSql(a)).split("\n")) if (stmt.trim()) env.sql(stmt);
  const cookies = new Map();
  const call = async (account, method, path, body) => {
    if (!cookies.has(account.phone)) cookies.set(account.phone, await env.login(account));
    const c = cookies.get(account.phone);
    const r = await fetch(env.base + path, {
      method,
      headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* không phải JSON */ }
    return { status: r.status, json, text };
  };
  return { env, call };
}

// ---- Dữ liệu dùng chung cho ba màn văn phòng B1–B3 (Điều phối xe, Chi tiết chuyến, Tạo / sửa chuyến) ------------------------------------------------------
// Đi ĐƯỜNG THẬT (route API) trừ việc lấy party id của tài xế (đọc SQL). Mọi biển số, SĐT, tên, số giấy tờ ở đây là GIẢ.
//   NGAY_XA = hôm nay + 5 (ngoài mốc) · NGAY_KHOA = hôm nay + 1 (trong mốc 48 giờ đặt ở cuối — giờ đón 10:00 luôn cách bây giờ 10–34 giờ).
//   Đơn xác nhận khi mốc còn là bản gieo (6 giờ) nên KHÔNG cần đặt gấp; sau đó Toàn quyền đổi mốc 48 giờ → chặng NGAY_KHOA "Quá mốc", chuyến NGAY_KHOA đang khoá.
//   Xe: XE_A 15 chỗ đủ Kiểm định + Bảo hiểm; XE_B 29 chỗ THIẾU Bảo hiểm (lý do giữ E); XE_C 15 chỗ đang bảo dưỡng (không chọn được).
//   Tài xế công ty: An, Cường (GPLX D2), Bình (GPLX B — chỉ 8 khách, không lái được xe 15 chỗ).
//   Chuyến: T1 NGAY_XA 07:30–09:30 XE_A · An · O1 (3 khách đủ tên) → sạch; T2 NGAY_XA 07:30–09:30 XE_B · Cường · O2 (2 khách, 1 tên) → bị giữ (giấy tờ xe, thiếu
//   tên); T3 NGAY_XA 14:30–16:30 XE_A · An · O3 rồi O3 đổi nơi đón → bị giữ "nơi đón / trả đã đổi" (điểm lechDon); T4 NGAY_KHOA 10:00–11:30 XE_A · An (trống, khoá).
//   Chưa xếp: O5 NGAY_XA 11:00 (5 khách, nơi trả chưa chốt), O4 NGAY_KHOA 10:00 (2 khách, quá mốc).
export const LOC_BEN_TAU = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)
export async function dungDuLieuDieuPhoi(env, call) {
  const NGAY_XA = vnDate(5);
  const NGAY_KHOA = vnDate(1);
  const han = vnDate(300);
  const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
  const xe = async (plateNumber, cho, giay) => {
    const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber, chassisNumber: `DP${plateNumber.replace(/\D/g, "")}`, name: `Xe thử ${plateNumber}`, passengerCapacity: cho });
    dung(r, 201, `thêm xe ${plateNumber}`);
    const v = r.json.vehicle;
    for (const typeCode of giay) dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${v.id}/giay-to`, { typeCode, number: `${typeCode}-${plateNumber}`, expiryDate: han }), 201, `giấy ${typeCode} ${plateNumber}`);
    return v;
  };
  const XE_A = await xe("79A-111.11", 15, ["INSPECTION", "TPL_INSURANCE"]);
  const XE_B = await xe("79A-222.22", 29, ["INSPECTION"]);
  const XE_C = await xe("79A-333.33", 15, ["INSPECTION", "TPL_INSURANCE"]);
  const cMoi = (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/xe/${XE_C.id}`)).json.vehicle;
  dung(await call(ACCOUNTS.admin, "PUT", `/api/van-chuyen/xe/${XE_C.id}`, { plateNumber: cMoi.plateNumber, chassisNumber: cMoi.chassisNumber, name: cMoi.name, modelYear: null, passengerCapacity: 15, status: "maintenance", expectedUpdatedAt: cMoi.updatedAt }), 200, "xe C bảo dưỡng");
  let soDt = 0;
  const taiXe = async (fullName, classCode) => {
    const r = await call(ACCOUNTS.admin, "POST", "/api/staff", { taoHoSoMoi: true, fullName, phone: `09000004${String(50 + ++soDt).padStart(2, "0")}`, roles: ["DRIVER_INTERNAL"] });
    dung(r, 201, `tài xế ${fullName}`);
    const [{ party_id: partyId }] = env.sql(`SELECT party_id FROM staff WHERE id = '${r.json.staff.id}'`);
    dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${partyId}/documents`, { typeCode: "GPLX", number: `79${String(1e9 + soDt)}`, classCode, expiryDate: han }), 201, `GPLX ${fullName}`);
    // Tài khoản đăng nhập được (PIN do POST /api/staff trả một lần) — cho kịch bản của màn tài xế (Cuốc của tôi, chuyến đang chạy).
    return { partyId, ten: fullName, account: { name: fullName, phone: r.json.staff.phone, pin: r.json.pin, permissions: ["DRIVER"] } };
  };
  const AN = await taiXe("Nguyễn Văn An", "D2");
  const CUONG = await taiXe("Phạm Văn Cường", "D2");
  const BINH = await taiXe("Lê Văn Bình", "B");
  const NO_TRIP = { departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  let soDon = 0;
  const don = async (ngay, gio, noiDon, soKhach, soTen, noiTra = LOC_BEN_TAU) => {
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
      customerName: `Khách Điều Phối ${++soDon}`, customerPhone: `0903 100 ${String(200 + soDon)}`, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
      services: [{
        kind: "catalog", catalogCode: "TD101", pax: { adult: soKhach, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP, departDate: ngay,
        legs: [{ direction: "OUT", pickupDate: ngay, pickupTime: gio, pickupLocationId: null, pickupPlace: noiDon, dropoffLocationId: noiTra, dropoffPlace: "" }],
      }],
      passengers: Array.from({ length: soTen }, (_, i) => ({ fullName: `Hành Khách Thử ${soDon}-${i + 1}`, birthYear: 1980 + i, paxCode: null })),
    });
    dung(r, 201, `lập đơn ${noiDon}`);
    const c = await call(ACCOUNTS.admin, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" });
    dung(c, 200, `xác nhận đơn ${noiDon}`);
    return { id: c.json.order.id, ma: c.json.order.orderCode, legId: c.json.order.services[0].legs[0].id, leg: c.json.order.services[0].legs[0] };
  };
  const O1 = await don(NGAY_XA, "08:00", "Sheraton Nha Trang", 3, 3);
  const O2 = await don(NGAY_XA, "08:20", "Amiana Resort", 2, 1);
  const O3 = await don(NGAY_XA, "15:00", "Novotel Nha Trang", 4, 4);
  const O5 = await don(NGAY_XA, "11:00", "Mường Thanh Luxury", 5, 5, null);
  const O4 = await don(NGAY_KHOA, "10:00", "Citadines Bayfront", 2, 2);
  const g = (ngay, gio) => ({ ngay, gio });
  const chuyen = async (xeId, tx, ngay, tu, den) => {
    const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId, taiXePartyId: tx.partyId, batDau: g(ngay, tu), ketThuc: g(ngay, den) });
    dung(r, 201, `tạo chuyến ${ngay} ${tu}`);
    return r.json.chuyen;
  };
  const xep = async (t, legId, soSuat) => {
    const r = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${t.id}/phan-bo`, { version: t.version, requestId: randomUUID(), chang: [{ legId, soSuat }] });
    dung(r, 200, `xếp ${legId} vào ${t.ma}`);
    return r.json.chuyen;
  };
  let T1 = await chuyen(XE_A.id, AN, NGAY_XA, "07:30", "09:30");
  T1 = await xep(T1, O1.legId, 3);
  let T2 = await chuyen(XE_B.id, CUONG, NGAY_XA, "07:30", "09:30");
  T2 = await xep(T2, O2.legId, 2);
  let T3 = await chuyen(XE_A.id, AN, NGAY_XA, "14:30", "16:30");
  T3 = await xep(T3, O3.legId, 4);
  // O3 đổi nơi đón SAU khi xếp (đường thật: sửa chặng đơn đã xác nhận, ngoài mốc) → T3 bị giữ "nơi đón / trả đã đổi".
  dung(await call(ACCOUNTS.salesA, "PUT", `/api/orders/${O3.id}/legs/${O3.legId}`, {
    expectedUpdatedAt: O3.leg.updatedAt,
    leg: { pickupDate: NGAY_XA, pickupTime: "15:00", pickupLocationId: null, pickupPlace: "Novotel Nha Trang cổng phụ", dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" },
  }), 200, "đổi nơi đón O3");
  const T4 = await chuyen(XE_A.id, AN, NGAY_KHOA, "10:00", "11:30");
  dung(await call(CHU, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { minLeadMinutes: 2880, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180 }), 201, "mốc 48 giờ");
  return { NGAY_XA, NGAY_KHOA, XE_A, XE_B, XE_C, AN, CUONG, BINH, O1, O2, O3, O4, O5, T1, T2, T3, T4 };
}
