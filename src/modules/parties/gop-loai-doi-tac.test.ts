// ADR-0117 lần 1, tiêu chí N-11 (1) — «bài chạy thật, CHỈ GHI NHẬN hành vi» của gộp hồ sơ (ADR-0068) khi hai hồ sơ mang loại đối tác KHÁC nhau và hồ sơ phụ có đơn đã
// xác nhận. Chạy CẢ ứng dụng trên SQLite thật (khung tests/audit/harness.mjs). Bài KHÔNG sửa mã để cho xanh: các khẳng định dưới đây là hành vi THẬT của mã hôm nay (ghi ngày
// 2026-10-14); nếu một hành vi sai tiền thì khẳng định vẫn ghi đúng hiện trạng và việc sửa là việc RIÊNG (xem nhật ký thi công, mục «mở việc riêng»).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SUP = "77777777-7777-4777-8777-777777777777";
const AT = "2026-10-01T00:00:00.000Z";
const TEN_PHU = "Phụ Spa Một";
const TEN_CHINH = "Chính Spa Hai";
const homNay = (): string => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
let seq = 0;

function nen() {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "Bán Hàng", ["SALES"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]], [KT, "0900000004", "Kế Toán", ["ACCOUNTING"]], [SUP, "0900000007", "Chủ", ["SUPER_ADMIN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
async function themLoai(w: any, ten: string): Promise<string> {
  const r = await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten } });
  assert.equal(r.status, 201, r.text);
  return r.json.loai.code as string;
}
async function taoNguoi(w: any, ten: string): Promise<string> {
  const r = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: ten } });
  assert.equal(r.status, 201, r.text);
  return r.json.party.id as string;
}
async function gan(w: any, partyId: string, code: string): Promise<void> {
  const r = await w.call("POST", `/api/parties/${partyId}/roles`, { as: ADM, body: { roleTypeCode: code } });
  assert.equal(r.status, 201, r.text);
}
async function mucVai(w: any, code: string, tyLeBp: number): Promise<void> {
  const r = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "VAI", code }, phamVi: "ALL", kieu: "RATE", tyLeBp, tuNgay: "2026-01-01" } });
  assert.equal(r.status, 201, r.text);
}
/** Đơn nháp 2.000.000 đ bằng SQL (một dòng dịch vụ), rồi xác nhận qua route (chụp mức trong lô). */
async function donXacNhan(w: any, booker: string): Promise<string> {
  const id = `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 2000000, 2000000, 2000000, ?, ?, ?)`).run(id, `TD-G${seq}`, SALES, booker, AT, AT);
  const s = `${id}-s0`;
  w.sqlite.prepare("INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'HONTAM', 'DV 0', 'perPax', 1, ?)").run(s, id, homNay());
  w.sqlite.prepare("INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 1, 2000000, 2000000, 2000000)").run(`${s}-i`, id, s);
  const xn = await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  return id;
}
const chupHienHanh = (w: any, orderId: string) =>
  w.q(`SELECT t.beneficiary_party_id AS ben, t.commission_status AS st, t.missing_reason AS mr, t.commission_rate_bp AS bp, t.commission_rule_id AS rule, t.source
    FROM ord_service_terms t WHERE t.order_id = ? AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)`, orderId).map((x: any) => ({ ...x }));

test("N-11 (1): gộp hồ sơ phụ (loại A, đơn đã xác nhận) vào hồ sơ chính (loại B, mức khác) — GHI NHẬN hành vi thật", async () => {
  const w = nen();
  const maA = await themLoai(w, "Loại gộp một");
  const maB = await themLoai(w, "Loại gộp hai");
  const phu = await taoNguoi(w, TEN_PHU);
  const chinh = await taoNguoi(w, TEN_CHINH);
  await gan(w, phu, maA);
  await gan(w, chinh, maB);
  await mucVai(w, maA, 1000);
  await mucVai(w, maB, 2000);
  const d1 = await donXacNhan(w, phu);
  const truoc = chupHienHanh(w, d1);
  assert.equal(truoc.length, 1);
  assert.deepEqual([truoc[0].ben, truoc[0].st, truoc[0].bp], [phu, "SET", 1000], "trước gộp: người hưởng = hồ sơ phụ, mức của loại A (10%)");

  // Xem trước rồi xác nhận gộp: không bị chặn; loại A của hồ sơ phụ được chuyển sang hồ sơ chính.
  const xem = await w.call("POST", `/api/parties/${phu}/merge/preview`, { as: ADM, body: { intoPartyId: chinh } });
  assert.equal(xem.status, 200, xem.text);
  assert.deepEqual(xem.json.chan, [], "không có lý do chặn: loại đối tác không phải vai nội bộ");
  assert.deepEqual(xem.json.chuyen.map((x: any) => x.nhan), ["Loại gộp một — mọi nơi"], "xem trước nói loại A được chuyển sang hồ sơ chính");
  assert.equal(xem.json.donDoi, 1, "một đơn đổi bên đặt sang hồ sơ chính");
  const g = await w.call("POST", `/api/parties/${phu}/merge`, { as: ADM, body: { intoPartyId: chinh, xacNhan: TEN_PHU } });
  assert.equal(g.status, 200, g.text);
  assert.deepEqual([...g.json.party.roleCodes].sort(), [maA, maB].sort(), "hồ sơ chính nay mang CẢ HAI loại");

  // (7) Đơn đã chụp KHÔNG đổi: bản chụp hiện hành y nguyên — vẫn trỏ HỒ SƠ PHỤ (hồ sơ đã gộp đi) với 10%, không chụp lại, không về 0.
  assert.deepEqual(chupHienHanh(w, d1), truoc, "bản chụp của đơn đã xác nhận giữ nguyên sau gộp");
  assert.equal(w.q("SELECT count(*) n FROM ord_service_terms WHERE order_id = ?", d1)[0].n, 1, "không thêm bản chụp mới");
  const tm1 = await w.call("GET", `/api/orders/${d1}/thuong-mai`, { as: SALES });
  assert.equal(tm1.status, 200, tm1.text);
  assert.deepEqual([tm1.json.vanPhong.tong.hoaHong, tm1.json.vanPhong.tong.giaDaiLy], [200000, 1800000], "số hoa hồng của đơn đã chụp không đổi");
  // GHI NHẬN (cần mắt người): phần «Phần đối tác» của đơn cũ vẫn ghi người hưởng theo bản chụp = TÊN hồ sơ phụ, trong khi bên đặt đã đổi sang hồ sơ chính.
  assert.equal(tm1.json.vanPhong.nguoiHuong.ten, TEN_PHU);
  const don1 = await w.call("GET", `/api/orders/${d1}`, { as: SALES });
  assert.deepEqual([don1.json.order.bookerPartyId, don1.json.order.bookerName, don1.json.order.bookerLaDoiTac], [chinh, TEN_CHINH, true], "trang đơn: bên đặt = hồ sơ chính (bản chụp còn tên hồ sơ phụ)");

  // Đơn MỚI của hồ sơ chính (nay mang hai loại, hai mức khác nhau ở CÙNG bậc): theo ADR điều 3 — dòng «thiếu mức» (RULE_CONFLICT) có người hưởng, KHÔNG BAO GIỜ 0.
  const d2 = await donXacNhan(w, chinh);
  const moi = chupHienHanh(w, d2);
  assert.equal(moi.length, 1);
  assert.deepEqual([moi[0].ben, moi[0].st, moi[0].mr, moi[0].bp, moi[0].rule], [chinh, "MISSING", "RULE_CONFLICT", null, null], "hai mức khác nhau cùng bậc ⇒ thiếu mức, không lấy 0");
  const tm2 = await w.call("GET", `/api/orders/${d2}/thuong-mai`, { as: SALES });
  assert.deepEqual([tm2.json.vanPhong.tong.hoaHong, tm2.json.vanPhong.tong.giaDaiLy], [null, null], "tổng không tính khi còn dòng thiếu mức");
  assert.deepEqual(tm2.json.vanPhong.dong.map((x: any) => x.thieu), ["Hai mức khác nhau cùng áp — Kế toán chọn một"]);
});
