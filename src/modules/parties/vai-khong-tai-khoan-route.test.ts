// ADR-0155 Đ1, C6 (chủ duyệt 2026-11-04) — hồ sơ CHƯA CÓ TÀI KHOẢN mang được năm vai bên ngoài ở Danh bạ (cả tổ chức), không sinh đăng nhập.
// Mọi chốt ở lớp route (CSDL chỉ đỡ pty_party_role_group_conflict, party_role_overlap): mỗi ca đi qua route thật trên SQLite (tests/audit/harness.mjs).
// Task 2 (C3 — chặn gỡ khi còn việc dở) thêm các ca sau trong cùng tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { vaiMoChoHoSoKhongTaiKhoan } from "../../shared/roles.ts";

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
