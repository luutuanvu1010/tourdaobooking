// ADR-0155 Đ1, C6 (chủ duyệt 2026-11-04) — hồ sơ CHƯA CÓ TÀI KHOẢN mang được năm vai bên ngoài ở Danh bạ (cả tổ chức), không sinh đăng nhập.
// Mọi chốt ở lớp route (CSDL chỉ đỡ pty_party_role_group_conflict, party_role_overlap): mỗi ca đi qua route thật trên SQLite (tests/audit/harness.mjs).
// Task 2 (C3 — chặn gỡ khi còn việc dở) thêm các ca sau trong cùng tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { vaiMoChoHoSoKhongTaiKhoan } from "../../shared/roles.ts";
import { gieoBanChup } from "../../../tests/audit/gieo-ban-chup.mjs";
import { readFileSync } from "node:fs";

const ADM = "55555555-5555-4555-8555-555555555555";
const SA = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SALES = "11111111-1111-4111-8111-111111111111";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác (có tài khoản đang chạy)
const DT_NGUNG = "66666666-6666-4666-8666-666666666667"; // Đối tác (tài khoản đã ngưng)
const AT = "2026-10-01T00:00:00.000Z";
const ORG = "dda00000-0000-4000-8000-0000000000a1"; // tổ chức chưa có tài khoản
const ORG_NGUNG = "dda00000-0000-4000-8000-0000000000a3"; // tổ chức ngưng dùng
const ORG_GOP = "dda00000-0000-4000-8000-0000000000a4"; // hồ sơ cá nhân đã gộp vào NGUOI (gộp chỉ có giữa hai cá nhân)
const NGUOI = "dda00000-0000-4000-8000-0000000000b1"; // cá nhân chưa có tài khoản
const NGUOI_NOI_BO = "dda00000-0000-4000-8000-0000000000b2"; // cá nhân mang vai cũ STAFF (nội bộ, chưa có tài khoản)
const NOI = "dda00000-0000-4000-8000-0000000000c1"; // một địa điểm bất kỳ
export const NAM_VAI = ["TRAVEL_AGENCY", "GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR"] as const;
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
type W = ReturnType<typeof world>;

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [ADM, "0900000006", "Quản Trị", ["ADMIN"]], [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [SALES, "0900000001", "An Bán", ["SALES"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [DT_NGUNG, "0900000009", "Đối Tác Ngưng", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(DT_NGUNG);
  for (const [id, ten, act] of [[ORG, "Lữ hành Biển Xanh", 1], [ORG_NGUNG, "Lữ hành Đã Nghỉ", 0]] as const) {
    w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, ?, ?, ?)").run(id, ten, act, AT, AT);
    w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, AT, AT);
  }
  for (const [id, ten, act] of [[NGUOI, "Chị Mai", 1], [NGUOI_NOI_BO, "Anh Cũ", 1], [ORG_GOP, "Chị Mai (trùng)", 0]] as const) {
    w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, ?, ?, ?)").run(id, ten, act, AT, AT);
    w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, ten, AT, AT);
  }
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-cu', ?, 'STAFF', '2026-01-01', ?, ?)").run(NGUOI_NOI_BO, AT, AT);
  w.sqlite.prepare("INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at) VALUES (?, 'DIEM_THU', 'Điểm thử', 'PIER', 20, ?, ?)").run(NOI, AT, AT);
  w.sqlite.prepare("UPDATE pty_party SET merged_into_id = ?, merged_at = ? WHERE id = ?").run(NGUOI, AT, ORG_GOP);
  return w;
}
const gan = (w: W, partyId: string, code: string, extra: Record<string, unknown> = {}, as = ADM) =>
  w.call("POST", `/api/parties/${partyId}/roles`, { as, body: { roleTypeCode: code, ...extra } });
const go = (w: W, partyId: string, rid: string, body: Record<string, unknown> = {}, as = ADM) => w.call("POST", `/api/parties/${partyId}/roles/${rid}/end`, { as, body });
const vaiId = (r: { json: { party: { roles: { id: string; roleTypeCode: string }[] } } }, code: string): string => r.json.party.roles.find((x) => x.roleTypeCode === code)!.id;
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);

test("vaiMoChoHoSoKhongTaiKhoan: đúng năm vai bên ngoài có quyền mặc định PARTNER; DRIVER_EXTERNAL, vai nội bộ, mã lạ thì không", () => {
  for (const c of NAM_VAI) assert.equal(vaiMoChoHoSoKhongTaiKhoan(c), true, c);
  for (const c of ["DRIVER_EXTERNAL", "SALES_STAFF", "DIRECTOR", "HR_STAFF", "STAFF", "XYZ", ""]) assert.equal(vaiMoChoHoSoKhongTaiKhoan(c), false, c);
});

test("Đ1.1: cá nhân và tổ chức chưa có tài khoản gắn từng vai trong năm ⇒ 201; không sinh dòng staff, không sinh quyền", async () => {
  const w = setup();
  const truocStaff = dem(w, "SELECT COUNT(*) AS n FROM staff");
  const truocQuyen = dem(w, "SELECT COUNT(*) AS n FROM stf_permission");
  for (const code of NAM_VAI) {
    for (const id of [ORG, NGUOI]) {
      const r = await gan(w, id, code);
      assert.equal(r.status, 201, `${code} → ${id}: ${r.text}`);
      assert.ok(r.json.party.roles.some((x: { roleTypeCode: string }) => x.roleTypeCode === code));
      assert.equal(await go(w, id, vaiId(r, code)).then((e) => e.status), 200, `gỡ ${code}`);
    }
  }
  assert.equal(dem(w, "SELECT COUNT(*) AS n FROM staff"), truocStaff);
  assert.equal(dem(w, "SELECT COUNT(*) AS n FROM stf_permission"), truocQuyen);
});

test("Đ1.2, (i): hồ sơ có tài khoản đang chạy hoặc đã ngưng ⇒ 409 role_via_account", async () => {
  const w = setup();
  for (const id of [`pty-${DT}`, `pty-${DT_NGUNG}`]) {
    const r = await gan(w, id, "TRAVEL_AGENCY", {}, SA);
    assert.equal(r.status, 409, `${id}: ${r.text}`);
    assert.equal(r.json.error.code, "role_via_account");
  }
});

test("(h): DRIVER_EXTERNAL và vai nội bộ vẫn 409 role_via_account, kể cả trên hồ sơ chưa có tài khoản", async () => {
  const w = setup();
  for (const code of ["DRIVER_EXTERNAL", "SALES_STAFF", "GUIDE_INTERNAL", "DRIVER_INTERNAL", "HR_STAFF"]) {
    const r = await gan(w, NGUOI, code, {}, SA);
    assert.equal(r.status, 409, `${code}: ${r.text}`);
    assert.equal(r.json.error.code, "role_via_account", code);
  }
});

test("ADR-0117 đ4: hồ sơ nội bộ (vai cũ STAFF) ⇒ 409 role_partner_label_conflict khi gắn một trong năm vai", async () => {
  const w = setup();
  const r = await gan(w, NGUOI_NOI_BO, "COLLABORATOR");
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "role_partner_label_conflict");
});

test("(h): có nơi ⇒ 400; ngày bắt đầu tương lai ⇒ 400; có ngày kết thúc ⇒ 400; ngày bắt đầu quá khứ ⇒ 201", async () => {
  const w = setup();
  for (const [ten, extra] of [["có nơi", { locationId: NOI }], ["from tương lai", { validFrom: inDays(2) }], ["có to", { validTo: inDays(5) }], ["to hôm nay", { validTo: vnHomNay() }]] as const) {
    const r = await gan(w, ORG, "TRAVEL_AGENCY", extra);
    assert.equal(r.status, 400, `${ten}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input", ten);
  }
  assert.equal(dem(w, "SELECT COUNT(*) AS n FROM pty_party_role WHERE party_id = ? AND role_type_code = 'TRAVEL_AGENCY'", ORG), 0, "400 không ghi gì");
  const ok = await gan(w, ORG, "TRAVEL_AGENCY", { validFrom: "2026-01-01" });
  assert.equal(ok.status, 201, ok.text);
});

test("(h): gỡ với ngày tương lai ⇒ 400, vai vẫn mở; gỡ hôm nay ⇒ 200", async () => {
  const w = setup();
  const rid = vaiId(await gan(w, ORG, "HOTEL_RECEPTION"), "HOTEL_RECEPTION");
  const t = await go(w, ORG, rid, { validTo: inDays(3) });
  assert.equal(t.status, 400, t.text);
  assert.equal(dem(w, "SELECT COUNT(*) AS n FROM pty_party_role WHERE id = ? AND valid_to_date IS NULL", rid), 1);
  assert.equal((await go(w, ORG, rid)).status, 200);
});

test("Đ1: công ty chủ ⇒ không 201 (Quản trị 403; Toàn quyền 409); hồ sơ đã gộp ⇒ party_merged; hồ sơ ngưng dùng ⇒ 409 party_inactive", async () => {
  const w = setup();
  const chu = String(w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id);
  assert.equal((await gan(w, chu, "TRAVEL_AGENCY", {}, ADM)).status, 403);
  const sa = await gan(w, chu, "TRAVEL_AGENCY", {}, SA);
  assert.equal(sa.status, 409, sa.text);
  assert.equal(sa.json.error.code, "owner_company_no_partner_role");
  const gop = await gan(w, ORG_GOP, "TRAVEL_AGENCY");
  assert.equal(gop.status, 409, gop.text);
  assert.equal(gop.json.error.code, "party_merged");
  const ng = await gan(w, ORG_NGUNG, "TRAVEL_AGENCY");
  assert.equal(ng.status, 409, ng.text);
  assert.equal(ng.json.error.code, "party_inactive");
  assert.match(ng.json.error.message, /ngưng dùng/);
});

test("Đ1: gỡ rồi gắn lại trong ngày ⇒ 409 role_overlap, câu tiếng Việt dễ hiểu (không lỗi thô)", async () => {
  const w = setup();
  const rid = vaiId(await gan(w, ORG, "TAXI_DRIVER"), "TAXI_DRIVER");
  assert.equal((await go(w, ORG, rid)).status, 200);
  const lai = await gan(w, ORG, "TAXI_DRIVER");
  assert.equal(lai.status, 409, lai.text);
  assert.equal(lai.json.error.code, "role_overlap");
  assert.match(lai.json.error.message, /gỡ vai trò đó hôm nay.*ngày mai/);
  assert.doesNotMatch(lai.json.error.message, /trigger|SQLITE|constraint/i);
});

test("Đ1.5: Kế toán và Bán hàng không gắn / gỡ được ⇒ 403 (cổng admin.manage giữ nguyên)", async () => {
  const w = setup();
  assert.equal((await gan(w, ORG, "TRAVEL_AGENCY", {}, KT)).status, 403);
  assert.equal((await gan(w, ORG, "TRAVEL_AGENCY", {}, SALES)).status, 403);
  const rid = vaiId(await gan(w, ORG, "TRAVEL_AGENCY"), "TRAVEL_AGENCY");
  assert.equal((await go(w, ORG, rid, {}, KT)).status, 403);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Task 2 — C3 (chủ duyệt 2026-11-04): gỡ vai được hưởng CUỐI CÙNG của hồ sơ chưa có tài khoản bị chặn khi còn việc dở
// ---------------------------------------------------------------------------------------------------------------------------------------------
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
/** Huỷ bằng SQL: trigger đòi dòng lý do huỷ TRƯỚC khi đổi trạng thái. */
function huy(w: W, id: string): void {
  w.sqlite.prepare("INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, note, cancelled_date, reclassifies_id, legacy, created_at, created_by, updated_at, updated_by) VALUES (?, ?, 'OTHER', 'CONG_TY_HUY', 'thử', '2026-10-01', NULL, 0, ?, ?, ?, ?)").run(uuid(), id, AT, SALES, AT, SALES);
  w.sqlite.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?").run(AT, id);
}
/** Đơn bằng SQL: tổng 0, không dòng — đủ để thử trạng thái và người đặt (`booker_party_id`); nháp / đã xác nhận / đã huỷ. `cho` = có yêu cầu xác nhận còn mở. */
function don(w: W, booker: string, status: "draft" | "confirmed" | "cancelled", cho = false, lap: string = SALES): string {
  const id = uuid();
  const ma = `TH-${String(seq).padStart(3, "0")}`;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 0, 0, 0, ?, ?, ?)`).run(id, ma, lap, booker, AT, AT);
  w.sqlite.prepare("INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'HONTAM', 'DV 0', 'perPax', 1, ?)").run(`${id}-s0`, id, inDays(3));
  if (status === "confirmed") w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?").run(AT, AT, id);
  if (status === "cancelled") huy(w, id);
  if (cho) w.sqlite.prepare("INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(uuid(), id, AT, SALES, AT, AT, SALES, AT, SALES);
  return ma;
}
const maLoi = (r: { json: { error?: { code?: string } } }) => r.json.error?.code;
async function ganId(w: W, partyId: string, code: string): Promise<string> {
  const r = await gan(w, partyId, code);
  assert.equal(r.status, 201, r.text);
  return vaiId(r, code);
}
/** Cấp riêng đang mở cho hồ sơ (qua route trang Hoa hồng, Kế toán). */
async function datCapRieng(w: W, partyId: string): Promise<string> {
  const t = await w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten: `Cấp thử ${++seq}` } });
  assert.equal(t.status, 201, t.text);
  const r = await w.call("POST", `/api/pricing/ho-so/${partyId}/muc-rieng`, { as: KT, body: { muc: t.json.muc.code, tuNgay: "2026-01-01" } });
  assert.equal(r.status, 201, r.text);
  return String(w.q("SELECT id FROM prc_party_tier WHERE party_id = ? AND valid_to_date IS NULL", partyId)[0].id);
}
async function datMucRieng(w: W, partyId: string): Promise<string> {
  const r = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "DOI_TAC", partyId }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000, tuNgay: "2026-01-01" } });
  assert.equal(r.status, 201, r.text);
  return String(w.q("SELECT id FROM prc_commission_rule WHERE target_party_id = ? AND valid_to_date IS NULL", partyId)[0].id);
}

test("C3 (a): còn đơn nháp đứng tên ⇒ gỡ vai cuối 409 role_end_has_open_work; câu nêu số nháp và lối ra; mã đơn nháp không lộ; đơn chờ xác nhận được nêu mã", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "TRAVEL_AGENCY");
  const nhap1 = don(w, ORG, "draft");
  const cho1 = don(w, ORG, "draft", true);
  const r = await go(w, ORG, rid);
  assert.equal(r.status, 409, r.text);
  assert.equal(maLoi(r), "role_end_has_open_work");
  assert.match(r.json.error.message, /2 đơn chưa xác nhận/);
  assert.ok(r.json.error.message.includes(cho1), "nêu mã đơn đang chờ xác nhận");
  assert.ok(!r.json.error.message.includes(nhap1), "mã đơn nháp riêng tư (ADR-0135 Đ1) không ra khỏi hàm");
  assert.match(r.json.error.message, /nhờ người lập huỷ hoặc xác nhận đơn nháp/);
  assert.doesNotMatch(r.json.error.message, /Thôi theo cấp này|«Ngừng»/, "chỉ nêu lối ra của việc còn thật");
  assert.match(r.json.error.message, /«Kết thúc»/);
  assert.equal(dem(w, "SELECT COUNT(*) AS n FROM pty_party_role WHERE id = ? AND valid_to_date IS NULL", rid), 1, "vai vẫn mở");
  // xử lý xong nháp (huỷ) ⇒ gỡ được
  for (const o of w.q("SELECT id FROM orders WHERE booker_party_id = ?", ORG) as { id: string }[]) huy(w, o.id);
  assert.equal((await go(w, ORG, rid)).status, 200);
});

test("C3 (a): câu nêu tối đa 5 mã đơn chờ xác nhận và tổng số", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "COLLABORATOR");
  const ma = [1, 2, 3, 4, 5, 6, 7].map(() => don(w, ORG, "draft", true));
  const r = await go(w, ORG, rid);
  assert.equal(maLoi(r), "role_end_has_open_work", r.text);
  assert.match(r.json.error.message, /7 đơn chưa xác nhận/);
  assert.equal(ma.filter((m) => r.json.error.message.includes(m)).length, 5, "đúng 5 mã được nêu");
});

test("C3 (b): còn cấp riêng mở ⇒ 409; kết thúc cấp riêng (hết hôm qua) rồi gỡ ⇒ 200", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "TRAVEL_AGENCY");
  const capId = await datCapRieng(w, ORG);
  const r = await go(w, ORG, rid);
  assert.equal(r.status, 409, r.text);
  assert.equal(maLoi(r), "role_end_has_open_work");
  assert.match(r.json.error.message, /cấp riêng đang áp dụng/);
  const kt = await w.call("POST", `/api/pricing/muc-rieng/${capId}/ket-thuc`, { as: KT, body: { denNgay: inDays(-1) } });
  assert.equal(kt.status, 200, kt.text);
  assert.equal((await go(w, ORG, rid)).status, 200);
});

test("C3 (c): còn mức riêng của hồ sơ còn hiệu lực (không phải cấp riêng) ⇒ 409; ngừng mức riêng rồi gỡ ⇒ 200", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "GUIDE_FREELANCE");
  const mucId = await datMucRieng(w, ORG);
  const r = await go(w, ORG, rid);
  assert.equal(r.status, 409, r.text);
  assert.equal(maLoi(r), "role_end_has_open_work");
  assert.match(r.json.error.message, /mức riêng đang áp dụng/);
  const dong = await w.call("POST", `/api/pricing/hoa-hong/${mucId}/dong`, { as: KT, body: { denNgay: inDays(-1) } });
  assert.equal(dong.status, 200, dong.text);
  assert.equal((await go(w, ORG, rid)).status, 200);
});

test("C3 đối chứng: đơn đã xác nhận / đã huỷ đứng tên không chặn gỡ; bản chụp hoa hồng của đơn đã xác nhận có thật và giữ nguyên", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "HOTEL_RECEPTION");
  don(w, ORG, "confirmed");
  don(w, ORG, "cancelled");
  for (const o of w.q("SELECT id FROM orders WHERE status = 'confirmed'") as { id: string }[]) gieoBanChup(w.sqlite, o.id);
  const truoc = w.q("SELECT * FROM ord_service_terms ORDER BY order_id, order_service_id");
  assert.ok(truoc.length > 0, "vế trước có bản chụp thật (không so rỗng với rỗng)");
  assert.equal((await go(w, ORG, rid)).status, 200);
  const sau = w.q("SELECT * FROM ord_service_terms ORDER BY order_id, order_service_id");
  assert.ok(sau.length > 0, "vế sau có bản chụp thật");
  assert.equal(JSON.stringify(sau), JSON.stringify(truoc));
});

test("C3: hồ sơ còn vai được hưởng khác ⇒ gỡ một vai vẫn 200 dù còn nháp, cấp riêng, mức riêng; gỡ vai cuối mới bị chặn", async () => {
  const w = setup();
  const r1 = await ganId(w, ORG, "TRAVEL_AGENCY");
  const r2 = await ganId(w, ORG, "COLLABORATOR");
  don(w, ORG, "draft");
  await datCapRieng(w, ORG);
  await datMucRieng(w, ORG);
  assert.equal((await go(w, ORG, r1)).status, 200, "còn Cộng tác viên ⇒ gỡ Công ty lữ hành được");
  const cuoi = await go(w, ORG, r2);
  assert.equal(cuoi.status, 409, cuoi.text);
  assert.equal(maLoi(cuoi), "role_end_has_open_work");
});

test("C3: đơn nháp của hồ sơ KHÁC không chặn; chỉ áp cho năm vai (vai thường như Thuyền trưởng gỡ bình thường)", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "TRAVEL_AGENCY");
  don(w, NGUOI, "draft");
  assert.equal((await go(w, ORG, rid)).status, 200);
  const tt = await gan(w, NGUOI, "BOAT_CAPTAIN");
  assert.equal(tt.status, 201, tt.text);
  assert.equal((await go(w, NGUOI, vaiId(tt, "BOAT_CAPTAIN"))).status, 200, "vai thường không bị chặn dù hồ sơ có đơn nháp");
});

test("C3: vai còn lại đã bị tắt khỏi danh sách được hưởng thì KHÔNG tính là «còn vai hưởng»", async () => {
  const w = setup();
  const r1 = await ganId(w, ORG, "TRAVEL_AGENCY");
  await ganId(w, ORG, "COLLABORATOR");
  w.sqlite.prepare("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'COLLABORATOR'").run();
  don(w, ORG, "draft");
  const r = await go(w, ORG, r1);
  assert.equal(r.status, 409, r.text);
  assert.equal(maLoi(r), "role_end_has_open_work");
});

// ---- Task 3: gộp hồ sơ ----
async function thuGopHai(w: W, a: string, b: string, ten: string) {
  const xem = await w.call("POST", `/api/parties/${a}/merge/preview`, { as: ADM, body: { intoPartyId: b } });
  const gop = await w.call("POST", `/api/parties/${a}/merge`, { as: ADM, body: { intoPartyId: b, xacNhan: ten } });
  return { xem, gop };
}

test("Task 3 (a): gộp hồ sơ nội bộ cũ (STAFF) vào hồ sơ mang COLLABORATOR, và ngược lại ⇒ merge_partner_label_internal (năm vai tính là «mang loại đối tác»)", async () => {
  const w = setup();
  assert.equal((await gan(w, NGUOI, "COLLABORATOR")).status, 201);
  const k1 = await thuGopHai(w, NGUOI_NOI_BO, NGUOI, "Anh Cũ");
  assert.equal(k1.gop.status, 409, k1.gop.text);
  assert.equal(k1.gop.json.error.code, "merge_partner_label_internal", k1.gop.text);
  assert.ok(k1.xem.json.chan.some((c: { code: string }) => c.code === "merge_partner_label_internal"));
  const k2 = await thuGopHai(w, NGUOI, NGUOI_NOI_BO, "Chị Mai");
  assert.ok(k2.xem.json.chan.some((c: { code: string }) => c.code === "merge_partner_label_internal"), "chiều ngược lại");
  assert.equal(w.q("SELECT merged_into_id m FROM pty_party WHERE id = ?", NGUOI_NOI_BO)[0].m, null, "không gộp");
});

test("Task 3 (b): xem trước gộp nguồn mang năm vai ⇒ câu trỏ Danh bạ, không trỏ Quản lý tài khoản", async () => {
  const w = setup();
  assert.equal((await gan(w, NGUOI, "GUIDE_FREELANCE")).status, 201);
  const hai = "dda00000-0000-4000-8000-0000000000b3";
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', 'Chị Hai', 1, ?, ?)").run(hai, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, 'Chị Hai', ?, ?)").run(hai, AT, AT);
  const xem = await w.call("POST", `/api/parties/${NGUOI}/merge/preview`, { as: ADM, body: { intoPartyId: hai } });
  const c = xem.json.chan.find((x: { code: string }) => x.code === "merge_source_account_role");
  assert.ok(c, xem.text);
  assert.match(c.message, /Danh bạ/);
  assert.doesNotMatch(c.message, /Quản lý tài khoản/);
});

// ---- Task 3: Hành chính nhân sự (C4), tạo tài khoản cho hồ sơ đã gắn vai, kiểm định kỳ ----
const HR = "44444444-4444-4444-8444-4444444444aa";
function themHr(w: W): void {
  seedStaff(w.sqlite, { id: HR, phone: "0900000011", name: "Nhân Sự", perms: ["HR"] });
}
/** Các kiểm định kỳ R-LC-1* và R-PRC-* (trừ R-PRC-5 — cảnh báo vĩnh viễn) chạy trên CSDL của khung: trả mã kiểm có vi phạm. */
async function kiemDinhKyDo(w: W): Promise<string[]> {
  const { CHECKS, demViPham } = (await import(new URL("../../../scripts/audit-checks.mjs", import.meta.url).href)) as {
    CHECKS: { code: string; sql: string; mode?: string; dem?: unknown }[];
    demViPham: (c: unknown, rows: unknown[]) => number;
  };
  return CHECKS.filter((c) => /^R-(LC-1|PRC-)/.test(c.code) && c.code !== "R-PRC-5")
    .filter((c) => demViPham(c, w.sqlite.prepare(c.sql.replace(/\s+/g, " ").trim()).all()) > 0).map((c) => c.code);
}

test("C4: Hành chính nhân sự gõ tên hồ sơ KHÔNG tài khoản đã gắn COLLABORATOR ⇒ thấy id, tên, vai (không phải chỉ cờ)", async () => {
  const w = setup();
  themHr(w);
  assert.equal((await gan(w, NGUOI, "COLLABORATOR")).status, 201);
  const r = await w.call("GET", `/api/staff/ho-so-khop?ten=${encodeURIComponent("Chị Mai")}`, { as: HR });
  assert.equal(r.status, 200, r.text);
  const x = r.json.khop.find((k: { id: string }) => k.id === NGUOI);
  assert.ok(x, r.text);
  assert.equal(x.displayName, "Chị Mai");
  assert.deepEqual(x.vaiTaiKhoan, ["COLLABORATOR"]);
  assert.equal(x.coTaiKhoan, false);
  assert.ok(x.vai.includes("Cộng tác viên"), JSON.stringify(x.vai));
});

test("C4 đối chứng: hồ sơ chỉ là khách (không năm vai) ⇒ HR vẫn không thấy id, tên, chỉ cờ", async () => {
  const w = setup();
  themHr(w);
  assert.equal((await gan(w, NGUOI, "CUSTOMER")).status, 201);
  const r = await w.call("GET", `/api/staff/ho-so-khop?ten=${encodeURIComponent("Chị Mai")}`, { as: HR });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.khop, []);
  assert.equal(r.json.coHoSoKhacTrongDanhBa, true);
});

test("Đ1.7: tạo tài khoản cho CÁ NHÂN đã gắn COLLABORATOR ⇒ 201, quyền PARTNER sinh đúng lúc, cấp riêng còn nguyên, vai không bị nhân đôi; R-LC-1 và R-PRC-* không vi phạm", async () => {
  const w = setup();
  assert.equal((await gan(w, NGUOI, "COLLABORATOR")).status, 201);
  const cap = await datCapRieng(w, NGUOI);
  assert.deepEqual(await kiemDinhKyDo(w), [], "trước khi tạo tài khoản");
  const r = await w.call("POST", "/api/staff", { as: SA, body: { partyId: NGUOI, phone: "0900000123", roles: ["COLLABORATOR"] } });
  assert.equal(r.status, 201, r.text);
  const sid = r.json.staff.id as string;
  assert.deepEqual(w.q("SELECT permission_type_code p FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY 1", sid).map((x: { p: string }) => x.p), ["PARTNER"]);
  assert.equal(dem(w, "SELECT COUNT(*) AS n FROM prc_party_tier WHERE id = ? AND valid_to_date IS NULL AND voided_at IS NULL", cap), 1, "cấp riêng còn");
  assert.equal(dem(w, "SELECT COUNT(*) AS n FROM pty_party_role WHERE party_id = ? AND role_type_code = 'COLLABORATOR' AND valid_to_date IS NULL", NGUOI), 1, "một dòng vai mở");
  assert.deepEqual(await kiemDinhKyDo(w), [], "sau khi tạo tài khoản");
});

test("Đ1.7: tạo tài khoản cho TỔ CHỨC (dù đã gắn TRAVEL_AGENCY) ⇒ 409 như cũ, không sinh dòng staff", async () => {
  const w = setup();
  assert.equal((await gan(w, ORG, "TRAVEL_AGENCY")).status, 201);
  const truoc = dem(w, "SELECT COUNT(*) AS n FROM staff");
  const r = await w.call("POST", "/api/staff", { as: SA, body: { partyId: ORG, phone: "0900000124", roles: ["TRAVEL_AGENCY"] } });
  assert.equal(r.status, 409, r.text);
  assert.equal(dem(w, "SELECT COUNT(*) AS n FROM staff"), truoc);
});

// ---- Lượt sửa sau kiểm: nêu TÊN người lập đơn nháp (chủ 2026-11-04: «Nêu tên người lập»), không lộ mã nháp chưa gửi / tên khách / SĐT ----
let nv = 0;
/** Thêm một nhân viên (tài khoản + hồ sơ có tên) để làm người lập đơn. */
function themNguoiLap(w: W, ten: string, ngung = false): string {
  const id = `7777${String(++nv).padStart(4, "0")}-7777-4777-8777-777777777777`;
  seedStaff(w.sqlite, { id, phone: `09100000${String(nv).padStart(2, "0")}`, name: ten, perms: ["SALES"] });
  if (ngung) w.sqlite.prepare("UPDATE staff SET active = 0 WHERE id = ?").run(id);
  return id;
}
const cauChan = async (w: W, rid: string): Promise<string> => {
  const r = await go(w, ORG, rid);
  assert.equal(r.status, 409, r.text);
  assert.equal(maLoi(r), "role_end_has_open_work");
  return r.json.error.message as string;
};

test("Tên người lập (a): một người lập ⇒ «N đơn do <tên> lập»; không lộ mã nháp chưa gửi, tên khách, SĐT; mã đơn chờ xác nhận vẫn nêu", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "TRAVEL_AGENCY");
  const nhap = don(w, ORG, "draft");
  const cho = don(w, ORG, "draft", true);
  const c = await cauChan(w, rid);
  assert.match(c, /2 đơn chưa xác nhận \(2 đơn do An Bán lập/);
  assert.ok(c.includes(`đang chờ xác nhận: ${cho}`), c);
  assert.ok(!c.includes(nhap) && !c.includes("Khách Giả") && !c.includes("0900000099"), `không lộ nháp / khách / SĐT: ${c}`);
  assert.ok(!c.includes("ngưng"), "tài khoản đang hoạt động thì không có câu ngưng");
});

test("Tên người lập (b): hai người lập ⇒ nêu từng người, người nhiều đơn trước", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "TRAVEL_AGENCY");
  const a = themNguoiLap(w, "Nguyễn Văn A");
  const b = themNguoiLap(w, "Trần Thị B");
  don(w, ORG, "draft", false, a); don(w, ORG, "draft", false, a); don(w, ORG, "draft", false, b);
  const c = await cauChan(w, rid);
  assert.match(c, /3 đơn chưa xác nhận \(2 đơn do Nguyễn Văn A lập, 1 đơn do Trần Thị B lập\)/);
});

test("Tên người lập (c): tài khoản người lập đang ngưng ⇒ có câu «bật lại tạm»", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "TRAVEL_AGENCY");
  don(w, ORG, "draft", false, themNguoiLap(w, "Lê Văn Đã Nghỉ", true));
  const c = await cauChan(w, rid);
  assert.match(c, /1 đơn do Lê Văn Đã Nghỉ lập \(tài khoản đang ngưng, bật lại tạm để người đó xử lý\)/);
});

test("Tên người lập (d): không rõ tên (nhân viên chưa có hồ sơ) ⇒ «một nhân viên», không lỗi, không để trống", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "TRAVEL_AGENCY");
  const x = themNguoiLap(w, "Không Tên");
  w.sqlite.prepare("UPDATE staff SET party_id = NULL WHERE id = ?").run(x);
  don(w, ORG, "draft", false, x);
  const c = await cauChan(w, rid);
  assert.match(c, /1 đơn do một nhân viên lập/);
  assert.ok(!c.includes("chưa có hồ sơ"), "nhãn dự phòng của view không lộ ra");
});

test("Tên người lập (e): quá 5 người ⇒ nêu 5 tên rồi «và N người khác»", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "TRAVEL_AGENCY");
  const ten = ["Ánh", "Bích", "Cúc", "Dũng", "Em", "Giang", "Hà"].map((t) => `Người ${t}`);
  ten.forEach((t) => don(w, ORG, "draft", false, themNguoiLap(w, t)));
  const c = await cauChan(w, rid);
  assert.equal(ten.filter((t) => c.includes(t)).length, 5, c);
  assert.match(c, /và 2 người khác/);
  assert.match(c, /7 đơn chưa xác nhận/);
});

test("Câu C3 khớp tên nút / thẻ thật trong giao diện (web/): «Thôi theo cấp này», «Ngừng», «Kết thúc», «Hoa hồng hiện hành», «Công việc tại đâu», trang «Hoa hồng đối tác»", () => {
  const dem = (f: string): string => readFileSync(new URL(`../../../${f}`, import.meta.url), "utf8");
  const parties = dem("web/parties.ts");
  for (const nhan of ['"Thôi theo cấp này"', '"Hoa hồng hiện hành"', '"Công việc tại đâu"', '"Kết thúc"']) assert.ok(parties.includes(nhan), `web/parties.ts thiếu ${nhan}`);
  assert.ok(dem("src/shared/hoa-hong-hien-thi.ts").includes('"Ngừng"'), "nhãn «Ngừng» của dòng mức");
  assert.ok(dem("public/hoa-hong.html").includes("<h1>Hoa hồng đối tác</h1>"), "trang Hoa hồng đối tác");
});

// ---- Câu chặn đúng ngữ pháp ở mọi tổ hợp; CHỈ nêu lối ra của việc còn thật (khoá nguyên câu) ----
const DAU = "Chưa gỡ được vai trò này vì đây là vai trò hưởng hoa hồng cuối cùng và hồ sơ còn: ";
const CUOI = " Xong việc thì bấm lại «Kết thúc».";
const RA_NHAP = "nhờ người lập huỷ hoặc xác nhận đơn nháp";
const RA_CAP = "kết thúc cấp riêng bằng nút «Thôi theo cấp này» ở mục «Hoa hồng hiện hành»";
const RA_MUC = "ngừng mức riêng bằng nút «Ngừng» ở trang «Hoa hồng đối tác»";

test("Câu chặn nguyên văn — chỉ đơn nháp", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "TRAVEL_AGENCY");
  don(w, ORG, "draft");
  assert.equal(await cauChan(w, rid), `${DAU}1 đơn chưa xác nhận (1 đơn do An Bán lập). Hãy ${RA_NHAP}.${CUOI}`);
});

test("Câu chặn nguyên văn — chỉ cấp riêng", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "TRAVEL_AGENCY");
  await datCapRieng(w, ORG);
  assert.equal(await cauChan(w, rid), `${DAU}cấp riêng đang áp dụng. Hãy ${RA_CAP}.${CUOI}`);
});

test("Câu chặn nguyên văn — chỉ mức riêng", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "TRAVEL_AGENCY");
  await datMucRieng(w, ORG);
  assert.equal(await cauChan(w, rid), `${DAU}mức riêng đang áp dụng. Hãy ${RA_MUC}.${CUOI}`);
});

test("Câu chặn nguyên văn — đủ ba việc (hai người lập, một đơn chờ xác nhận)", async () => {
  const w = setup();
  const rid = await ganId(w, ORG, "TRAVEL_AGENCY");
  const cho = don(w, ORG, "draft", true);
  don(w, ORG, "draft", false, themNguoiLap(w, "Nhân viên Thử"));
  await datCapRieng(w, ORG);
  await datMucRieng(w, ORG);
  assert.equal(await cauChan(w, rid),
    `${DAU}2 đơn chưa xác nhận (1 đơn do An Bán lập, 1 đơn do Nhân viên Thử lập; đang chờ xác nhận: ${cho}); cấp riêng đang áp dụng; mức riêng đang áp dụng. Hãy ${RA_NHAP}; ${RA_CAP}; ${RA_MUC}.${CUOI}`);
});

test("Giao diện Danh bạ: mọi chỗ hiện lỗi của trang đi qua hienLoi (đưa vào tầm nhìn, block center)", () => {
  const src = readFileSync(new URL("../../../web/parties.ts", import.meta.url), "utf8");
  assert.match(src, /function hienLoi[\s\S]{0,260}scrollIntoView\(\{ block: "center" \}\)/);
  assert.equal([...src.matchAll(/showError\(errorEl, [^n]/g)].length, 1, "chỉ còn đúng một chỗ gọi showError với chữ (bên trong hienLoi)");
});
