// Trả sau theo hạn mức (ADR-0168; kế hoạch docs/superpowers/plans/2026-11-05-tra-sau-han-muc-ke-hoach.md Task 6) trên D1 local THẬT (wrangler dev):
//  1) Quyền: Toàn quyền đặt / ngừng hạn mức; Kế toán xem được nhưng không ghi (403); Bán hàng, Hướng dẫn viên không vào màn hạn mức (403);
//  2) Toàn quyền cấp hạn mức cho một hồ sơ đối tác (có vai hưởng hoa hồng) ⇒ 201; đường hẹp `con-duoc-dung` cho người lập đơn thấy đúng số còn được dùng;
//  3) Đơn Trả sau: xác nhận trong hạn mức ⇒ 200 và có hạn trả; đơn thứ hai vượt hạn mức ⇒ 409 bằng câu tiếng Việt; thu tiền thì xác nhận được lại;
//  4) Huỷ đơn đang nợ ⇒ nợ về 0, hạn mức trống ra; ngừng hạn mức ⇒ đơn Trả sau mới không xác nhận được (409), đơn Trả trước vẫn qua.
// Hạn mức dùng số nhỏ (500.000) vì đơn thử ZE1 chỉ 100.000 mỗi người lớn; luật không đổi theo cỡ số. Kiểm vé của đơn Trả sau nằm ở src/tra-sau-ve.test.ts (cần gieo kho vé).
// Dùng salesA / accountant / superAdmin / field / admin (không đổi tài khoản dùng chung). Hồ sơ đối tác tạo mới mỗi lần chạy.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const SA = await session(ACCOUNTS.superAdmin);
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const A = await session(ACCOUNTS.salesA);
const F = await session(ACCOUNTS.field);
const T = Date.now();
const TEN = `Đại Lý Trả Sau ${String(T).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d])}`;
const HAN_MUC = 500_000;
const MA_THO = /\b(credit_\w+|CREDIT|PREPAID|forbidden|invalid_input|stale)\b/;
const thongBao = (r) => r.body?.error?.message ?? "";

// ---- 1) Quyền
let r = await call(A, "GET", "/api/tra-sau/han-muc");
assert.equal(r.status, 403, "Bán hàng không xem được màn hạn mức");
assert.equal((await call(F, "GET", "/api/tra-sau/han-muc")).status, 403, "Hướng dẫn viên không xem được");
r = await call(ACC, "GET", "/api/tra-sau/han-muc");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.coQuyenSua, false, "Kế toán chỉ xem");
r = await call(SA, "GET", "/api/tra-sau/han-muc");
assert.equal(r.status, 200);
assert.equal(r.body.coQuyenSua, true, "Toàn quyền sửa được");
console.log("✓ 1) Quyền: Toàn quyền sửa, Kế toán chỉ xem, Bán hàng và Hướng dẫn viên 403");

// ---- 2) Cấp hạn mức
r = await call(ACC, "POST", "/api/tra-sau/han-muc", { partyId: "pty_khong_co", hanMuc: HAN_MUC, soNgay: 7 });
assert.equal(r.status, 403, "Kế toán không đặt được hạn mức");
r = await call(ADM, "POST", "/api/tra-sau/han-muc", { partyId: "pty_khong_co", hanMuc: HAN_MUC, soNgay: 7 });
assert.equal(r.status, 403, "Quản trị không đặt được hạn mức");
r = await call(ACC, "POST", "/api/parties", { kind: "PERSON", fullName: TEN, contacts: [{ kind: "PHONE", value: "09" + String(T).slice(-8) }] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const BEN = r.body.party.id;
r = await call(SA, "POST", "/api/tra-sau/han-muc", { partyId: BEN, hanMuc: HAN_MUC, soNgay: 7 });
assert.equal(r.status, 409, `hồ sơ chưa mang loại đối tác thì không cấp được: ${JSON.stringify(r.body)}`);
assert.doesNotMatch(thongBao(r), MA_THO, "câu báo không lộ mã thô");
r = await call(ADM, "POST", `/api/parties/${BEN}/roles`, { roleTypeCode: "TRAVEL_AGENCY" });
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await call(SA, "POST", "/api/tra-sau/han-muc", { partyId: BEN, hanMuc: HAN_MUC, soNgay: 7, lyDo: "Đại lý quen, thử luồng" });
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await call(A, "GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { coHanMuc: true, conDuocDung: HAN_MUC, coDonQuaHan: false });
r = await call(ACC, "GET", "/api/tra-sau/han-muc");
const dong = r.body.danhSach.find((x) => x.partyId === BEN);
assert.ok(dong, "hồ sơ vừa cấp có trên màn hạn mức");
assert.deepEqual([dong.hanMuc, dong.soNgay, dong.dangNo, dong.conDuocDung, dong.soDonQuaHan], [HAN_MUC, 7, 0, HAN_MUC, 0]);
console.log("✓ 2) Cấp hạn mức 500.000 / 7 ngày ⇒ 201 (hồ sơ chưa là đối tác ⇒ 409); đường hẹp và màn hạn mức thấy đúng số");

// ---- 3) Đơn Trả sau
const lapDon = async (soNguoi, extra = {}) => {
  const x = await call(A, "POST", "/api/orders", orderInput({ bookerPartyId: BEN, services: [catalogService({ pax: { adult: soNguoi }, departDate: vnDate(10) })], ...extra }));
  assert.equal(x.status, 201, JSON.stringify(x.body));
  return x.body.order;
};
const xacNhan = (id) => call(A, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
const don1 = await lapDon(3, { paymentTerm: "CREDIT" });
assert.equal(don1.paymentTerm, "CREDIT");
r = await xacNhan(don1.id);
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(A, "GET", `/api/orders/${don1.id}`);
assert.equal(r.body.order.paymentTerm, "CREDIT");
assert.equal(r.body.order.hanTra, vnDate(7), "hạn trả = ngày xác nhận + 7 ngày");
r = await call(A, "GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN}`);
assert.equal(r.body.conDuocDung, HAN_MUC - 300_000);
const don2 = await lapDon(3, { paymentTerm: "CREDIT" });
r = await xacNhan(don2.id);
assert.equal(r.status, 409, `đơn thứ hai vượt hạn mức: ${JSON.stringify(r.body)}`);
assert.match(thongBao(r), /hạn mức/);
assert.doesNotMatch(thongBao(r), MA_THO);
r = await call(ACC, "GET", `/api/tra-sau/han-muc/${BEN}/don`);
assert.equal(r.status, 200);
assert.deepEqual(r.body.don.map((d) => [d.orderId, d.no, d.quaHan]), [[don1.id, 300_000, false]]);
r = await call(ACC, "POST", `/api/orders/${don1.id}/payments`, { soTien: 300_000, hinhThuc: "CASH", nguoiThu: "cong_ty" });
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await xacNhan(don2.id);
assert.equal(r.status, 200, `đã thu thì hạn mức trống ra: ${JSON.stringify(r.body)}`);
console.log("✓ 3) Đơn Trả sau xác nhận trong hạn mức có hạn trả; đơn vượt ⇒ 409 câu tiếng Việt; thu tiền xong xác nhận được");

// ---- 4) Huỷ và ngừng hạn mức
r = await call(A, "POST", `/api/orders/${don2.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(A, "GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN}`);
assert.equal(r.body.conDuocDung, HAN_MUC, "huỷ đơn đang nợ ⇒ nợ về 0");
assert.equal((await call(ACC, "POST", `/api/tra-sau/han-muc/${BEN}/ngung`, {})).status, 403, "Kế toán không ngừng được");
assert.equal((await call(SA, "POST", `/api/tra-sau/han-muc/${BEN}/ngung`, {})).status, 200);
r = await call(A, "GET", `/api/tra-sau/con-duoc-dung?benDat=${BEN}`);
assert.equal(r.body.coHanMuc, false);
const don3 = await lapDon(1, { paymentTerm: "CREDIT" });
r = await xacNhan(don3.id);
assert.equal(r.status, 409, "hết hạn mức thì đơn Trả sau không xác nhận được");
const don4 = await lapDon(1);
assert.equal((await xacNhan(don4.id)).status, 200, "đơn Trả trước vẫn xác nhận bình thường");
const nk = await sqlRows(`SELECT action FROM audit_log WHERE target_id = '${BEN}' AND action IN ('credit_limit_set','credit_limit_stopped') ORDER BY at`);
assert.deepEqual(nk.map((x) => x.action), ["credit_limit_set", "credit_limit_stopped"]);
console.log("✓ 4) Huỷ đơn nợ ⇒ nợ về 0; ngừng hạn mức ⇒ đơn Trả sau 409, Trả trước vẫn qua; nhật ký đủ hai dòng");
