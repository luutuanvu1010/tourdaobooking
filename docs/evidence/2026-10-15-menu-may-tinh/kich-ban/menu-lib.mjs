// Thư viện dùng chung cho hai kịch bản của bằng chứng "menu máy tính theo việc + Việc của bạn" (15/10, Việc 7b):
//   menu-viec-cua-ban-smoke.mjs (kiểm hành vi) và chup-anh-menu.mjs (chụp ảnh thật theo vai/khổ).
// Dùng lại cơ chế CDP của A2 (startEnv/ACCOUNTS) — D1 local tạm, KHÔNG đụng production. Chạy từ GỐC repo, sau `npm run build:web`.
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

export { ACCOUNTS, vnDate };
export const OTHER_DATE = vnDate(5);
export const TODAY = vnDate(0);

/** Các tài khoản thêm (ngoài ACCOUNTS của A2). Số điện thoại/PIN thử, chỉ sống trong D1 tạm. */
export const THEM = {
  toanQuyen: { name: "Chủ Khung Thử", phone: "0900000396", pin: "998866", permissions: ["ADMIN", "SUPER_ADMIN"] },
  hdv: { name: "Hướng Dẫn Viên Thử", phone: "0900000399", pin: "998877", permissions: ["FIELD"] },
  taiXe: { name: "Tài Xế Thử", phone: "0900000398", pin: "998878", permissions: ["DRIVER"] },
  doiTac: { name: "Đối Tác Thử", phone: "0900000397", pin: "998879", permissions: ["PARTNER"] },
  nhanSu: { name: "Nhân Sự Thử", phone: "0900000394", pin: "998880", permissions: ["HR"] },
};

/** Dựng môi trường + tạo tài khoản thêm. Trả `{ env, call }`; `call(account, method, path, body)` gọi API bằng phiên của tài khoản. */
export async function dungMoiTruong() {
  const env = await startEnv();
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const a of Object.values(THEM)) for (const s of (await insertStaffSql(a)).split("\n")) if (s.trim()) env.sql(s);
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, {
      method,
      headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  return { env, call };
}

const dichVu = ({ departDate, pickupTime, pickupPlace }) => ({
  kind: "catalog", catalogCode: "TTB06", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800_000 },
  departDate, departTime: "", pickupTime, pickupPlace, checkinDate: "", checkinTime: "", checkinPlace: "", note: "",
});
const donMau = (customerName, customerPhone, services) => ({ customerName, customerPhone, customerEmail: "", customerNote: "", services, discount: 0, paymentNote: "" });

/**
 * Gieo dữ liệu thử cho Trang chủ (bằng API thật, như trang-chu-smoke.mjs): một chuyến đón hôm nay (đã trả đủ), một đơn nháp, một đơn xác nhận còn thiếu tiền
 * 12.345.000 ở ngày khác, 3 đơn chưa có người phụ trách, một dịch vụ Sheet đổi giá (Cần xem lại = 1), 2 góp ý mới. Trả số đã gieo để kịch bản đối chiếu.
 */
export async function gieoDuLieu(env, call) {
  const admin = ACCOUNTS.admin;
  const taoVaXacNhan = async (input) => {
    const c = await call(admin, "POST", "/api/orders", input);
    assert.equal(c.status, 201, `tạo đơn: ${JSON.stringify(c.json)}`);
    const id = c.json.order.id;
    let x = await call(admin, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
    // Mốc 6 giờ (ADR-0049): chặng đón hôm nay sát giờ → Quản trị đặt gấp từng chặng rồi xác nhận lại (đường nghiệp vụ thật).
    if (x.status === 409 && x.json?.error?.code === "short_notice_required") {
      for (const { legId } of x.json.error.legs) assert.equal((await call(admin, "POST", `/api/orders/${id}/legs/${legId}/short-notice`, { lyDo: "KHAC", ghiChu: null })).status, 200);
      x = await call(admin, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
    }
    assert.equal(x.status, 200, `xác nhận ${id}: ${JSON.stringify(x.json)}`);
    return x.json.order;
  };
  const r1 = await taoVaXacNhan(donMau("Khách Chuyến Hôm Nay", "0900000301", [dichVu({ departDate: TODAY, pickupTime: "06:15", pickupPlace: "Bến Cầu Đá" })]));
  assert.equal((await call(admin, "POST", `/api/orders/${r1.id}/payments`, { soTien: 800_000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201, "thu đủ R1");
  const r2 = await call(admin, "POST", "/api/orders", donMau("Khách Đơn Nháp", "0900000302", [dichVu({ departDate: OTHER_DATE, pickupTime: "10:00", pickupPlace: "Bến nháp" })]));
  assert.equal(r2.status, 201, JSON.stringify(r2.json));
  const r3 = await taoVaXacNhan(donMau("Khách Còn Thiếu Tiền", "0900000303", [dichVu({ departDate: OTHER_DATE, pickupTime: "08:00", pickupPlace: "Bến khác" })]));
  env.sql(`INSERT INTO catalog_override (code, hidden, prices_json, base_json, updated_by, updated_at) VALUES ('TD101', 0, '{"adult":1300000}', '{"adult":1200000}', NULL, '2026-01-02T00:00:00.000Z')`);
  for (const [acc, kind, title, body] of [
    [ACCOUNTS.salesA, "BUG", "Lỗi thử một (kịch bản menu)", "Nội dung thử để có góp ý mới trong hàng đợi của Toàn quyền."],
    [ACCOUNTS.salesB, "IDEA", "Đề xuất thử hai (kịch bản menu)", "Nội dung thử thứ hai cho hàng đợi góp ý."],
  ]) {
    const f = await call(acc, "POST", "/api/feedback", { kind, title, body, clientRequestId: crypto.randomUUID(), context: {} });
    assert.equal(f.status, 201, JSON.stringify(f.json));
  }
  return { r1: r1.id, r2: r2.json.order.id, r3: r3.id };
}

/**
 * Chèn vào MỌI trang mở sau đó một lớp bọc `fetch`: phản hồi GET /api/ledger/adjustment-requests được đặt `choDuyetChoToi = n` (yêu cầu điều chỉnh công nợ chờ duyệt
 * "của tôi"). Dùng vì tạo yêu cầu thật cần hai bên + hai tài khoản (đã có kịch bản riêng ở docs/evidence/2026-10-13-dieu-chinh-cong-no/); ở đây chỉ kiểm thẻ vẽ đúng.
 * SỐ NÀY LÀ GIẢ (chỉ trong trình duyệt thử) — báo cáo phải nói rõ.
 */
export const tiemDieuChinh = (p, n) =>
  p.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => { const f = window.fetch; window.fetch = async (...a) => { const r = await f(...a); const u = String(a[0]?.url ?? a[0]); if (u.includes('/api/ledger/adjustment-requests') && (a[1]?.method ?? 'GET') === 'GET' && r.ok) { const b = await r.clone().json(); b.choDuyetChoToi = ${n}; return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); } return r; }; })();`,
  });

/** Đo khối "Việc của bạn" (#dash-viec): thẻ, nút, câu còn lại, trạng thái không việc. Chạy trong trang. */
export const DO_VIEC = `(() => {
  const vis = (e) => !!e && e.offsetParent !== null;
  const v = document.querySelector('#dash-viec');
  return {
    shown: vis(v),
    tieuDe: v?.querySelector('.dash-viec-tieu-de')?.textContent.trim() ?? null,
    rong: v?.querySelector('.dash-viec-rong-chu')?.textContent.trim() ?? null,
    rongNut: [...(v?.querySelectorAll('.dash-viec-rong a, .dash-viec-rong button') ?? [])].map((x) => x.textContent.trim()),
    con: v?.querySelector('.dash-viec-con')?.textContent.trim() ?? null,
    tom: document.querySelector('#dash-dai-tom')?.textContent.trim() ?? null,
    the: [...(v?.querySelectorAll('.dash-viec-the') ?? [])].map((t) => ({
      khoa: t.getAttribute('data-khoa'),
      nhan: t.querySelector('.dash-viec-nhan').textContent.trim(),
      phamVi: t.querySelector('.dash-pham-vi')?.textContent.trim() ?? null,
      so: t.querySelector('.dash-viec-so').textContent.replace('chưa tải được', '').trim(),
      phu: t.querySelector('.dash-viec-phu').textContent.trim(),
      nut: [...t.querySelectorAll('.dash-viec-nut a, .dash-viec-nut button')].map((x) => ({ chu: x.textContent.trim(), san: /\\bbtn-accent\\b/.test(x.className), chinh: /\\bbtn-primary\\b/.test(x.className) })),
      soNut: t.querySelectorAll('a, button').length,
    })),
    soThuLai: [...document.querySelectorAll('button')].filter((b) => vis(b) && b.textContent.trim() === 'Thử lại').length,
    daiLoi: vis(document.querySelector('#error')),
  };
})()`;
