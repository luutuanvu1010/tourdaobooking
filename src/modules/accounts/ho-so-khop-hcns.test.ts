// ADR-0071 điều 3b (chủ chọn 2026-10-01, phương án "Thu hẹp"): hồ sơ trùng khi tạo tài khoản thu hẹp theo ô `party.view` (xem Danh bạ) của NGƯỜI GỌI.
//  - Có party.view (Toàn quyền…): như cũ — tên, vai, có tài khoản.
//  - Không có (Hành chính nhân sự): chỉ thấy hồ sơ trùng đang mở vai tài khoản (ROLE_CODES) hoặc đã có tài khoản; hồ sơ chỉ là khách / không vai tài khoản
//    → không id, tên, vai — chỉ cờ `coHoSoKhacTrongDanhBa`.
//  - CÙNG MỘT HÀM cho GET /api/staff/ho-so-khop và 409 party_match_exists của POST /api/staff.
//  - POST /api/staff với partyId trỏ hồ sơ người gọi không được thấy → từ chối NHƯ không tìm thấy hồ sơ.
// Kiểm mức route trên cả ứng dụng, SQLite thật (khung tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const ADM = "33333333-3333-4333-8333-333333333333";
const HR = "44444444-4444-4444-8444-444444444444";
const SUP = "77777777-7777-4777-8777-777777777777";
const SO_KHACH = "0912000222";
const TEN_KHACH = "Lê Thị Khách Riêng";
const TEN_CTV = "Phạm Cộng Tác";
const CAU_HCNS = "Số hoặc tên này đã có trong Danh bạ. Vẫn tạo được hồ sơ mới; sau đó nhờ Quản trị gộp hồ sơ trùng.";

async function nen() {
  const w = world();
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000004", name: "Nhân sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  // Khách trong Danh bạ (vai CUSTOMER — không phải vai tài khoản), có SĐT.
  const k = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: TEN_KHACH, contacts: [{ kind: "PHONE", value: SO_KHACH }] } });
  assert.equal(k.status, 201, k.text);
  const KHACH = k.json.party.id as string;
  assert.equal((await w.call("POST", `/api/parties/${KHACH}/roles`, { as: ADM, body: { roleTypeCode: "CUSTOMER" } })).status, 201);
  // Cộng tác viên đã có tài khoản (vai tài khoản bên ngoài đang mở).
  const c = await w.call("POST", "/api/staff", { as: SUP, body: { roles: ["COLLABORATOR"], fullName: TEN_CTV, phone: "0912000333", taoHoSoMoi: true } });
  assert.equal(c.status, 201, c.text);
  return { w, KHACH, CTV: c.json.staff.partyId as string };
}

test("3b: HCNS gõ đúng SĐT của một khách → không thấy id / tên / vai khách, chỉ có cờ; Toàn quyền thấy tên như cũ", async () => {
  const { w, KHACH } = await nen();
  const hr = await w.call("GET", `/api/staff/ho-so-khop?phone=${SO_KHACH}`, { as: HR });
  assert.equal(hr.status, 200, hr.text);
  assert.deepEqual(hr.json, { khop: [], coHoSoKhacTrongDanhBa: true });
  assert.ok(!hr.text.includes(KHACH) && !hr.text.includes("Khách Riêng") && !hr.text.includes("Khách hàng"), hr.text);
  const sup = await w.call("GET", `/api/staff/ho-so-khop?phone=${SO_KHACH}`, { as: SUP });
  assert.equal(sup.status, 200, sup.text);
  assert.deepEqual(sup.json.khop.map((x: any) => [x.id, x.displayName, x.coTaiKhoan]), [[KHACH, TEN_KHACH, false]]);
  assert.equal(sup.json.coHoSoKhacTrongDanhBa, false, "người xem được Danh bạ đã thấy hết — cờ không bật");
});

test("3b: HCNS thấy tên + vai của hồ sơ trùng là đối tác / nhân viên đã có tài khoản", async () => {
  const { w, CTV } = await nen();
  const r = await w.call("GET", `/api/staff/ho-so-khop?ten=${encodeURIComponent(TEN_CTV)}`, { as: HR });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.khop, [{ id: CTV, displayName: TEN_CTV, lyDo: ["NAME"], vai: ["Cộng tác viên"], vaiTaiKhoan: ["COLLABORATOR"], coTaiKhoan: true }]);
  assert.equal(r.json.coHoSoKhacTrongDanhBa, false);
});

test("3b: POST /api/staff của HCNS trùng SĐT khách → 409 party_match_exists, khop rỗng + cờ, câu báo HCNS, không tên khách; cùng dữ liệu với route đọc; có taoHoSoMoi → tạo", async () => {
  const { w } = await nen();
  const body = { roles: ["SALES_STAFF"], fullName: "Người Hoàn Toàn Mới", phone: SO_KHACH };
  const r = await w.call("POST", "/api/staff", { as: HR, body });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "party_match_exists");
  assert.deepEqual(r.json.error.khop, []);
  assert.equal(r.json.error.coHoSoKhacTrongDanhBa, true);
  assert.equal(r.json.error.message, CAU_HCNS);
  assert.ok(!r.text.includes("Khách Riêng"), r.text);
  const doc = await w.call("GET", `/api/staff/ho-so-khop?${new URLSearchParams({ phone: SO_KHACH, ten: "Người Hoàn Toàn Mới" })}`, { as: HR });
  assert.deepEqual({ khop: r.json.error.khop, coHoSoKhacTrongDanhBa: r.json.error.coHoSoKhacTrongDanhBa }, doc.json, "một hàm cho cả hai đường");
  assert.equal((await w.call("POST", "/api/staff", { as: HR, body: { ...body, taoHoSoMoi: true } })).status, 201);
});

test("3b: POST /api/staff của HCNS với partyId của một khách → từ chối NHƯ không tìm thấy hồ sơ; Toàn quyền dùng được hồ sơ đó", async () => {
  const { w, KHACH } = await nen();
  const voi = (as: string, partyId: string, phone: string) => w.call("POST", "/api/staff", { as, body: { roles: ["SALES_STAFF"], partyId, phone } });
  const khongCo = await voi(HR, "pty-00000000-0000-4000-8000-000000000000", "0912000444");
  const khach = await voi(HR, KHACH, "0912000445");
  assert.equal(khach.status, khongCo.status, khach.text);
  assert.deepEqual(khach.json, khongCo.json, "cùng thân phản hồi với hồ sơ không có thật — không lộ hồ sơ tồn tại");
  assert.equal(w.q("SELECT count(*) n FROM staff WHERE party_id = ?", KHACH)[0].n, 0);
  const sup = await voi(SUP, KHACH, "0912000446");
  assert.equal(sup.status, 201, sup.text);
});
