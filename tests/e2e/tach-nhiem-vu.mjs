// ADR-0187 Đ3 mức (a) «đánh dấu, không chặn» trên API thật (D1 local tạm): tài khoản kiêm Bán hàng + Kế toán tự ghi tiền cho đơn mình lập → 200 kèm cờ, dòng nhật ký mang dấu;
// Kế toán khác đánh dấu đơn người khác → không cờ; «Đã soát»: chính người ghi 403 tu_soat, Kế toán khác 201, soát lại 409, Bán hàng 403; danh sách và số đếm.
// Đơn dùng NGÀY ĐI riêng (hôm nay + 43) để không lẫn kịch bản khác. Không khoá tháng, không đổi công ty chủ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const SALES = await session(ACCOUNTS.salesA);
const ACC = await session(ACCOUNTS.accountant);
const SA = await session(ACCOUNTS.superAdmin);
// ADR-0083 1b: API không tạo tài khoản lai nữa — gieo SQL để thử luật tách nhiệm vụ cho tài khoản kiêm hai việc.
const LAI = await gieoTaiKhoanLai("Kiêm Bán Kế TNV", ["SALES", "ACCOUNTING"]);
const NGAY = vnDate(43);

async function donXacNhan(cookie) {
  const r = await call(cookie, "POST", "/api/orders", orderInput({ services: [catalogService({ departDate: NGAY })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const c = await call(cookie, "POST", `/api/orders/${r.body.order.id}/status`, { status: "confirmed" });
  assert.equal(c.status, 200, JSON.stringify(c.body));
  return r.body.order.id;
}
let hd = 0;
const dau = (cookie, id) => call(cookie, "POST", `/api/orders/${id}/nhap-ke-toan`, { daNhap: true, soHoaDon: `TNV-${String(Date.now()).slice(-6)}${++hd}`, truocDo: null });
const soat = (cookie, auditId) => call(cookie, "POST", `/api/ledger/tu-ghi/${auditId}/da-soat`, {});
const nhatKy = async (orderId) => sqlRows(`SELECT id, tu_ghi_don_minh_lap AS dau FROM audit_log WHERE order_id = '${orderId}' AND action = 'order_accounting_entry_marked'`);

// 1. Kiêm hai việc, tự ghi cho đơn mình lập → 200 + cờ + dấu ở nhật ký
const minh = await donXacNhan(LAI.cookie);
const r1 = await dau(LAI.cookie, minh);
assert.equal(r1.status, 200, JSON.stringify(r1.body));
assert.equal(r1.body.tuGhiDonMinhLap, true, "thân phản hồi mang cờ tự ghi đơn mình lập");
const [dong] = await nhatKy(minh);
assert.ok(dong, "có dòng nhật ký");
assert.equal(dong.dau, 1, "dòng nhật ký mang dấu");

// 2. Kế toán khác đánh dấu đơn của Bán hàng → không cờ, không dấu
const khac = await donXacNhan(SALES);
const r2 = await dau(ACC, khac);
assert.equal(r2.status, 200, JSON.stringify(r2.body));
assert.equal("tuGhiDonMinhLap" in r2.body, false, "không gửi cờ khi không tự ghi");
assert.equal((await nhatKy(khac))[0]?.dau, null);

// 3. «Đã soát»: chính người ghi 403 tu_soat; Bán hàng 403; Kế toán khác 201; soát lại 409
const tu = await soat(LAI.cookie, dong.id);
assert.equal(tu.status, 403, JSON.stringify(tu.body));
assert.equal(tu.body.error.code, "tu_soat");
assert.equal((await soat(SALES, dong.id)).status, 403, "Bán hàng không có ledger.write");
const ok = await soat(ACC, dong.id);
assert.equal(ok.status, 201, JSON.stringify(ok.body));
const lai = await soat(SA, dong.id);
assert.equal(lai.status, 409, JSON.stringify(lai.body));
assert.equal(lai.body.error.code, "da_soat");
const nk = await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'ledger_self_write_reviewed' AND target_id = '${dong.id}'`);
assert.equal(nk[0].n, 1, "một dòng nhật ký «Đã soát» trỏ về dòng gốc");

// 4. Danh sách và số đếm: Toàn quyền thấy dòng đã soát mang tên người soát; Bán hàng 403
const ds = await call(SA, "GET", "/api/ledger/tu-ghi");
assert.equal(ds.status, 200, JSON.stringify(ds.body));
const d = ds.body.dong.find((x) => x.auditId === dong.id);
assert.ok(d, "dòng vừa soát còn trong danh sách 30 ngày");
assert.equal(d.orderId, minh);
assert.equal(d.nguoiSoat, ACCOUNTS.accountant.name);
assert.equal(d.nguoiGhiId, LAI.id);
assert.deepEqual(Object.keys(d).sort(), ["auditId", "hanhDong", "luc", "maDon", "nguoiGhi", "nguoiGhiId", "nguoiSoat", "orderId", "soatLuc"], "không số tiền, không SĐT");
const dem = await call(ACC, "GET", "/api/ledger/tu-ghi/dem");
assert.equal(dem.status, 200);
assert.equal(typeof dem.body.chuaSoat, "number");
assert.equal(dem.body.chuaSoat, ds.body.soChuaSoat);
assert.equal((await call(SALES, "GET", "/api/ledger/tu-ghi")).status, 403);
assert.equal((await call(SALES, "GET", "/api/ledger/tu-ghi/dem")).status, 403);

console.log("tach-nhiem-vu OK");
