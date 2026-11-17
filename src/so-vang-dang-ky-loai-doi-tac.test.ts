// SỔ VÀNG BỔ SUNG — người đăng ký mang LOẠI ĐỐI TÁC do Kế toán thêm (ADR-0212 Đ3; đợt 2 Task 2). BỔ SUNG, không đổi ca vàng nào có sẵn.
// Đường đi THẬT: Kế toán thêm loại (route) → phiếu qua xác minh và duyệt (route) → tài khoản đối tác → Kế toán đặt mức hoa hồng cho loại đó (route) → đơn đầu tiên của tài khoản xác nhận được
// (không bị giữ «thiếu mức») → «Đã giao» ghi đúng một dòng hoa hồng cho hồ sơ đó, đúng mức. Mức 10% × 2.000.000 = 200.000. Mọi giá trị là GIẢ. Khung thử như src/da-giao-khe-hoa-hong.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const SUPER = "33333333-3333-4333-8333-333333333333";
const ADM = "55555555-5555-4555-8555-555555555555";
const HR = "77777777-7777-4777-8777-777777777777";
const AT = "2026-11-10T00:00:00.000Z";
const SO_DT = "0912345678";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
type W = ReturnType<typeof world>;

function setup(): W {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUPER, phone: "0900000003", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000006", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000007", name: "Nhân sự", perms: ["HR"] });
  if (w.q("SELECT 1 FROM pty_privacy_policy LIMIT 1").length === 0) {
    w.sqlite.exec(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('pol', 1, 'thử', 'thử', '${AT}', '${AT}', '${SUPER}', '${AT}', '${SUPER}')`);
  }
  return w;
}

/** Phiếu cá nhân đã gửi bản khai 1, CHỜ XÁC MINH (gieo bằng SQL như duyet-route.test.ts); rồi xác minh «đạt» bằng route thật. */
async function phieuDaXacMinh(w: W): Promise<string> {
  const id = "DK_SOVANGLD";
  w.sqlite.prepare("INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at) VALUES (?, 'PERSON', 'DANG_DIEN', 'TRAVEL_AGENCY', ?, ?)").run(id, AT, AT);
  w.sqlite.prepare("INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES (?, ?, 'EMAIL', 'khach-sv@example.com', 'khach-sv@example.com', ?, ?)").run(`ident-${id}`, id, AT, AT);
  w.sqlite.prepare(`INSERT INTO dk_submission (id, registration_id, version, family_name, given_name, birth_date, address_value, phone_value, phone_key, document_type_code, document_number, number_key, issued_date, issued_place,
      expiry_date, policy_id, consented_at, created_at, updated_at) VALUES (?, ?, 1, 'Phạm', 'Thử Sổ Vàng', '1990-05-06', '12 Đường Thử, Nha Trang', ?, ?, 'CCCD', '079 000 000 222', '079000000222', '2021-01-02', 'Cục thử', '2040-01-02', 'pol', ?, ?, ?)`)
    .run(`sub-${id}`, id, SO_DT, SO_DT, AT, AT, AT);
  w.sqlite.prepare("UPDATE dk_registration SET current_version = 1, submitted_at = ? WHERE id = ?").run(AT, id);
  w.sqlite.prepare("UPDATE dk_registration SET status = 'CHO_XAC_MINH' WHERE id = ?").run(id);
  for (const m of ["ROLE", "CALLED", "HO_TEN", "NGAY_SINH", "CCCD"]) {
    const r = await w.call("POST", `/api/dang-ky/phieu/${id}/ket-luan`, { as: ADM, body: { phienBan: 1, muc: m, dat: true } });
    assert.equal(r.status, 200, `${m}: ${r.text}`);
  }
  const d = await w.call("POST", `/api/dang-ky/phieu/${id}/dat`, { as: ADM, body: { phienBan: 1, hoSo: { kieu: "MOI" } } });
  assert.equal(d.status, 200, d.text);
  return id;
}

function donNhap(w: W, partyId: string, tong = 2_000_000): string {
  const id = crypto.randomUUID();
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, 'TD-SV-LD', ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, SALES, tong, tong, tong, partyId, AT, AT);
  const s = `${id}-s0`;
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'HONTAM', 'DV 0', 'perPax', 1, ?)`).run(s, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 1, ?, ?, ?)`).run(`${s}-i`, id, s, tong, tong, tong);
  return id;
}

test("sổ vàng — loại do Kế toán thêm: có mức riêng ở bậc mặc định, đơn đầu tiên của tài khoản xác nhận được, hoa hồng đúng mức đó, không bị giữ «thiếu mức»", async () => {
  const w = setup();
  const them = await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: "Đối tác sổ vàng" } });
  assert.equal(them.status, 201, them.text);
  const loai: string = them.json.loai.code;
  // Kế toán đặt mức 10% cho đúng loại này (đối tượng «vai», bậc mặc định = áp cho mọi đối tác của loại)
  const muc = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: loai }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  assert.equal(muc.status, 201, muc.text);
  // phiếu → duyệt bằng route thật; tài khoản đối tác kích hoạt (bước kích hoạt có bài riêng ở duyet-route.test.ts)
  const id = await phieuDaXacMinh(w);
  const du = await w.call("POST", `/api/dang-ky/phieu/${id}/duyet`, { as: HR, body: { roleCode: loai, phienBan: 1 } });
  assert.equal(du.status, 200, du.text);
  const tk = w.q("SELECT id, party_id FROM staff WHERE phone = ?", SO_DT)[0];
  assert.deepEqual(w.q("SELECT permission_type_code p FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL", tk.id).map((x: any) => x.p), ["PARTNER"]);
  w.sqlite.prepare("UPDATE staff SET active = 1 WHERE id = ?").run(tk.id);
  // đơn đầu tiên: xác nhận được, bản chụp có người hưởng và ĐỦ mức
  const don = donNhap(w, tk.party_id);
  const xn = await w.call("POST", `/api/orders/${don}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  const chup = w.q("SELECT commission_status, beneficiary_party_id FROM ord_service_terms WHERE order_id = ?", don).map((x: any) => ({ ...x }));
  assert.deepEqual(chup, [{ commission_status: "SET", beneficiary_party_id: tk.party_id }], "người hưởng là hồ sơ vừa duyệt, mức đã có — không «thiếu mức»");
  // «Đã giao» ghi ĐÚNG MỘT dòng hoa hồng, đúng mức: 10% × 2.000.000
  const thu = await w.call("POST", `/api/orders/${don}/payments`, { as: SUPER, body: { soTien: 2_000_000, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
  assert.equal(thu.status, 201, thu.text);
  const g = await w.call("POST", `/api/orders/${don}/delivered`, { as: SUPER, body: {} });
  assert.equal(g.status, 200, g.text);
  const dong = w.q("SELECT l.kind_code, l.creditor_party_id, l.amount FROM bil_debt_line l JOIN bil_posting p ON p.id = l.posting_id WHERE l.order_id = ? AND p.kind_code = 'DELIVERED' ORDER BY l.rowid", don)
    .map((x: any) => [x.kind_code, x.creditor_party_id, x.amount]);
  assert.deepEqual(dong, [["HOA_HONG", tk.party_id, 200_000]]);
});
