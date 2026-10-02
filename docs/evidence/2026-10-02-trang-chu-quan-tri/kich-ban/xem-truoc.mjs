// Ảnh xem trước Trang chủ 1.73 (bản vẽ Claude Design "Trang chu Quan tri.dc.html", 2/10) — Quản trị và Toàn quyền ở 1440 / 1280 / 1040 / 768 / 390, hộp
// "Tất cả chức năng" máy tính + bảng trượt điện thoại; đo tràn ngang và số bị cắt. D1 tạm, không cần mạng ngoài. Chạy từ GỐC repo, sau `npm run build:web`:
//   OUT=docs/evidence/2026-10-02-trang-chu-quan-tri AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh \
//     node docs/evidence/2026-10-02-trang-chu-quan-tri/kich-ban/xem-truoc.mjs
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, DRIVER, DRIVER2, OUT, SUPER, assert, axe, dungMoiTruong, shotFull, shotView, sleep, vnDate } from "../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs";

mkdirSync(join(OUT, "anh"), { recursive: true });
const { env, ids, call, themXe, themGiayXe, themGiayNguoi } = await dungMoiTruong([SUPER, DRIVER, DRIVER2]);
const TODAY = vnDate(0);
const phutVN = () => { const d = new Date(Date.now() + 7 * 3600e3); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const hhmm = (m) => { const x = Math.min(Math.max(m, 0), 23 * 60 + 59); return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };

const dichVu = (pickupTime, pickupPlace, adult = 2) => ({
  kind: "catalog", catalogCode: "TTB06", pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800_000 },
  departDate: TODAY, departTime: "", pickupTime, pickupPlace, checkinDate: "", checkinTime: "", checkinPlace: "", note: "",
});
const lapVaXacNhan = async (ten, sdt, dv, traDu) => {
  const r = await call(ACCOUNTS.admin, "POST", "/api/orders", { customerName: ten, customerPhone: sdt, customerEmail: "", customerNote: "", services: [dv], discount: 0, paymentNote: "" });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const id = r.json.order.id;
  let x = await call(ACCOUNTS.admin, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
  if (x.status === 409 && x.json?.error?.code === "short_notice_required") {
    for (const { legId } of x.json.error.legs) assert.equal((await call(ACCOUNTS.admin, "POST", `/api/orders/${id}/legs/${legId}/short-notice`, { lyDo: "KHAC", ghiChu: null })).status, 200);
    x = await call(ACCOUNTS.admin, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
  }
  assert.equal(x.status, 200, JSON.stringify(x.json));
  if (traDu) assert.equal((await call(ACCOUNTS.admin, "POST", `/api/orders/${id}/payments`, { soTien: x.json.order.total, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  return id;
};

try {
  // ---- dữ liệu GIẢ: bốn chuyến đón hôm nay quanh giờ hiện tại (một đã qua, một sắp tới), một nháp, cảnh báo giá, hai góp ý, giấy tờ sắp hết hạn
  const n = phutVN();
  await lapVaXacNhan("Trần Văn Bình", "0905123456", dichVu(hhmm(n - 35), "Mường Thanh Luxury"), false);
  await lapVaXacNhan("Lê Thị Mai", "0935882104", dichVu(hhmm(n + 15), "Sheraton Nha Trang", 4), true);
  await lapVaXacNhan("Nguyễn Quốc Huy", "0913557320", dichVu(hhmm(n + 45), "Bến Cầu Đá", 4), false);
  await lapVaXacNhan("Phạm Ngọc Ánh", "0986210447", dichVu(hhmm(n + 100), "Havana Nha Trang", 3), true);
  assert.equal((await call(ACCOUNTS.admin, "POST", "/api/orders", { customerName: "Khách Nháp", customerPhone: "0900000399", customerEmail: "", customerNote: "", services: [dichVu("", "")], discount: 0, paymentNote: "" })).status, 201);
  env.sql(`INSERT INTO catalog_override (code, hidden, prices_json, base_json, updated_by, updated_at) VALUES ('TD101', 0, '{"adult":1300000}', '{"adult":1200000}', NULL, '2026-01-02T00:00:00.000Z')`);
  for (const [ai, kind, title] of [[ACCOUNTS.salesA, "BUG", "Lỗi tính tiền khi đổi số khách"], [ACCOUNTS.salesB, "IDEA", "Đề xuất lọc theo ngày đón"]]) {
    assert.equal((await call(ai, "POST", "/api/feedback", { kind, title, body: "Nội dung thử.", clientRequestId: crypto.randomUUID(), context: {} })).status, 201);
  }
  const xe = await themXe({ plateNumber: "79B-123.45", chassisNumber: "KHUNGV1000001", name: "Ford Transit", passengerCapacity: 15 });
  await themGiayXe(xe.id, { typeCode: "TPL_INSURANCE", number: "BH-7788", issuedDate: vnDate(-361), expiryDate: vnDate(4) });
  await themGiayNguoi(ids[DRIVER.phone].partyId, { typeCode: "HEALTH_CHECK", issuedDate: vnDate(-363), expiryDate: vnDate(2) });

  const doBoCuc = (p) => p.ev(`(() => {
    const tran = document.documentElement.scrollWidth - innerWidth;
    const cat = [...document.querySelectorAll('.dash-smt-gt, .dash-so-gt, .dash-dai-loi, .dash-o-nhan')].filter((e) => e.getClientRects().length && e.scrollWidth > e.clientWidth + 1).map((e) => e.className + ': ' + e.textContent);
    const t = (s) => document.querySelector(s)?.innerText.replace(/\\s+/g, ' ').trim() ?? null;
    return { tran, cat, tom: t('#dash-dai-tom'), vai: t('.dash-dai-vai'), xin: t('.dash-hero-xin') + ' ' + t('.dash-hero-ngay'),
      loiTat: [...document.querySelectorAll('#dash-loi-tat-luoi .dash-o-nhan')].map((e) => e.textContent), luoiDt: [...document.querySelectorAll('#dash-o .dash-o-nhan')].map((e) => e.textContent),
      review: [...document.querySelectorAll('.dash-review-title')].map((e) => e.textContent) };
  })()`);

  for (const [ai, ten] of [[ACCOUNTS.admin, "quan-tri"], [SUPER, "toan-quyen"]]) {
    for (const w of [1440, 1280, 1040, 768, 390]) {
      const p = await env.as(ai, "/", { width: w, height: w === 390 ? 844 : 900, mobile: w === 390 });
      try {
        await p.waitFor("!document.querySelector('#dash-grid').hidden && document.querySelectorAll('.dash-review-row').length >= 2", "Trang chủ có số liệu + Cần xem lại", 15000);
        await sleep(800);
        const b = await doBoCuc(p);
        console.log(`${ten} ${w}: tràn ngang ${b.tran}px, chữ bị cắt ${JSON.stringify(b.cat)}`);
        console.log(`  tóm tắt="${b.tom}" vai="${b.vai}" | lối tắt=${JSON.stringify(b.loiTat)} | lưới đt=${JSON.stringify(b.luoiDt)} | cần xem lại=${JSON.stringify(b.review)}${w === 390 ? ` | chào đt="${b.xin}"` : ""}`);
        if (w === 1280 || w === 390) await axe(p, `${ten} ${w}`);
        await shotFull(p, `${ten}-${w}.png`);
        if (w === 1280 || w === 390) {
          const nut = w === 390 ? "#dash-o button.dash-o-muc" : "#dash-loi-tat-luoi button.dash-o-muc";
          assert.ok(await p.ev(`(() => { const b = document.querySelector(${JSON.stringify(nut)}); if (!b) return false; b.click(); return true; })()`), "có ô Tất cả");
          await p.waitFor("!!document.querySelector('.sheet.dash-tc')", "hộp Tất cả mở", 5000);
          await shotView(p, `${ten}-${w}-tat-ca.png`);
        }
      } finally {
        p.close();
      }
    }
  }
} finally {
  await env.stop();
}
