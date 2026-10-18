// QR thanh toán (ADR-0108 đ3; đặc tả QR §4.2, §7, §8.1, §8.3, §8.4, §8.10): (1) luật thuần số tiền + DTO danh sách trắng; (2) route thật trên khung thử.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dungQrThanhToan, kiemSoTienQr } from "./rules.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { gieoBanChup } from "../../../tests/audit/gieo-ban-chup.mjs";

test("luật số tiền: Đã giao TRƯỚC còn lại; thiếu ⇒ còn lại; chỉ số nguyên dương viết thường ≤ còn lại", () => {
  assert.deepEqual(kiemSoTienQr({ daGiao: true, conLai: 500, soTienRaw: null }), { ok: false, status: 409, ma: "order_delivered", cau: "Đơn đã giao — không thu thêm." });
  assert.deepEqual(kiemSoTienQr({ daGiao: false, conLai: 0, soTienRaw: null }), { ok: false, status: 409, ma: "nothing_due", cau: "Đơn không còn tiền cần thu." });
  assert.deepEqual(kiemSoTienQr({ daGiao: false, conLai: 700_000, soTienRaw: null }), { ok: true, soTien: 700_000 });
  assert.deepEqual(kiemSoTienQr({ daGiao: false, conLai: 700_000, soTienRaw: "" }), { ok: true, soTien: 700_000 });
  assert.deepEqual(kiemSoTienQr({ daGiao: false, conLai: 700_000, soTienRaw: "200000" }), { ok: true, soTien: 200_000 });
  for (const raw of ["700001", "0", "-1", "1e5", "200000.0", " 200000", "+5", "0x10", "abc", "020000"]) {
    const r = kiemSoTienQr({ daGiao: false, conLai: 700_000, soTienRaw: raw });
    assert.equal(r.ok, false, raw);
    if (!r.ok) assert.equal(r.status, 400, raw);
  }
});

test("DTO: khoá đúng danh sách trắng; nội dung = mã đơn bỏ gạch; tài khoản sai dạng ⇒ lỗi, không ném", () => {
  const tk = { congTy: "CÔNG TY TNHH TOUR ĐẢO", nganHang: "Vietcombank", bin: "970436", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO" };
  const r = dungQrThanhToan({ maDon: "TD-20261008-0012", soTien: 700_000, conLai: 700_000, tk });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(Object.keys(r.dto).sort(), ["chuTaiKhoan", "conLai", "congTy", "maDon", "nganHang", "noiDung", "payload", "soTaiKhoan", "soTien"]);
  assert.equal(r.dto.noiDung, "TD202610080012");
  assert.match(r.dto.payload, /^000201010212/);
  assert.equal(dungQrThanhToan({ maDon: "TD-1", soTien: 1, conLai: 1, tk: { ...tk, bin: "97" } }).ok, false);
});

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const HDV2 = "23232323-2323-4323-8323-232323232323";
const DT = "66666666-6666-4666-8666-666666666666";
const TX = "88888888-8888-4888-8888-888888888888";
const SA = "77777777-7777-4777-8777-777777777777";
const AT = "2026-09-01T00:00:00.000Z";

function setup() {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [HDV2, "0900000012", "Bắc HDV", ["FIELD"]],
    [DT, "0900000006", "Đối Tác", ["PARTNER"]], [TX, "0900000008", "Tài Xế", ["DRIVER"]], [SA, "0900000007", "Chủ", ["SUPER_ADMIN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
/** Đơn 1.000.000 do `owner` lập, đã xác nhận; HDV phụ trách. */
function don(w: any, id: string, ma: string, owner: string): string {
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, ?, ?)`).run(id, ma, owner, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES (?, ?, 'Vé', 'perPax', 2, '2026-10-20')`).run(`${id}-s`, id);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES (?, ?, ?, 'Người lớn', 2, 500000, 1000000)`).run(`${id}-i`, id, `${id}-s`);
  w.sqlite.prepare(`UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?`).run(AT, AT, id);
  gieoBanChup(w.sqlite, id); // 0111: máy chủ chụp lúc xác nhận — thiếu bản chụp thì trigger bil_posting_delivered_terms chặn «Đã giao»
  w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(`${id}-a`, id, `pty-${HDV}`, AT, AT, AT);
  return id;
}
const qr = (w: any, as: string, id: string, so?: string) => w.call("GET", `/api/orders/${id}/qr-thanh-toan${so === undefined ? "" : `?soTien=${encodeURIComponent(so)}`}`, { as });
async function caiTaiKhoan(w: any) {
  const ct = String(w.q("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0].party_id);
  const r = await w.call("PUT", `/api/parties/${ct}/tai-khoan-nhan-tien`, { as: SA, body: { maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO", truocDo: null } });
  assert.equal(r.status, 200, r.text);
}

test("§8.1 + §8.4: chưa cài tài khoản ⇒ 409 đúng câu; cài rồi ⇒ mặc định còn lại 700.000, số nhỏ hơn được, số lớn hơn / sai dạng ⇒ 400", async () => {
  const w = setup();
  const id = don(w, "99999999-9999-4999-8999-000000000012", "TD-20261008-0012", SALES);
  assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: HDV, body: { soTien: 300_000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  let r = await qr(w, SALES, id);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.message, "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống.");
  await caiTaiKhoan(w);
  r = await qr(w, SALES, id);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([r.json.qr.soTien, r.json.qr.conLai, r.json.qr.noiDung, r.json.qr.maDon], [700_000, 700_000, "TD202610080012", "TD-20261008-0012"]);
  assert.deepEqual(Object.keys(r.json.qr).sort(), ["chuTaiKhoan", "conLai", "congTy", "maDon", "nganHang", "noiDung", "payload", "soTaiKhoan", "soTien"]);
  assert.doesNotMatch(r.text, /Nam HDV|Tiền mặt|CASH|người thu/i, "không tên người thu, không hình thức thu");
  assert.equal((await qr(w, SALES, id, "200000")).json.qr.soTien, 200_000);
  for (const so of ["700001", "0", "1e5", "abc"]) assert.equal((await qr(w, SALES, id, so)).status, 400, so);
});

test("§8.3 phạm vi, cổng orders: HDV phụ trách 200, HDV khác 404; Đối tác đơn mình 200, đơn người khác 403; tài xế bị cổng chặn", async () => {
  const w = setup();
  await caiTaiKhoan(w);
  const cuaSales = don(w, "99999999-9999-4999-8999-000000000021", "TD-20261008-0021", SALES);
  const cuaDt = don(w, "99999999-9999-4999-8999-000000000022", "TD-20261008-0022", DT);
  assert.equal((await qr(w, HDV, cuaSales)).status, 200);
  assert.equal((await qr(w, HDV2, cuaSales)).status, 404);
  assert.equal((await qr(w, DT, cuaDt)).status, 200);
  assert.equal((await qr(w, DT, cuaSales)).status, 403);
  assert.equal((await qr(w, TX, cuaSales)).status, 403);
});

const INTERN = "99999999-9999-4999-8999-999999999999";

test("Thứ tự 'quyền trước tài khoản': công ty CHƯA cài tài khoản mà người không được xem đơn vẫn nhận 404 / 403 — không lộ 409 'chưa cài'; người được xem mới nhận 409", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực Tập", perms: ["INTERN"] });
  const cuaSales = don(w, "99999999-9999-4999-8999-000000000051", "TD-20261008-0051", SALES);
  const cuaDt = don(w, "99999999-9999-4999-8999-000000000052", "TD-20261008-0052", DT);
  const cuaThucTap = don(w, "99999999-9999-4999-8999-000000000053", "TD-20261008-0053", INTERN);
  const CHUA_CAI = /chưa cài tài khoản nhận tiền/;
  // CHƯA cài: người KHÔNG được xem đơn bị từ chối ĐÚNG như khi đã cài (404 cho HDV không phụ trách; 403 cho Đối tác / Thực tập xem đơn người khác) và câu trả lời không nhắc tài khoản.
  for (const [ai, id, trangThai] of [[HDV2, cuaSales, 404], [DT, cuaSales, 403], [INTERN, cuaSales, 403]] as const) {
    const r = await qr(w, ai, id);
    assert.equal(r.status, trangThai, `${ai} → ${id}: ${r.text}`);
    assert.doesNotMatch(r.text, CHUA_CAI, `${ai}: quyền phải được hỏi TRƯỚC tài khoản — không lộ việc công ty chưa cài`);
  }
  // Đối chứng: người ĐƯỢC xem đơn (chính chủ) vẫn gặp 409 'chưa cài' — chứng tỏ lời đọc tài khoản vẫn nằm sau cổng quyền chứ không biến mất.
  for (const [ai, id] of [[SALES, cuaSales], [DT, cuaDt], [INTERN, cuaThucTap]] as const) {
    const r = await qr(w, ai, id);
    assert.equal(r.status, 409, `${ai} (đơn của mình): ${r.text}`);
    assert.match(r.json.error.message, CHUA_CAI);
  }
  // ĐÃ cài: Thực tập xem được đơn MÌNH lập, đơn người khác bị từ chối như Đối tác (403, không phải 404 — Thực tập không thuộc nhóm chỉ-xem-đơn-được-giao).
  await caiTaiKhoan(w);
  assert.equal((await qr(w, INTERN, cuaThucTap)).status, 200);
  assert.equal((await qr(w, INTERN, cuaSales)).status, 403);
  assert.equal((await qr(w, DT, cuaSales)).status, 403);
});

test("§8.4: đơn huỷ / đã thu đủ ⇒ 409 không còn tiền; đơn đã Đã giao ⇒ 409 'Đơn đã giao' (kiểm trước còn lại)", async () => {
  const w = setup();
  await caiTaiKhoan(w);
  const du = don(w, "99999999-9999-4999-8999-000000000031", "TD-20261008-0031", SALES);
  assert.equal((await w.call("POST", `/api/orders/${du}/payments`, { as: HDV, body: { soTien: 1_000_000, hinhThuc: "CASH", nguoiThu: "toi" } })).status, 201);
  let r = await qr(w, SALES, du);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.message, "Đơn không còn tiền cần thu.");
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10), du);
  const g = await w.call("POST", `/api/orders/${du}/delivered`, { as: HDV, body: {} });
  assert.equal(g.status, 200, g.text);
  r = await qr(w, SALES, du);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.message, "Đơn đã giao — không thu thêm.");
  const huy = don(w, "99999999-9999-4999-8999-000000000032", "TD-20261008-0032", SALES);
  assert.equal((await w.call("POST", `/api/orders/${huy}/status`, { as: SALES, body: { status: "cancelled", lyDo: "SAI_THONG_TIN" } })).status, 200);
  assert.equal((await qr(w, SALES, huy)).json.error.message, "Đơn không còn tiền cần thu.");
});

test("Review Focus 4: đổi công ty chủ sang hồ sơ chưa cài tài khoản ⇒ 409, không dùng tài khoản công ty cũ", async () => {
  const w = setup();
  await caiTaiKhoan(w);
  const id = don(w, "99999999-9999-4999-8999-000000000041", "TD-20261008-0041", SALES);
  assert.equal((await qr(w, SALES, id)).status, 200);
  // Khuôn `toChucDu` của src/modules/parties/cong-ty-chu.test.ts: Bán hàng lập hồ sơ tổ chức đủ thông tin, Toàn quyền gán vai công ty chủ.
  let r = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "ORGANIZATION", displayName: "Pháp nhân Mới", legalName: "CÔNG TY PHÁP NHÂN MỚI", taxCode: "0312345678", address: "2 Đường Thử" } });
  assert.equal(r.status, 201, r.text);
  const moi = r.json.party.id;
  assert.equal((await w.call("POST", `/api/parties/${moi}/contacts`, { as: SALES, body: { kind: "PHONE", value: "0901 234 567", label: "Hotline", isPrimary: true } })).status, 201);
  r = await w.call("POST", `/api/parties/${moi}/roles`, { as: SA, body: { roleTypeCode: "OWNER_COMPANY" } });
  assert.equal(r.status, 201, r.text);
  r = await qr(w, SALES, id);
  assert.equal(r.status, 409, r.text);
  assert.match(r.json.error.message, /chưa cài tài khoản nhận tiền/);
});
