// Mã định danh 5.26, Task 3 — route `PATCH /api/pricing/loai-doi-tac/:code`: đổi tên + sửa ghi chú loại đối tác (đặc tả 2026-10-31 §3, §3b, §6 A1–A7) và nhật ký loại đối tác
// ghi mã ở ô đối tượng. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs), cùng khung với loai-doi-tac.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SA = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666";
const HR = "77777777-7777-4777-8777-777777777777";
const DRV = "88888888-8888-4888-8888-888888888888";
const DP = "99999999-9999-4999-8999-999999999991";
const KP = "99999999-9999-4999-8999-999999999990"; // lai: Kế toán + Đối tác
const AT = "2026-10-01T00:00:00.000Z";
const TEN = "Nhân viên spa";
const ORG = "dda00000-0000-4000-8000-0000000000a1";
const DA_DOI = "Loại này vừa được người khác sửa, mở lại để xem bản mới.";
type W = ReturnType<typeof world>;

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [ADM, "0900000006", "Quản Trị", ["ADMIN"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [HR, "0900000009", "Hà Nhân Sự", ["HR"]], [DRV, "0900000010", "Tài Xế", ["DRIVER"]],
    [KP, "0900000011", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]], [DP, "0900000012", "Tài Xế Đối Tác", ["DRIVER_PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Spa Hoa Sen', 1, ?, ?)").run(ORG, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(ORG, AT, AT);
  return w;
}
async function themLoai(w: W, ten = TEN): Promise<string> {
  const r = await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten } });
  assert.equal(r.status, 201, r.text);
  return r.json.loai.code as string;
}
const sua = (w: W, code: string, body: unknown, as = KT) => w.call("PATCH", `/api/pricing/loai-doi-tac/${code}`, { as, body });
const danhSach = async (w: W, as = KT) => {
  const r = await w.call("GET", "/api/pricing/loai-doi-tac", { as });
  assert.equal(r.status, 200, r.text);
  return r.json.loai as Record<string, unknown>[];
};
const mot = async (w: W, code: string) => (await danhSach(w)).find((x) => x.code === code)!;
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const soNhatKy = (w: W) => dem(w, "SELECT count(*) AS n FROM audit_log");
const nhatKy = (w: W, action: string): { detail: string; target_type: string | null; target_id: string | null }[] =>
  w.q("SELECT detail, target_type, target_id FROM audit_log WHERE action = ? ORDER BY rowid", action);
const dongLoai = (w: W, code: string) => w.q("SELECT name, note, updated_at, updated_by FROM pty_role_type WHERE code = ?", code)[0];

test("A1: Kế toán đổi tên loại tự thêm ⇒ 200; danh sách có tên mới cùng mã; hồ sơ đã gắn hiện tên mới; một dòng nhật ký «cũ» → «mới» có mã", async () => {
  const w = setup();
  const ma = await themLoai(w);
  const g = await w.call("POST", `/api/parties/${ORG}/roles`, { as: ADM, body: { roleTypeCode: ma } });
  assert.equal(g.status, 201, g.text);
  const truoc = await mot(w, ma);
  const r = await sua(w, ma, { ten: "Spa cao cấp", updatedAt: truoc.updatedAt });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.loai.code, ma);
  assert.equal(r.json.loai.ten, "Spa cao cấp");
  const sau = await mot(w, ma);
  assert.equal(sau.ten, "Spa cao cấp");
  assert.equal(sau.soHoSo, 1, "một hồ sơ đang mang loại");
  assert.equal(sau.suaBoi, "Lan Kế Toán", "người sửa là TÊN nhân viên");
  assert.notEqual(sau.updatedAt, truoc.updatedAt);
  const p = await w.call("GET", `/api/parties/${ORG}`, { as: ADM });
  assert.equal(p.status, 200, p.text);
  assert.equal(p.json.party.roles.find((x: { roleTypeCode: string }) => x.roleTypeCode === ma).roleName, "Spa cao cấp");
  const nk = nhatKy(w, "prc_partner_type_renamed");
  assert.deepEqual(nk.map((x) => ({ ...x })), [{ detail: "«Nhân viên spa» → «Spa cao cấp»", target_type: "ledger", target_id: ma }]);
});

test("A1: DTO danh sách đủ trường — ghi chú, ai tạo / lúc nào (tên), ai sửa / lúc nào, updatedAt, số hồ sơ; loại có sẵn chưa có dấu vết ⇒ null", async () => {
  const w = setup();
  const ma = await themLoai(w);
  const l = await mot(w, ma);
  assert.equal(typeof l.taoLuc, "string");
  assert.deepEqual(l, { code: ma, ten: TEN, coSan: false, dangBat: true, ghiChu: null, taoLuc: l.taoLuc, taoBoi: "Lan Kế Toán", suaLuc: l.taoLuc, suaBoi: "Lan Kế Toán", updatedAt: l.taoLuc, soHoSo: 0 });
  const ta = await mot(w, "TRAVEL_AGENCY");
  assert.deepEqual({ ghiChu: ta.ghiChu, taoLuc: ta.taoLuc, taoBoi: ta.taoBoi, suaLuc: ta.suaLuc, suaBoi: ta.suaBoi, updatedAt: ta.updatedAt }, { ghiChu: null, taoLuc: null, taoBoi: null, suaLuc: null, suaBoi: null, updatedAt: null });
});

test("A2: đổi sang tên của loại khác ⇒ 409 loai_trung, không đổi gì, không nhật ký; tên có SĐT ⇒ 400; ghi chú có SĐT ⇒ 400", async () => {
  const w = setup();
  const ma = await themLoai(w);
  await themLoai(w, "Lễ tân resort");
  const truoc = await mot(w, ma);
  const dong = dongLoai(w, ma);
  const n = soNhatKy(w);
  const r = await sua(w, ma, { ten: "lễ  tân RESORT", updatedAt: truoc.updatedAt });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "loai_trung");
  const r2 = await sua(w, ma, { ten: "Công ty lữ hành", updatedAt: truoc.updatedAt });
  assert.equal(r2.status, 409, "trùng tên loại có sẵn");
  const r3 = await sua(w, ma, { ten: "Gọi 0905123456", updatedAt: truoc.updatedAt });
  assert.equal(r3.status, 400, r3.text);
  assert.equal(r3.json.error.code, "invalid_input");
  const r4 = await sua(w, ma, { ghiChu: "Gọi 0905123456", updatedAt: truoc.updatedAt });
  assert.equal(r4.status, 400, r4.text);
  assert.deepEqual({ ...dongLoai(w, ma) }, { ...dong });
  assert.equal(soNhatKy(w), n);
});

test("A2: thân sai — vắng cả tên lẫn ghi chú ⇒ 400; vắng updatedAt ⇒ 400", async () => {
  const w = setup();
  const ma = await themLoai(w);
  const l = await mot(w, ma);
  const n = soNhatKy(w);
  assert.equal((await sua(w, ma, { updatedAt: l.updatedAt })).status, 400);
  assert.equal((await sua(w, ma, { ten: "Spa mới" })).status, 400);
  assert.equal((await sua(w, ma, { ten: "Spa mới", updatedAt: 5 })).status, 400);
  assert.equal(soNhatKy(w), n);
});

test("A3: đổi tên + ghi chú loại có sẵn TRAVEL_AGENCY (dữ liệu cũ, updatedAt null) ⇒ 200; mã ngoài danh sách được hưởng ⇒ 404, không ghi", async () => {
  const w = setup();
  const r = await sua(w, "TRAVEL_AGENCY", { ten: "Đại lý lữ hành", ghiChu: "Các công ty lữ hành gửi khách", updatedAt: null });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.loai.ten, "Đại lý lữ hành");
  assert.equal(r.json.loai.ghiChu, "Các công ty lữ hành gửi khách");
  assert.equal(r.json.loai.coSan, true);
  assert.equal(dongLoai(w, "TRAVEL_AGENCY").name, "Đại lý lữ hành");
  const n = soNhatKy(w);
  const truoc = w.q("SELECT code, name, note, updated_at FROM pty_role_type ORDER BY code");
  for (const ma of ["SALES", "DRIVER_EXTERNAL", "OWNER_COMPANY", "KHONG_CO", "LD_KHONGCOGI"]) {
    const x = await sua(w, ma, { ten: "Tên mới thử", updatedAt: null });
    assert.equal(x.status, 404, `${ma}: ${x.text}`);
    assert.equal(x.json.error.code, "not_found");
  }
  assert.deepEqual(w.q("SELECT code, name, note, updated_at FROM pty_role_type ORDER BY code"), truoc);
  assert.equal(soNhatKy(w), n);
});

test("A4: không có ô partner.commission.write hoặc giữ quyền Đối tác ⇒ 403 (mã hợp lệ); Kế toán, Quản trị, Toàn quyền ⇒ 200", async () => {
  const w = setup();
  const ma = await themLoai(w);
  const n = soNhatKy(w);
  for (const as of [SALES, HDV, HR, DRV, DP, DT, KP]) {
    const r = await sua(w, ma, { ten: "Spa bị chặn", updatedAt: (await mot(w, ma)).updatedAt }, as);
    assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  assert.equal(soNhatKy(w), n);
  for (const [as, ten] of [[KT, "Spa một"], [ADM, "Spa hai"], [SA, "Spa ba"]] as const) {
    const r = await sua(w, ma, { ten, updatedAt: (await mot(w, ma)).updatedAt }, as);
    assert.equal(r.status, 200, `${as}: ${r.text}`);
  }
});

test("A5: hai PATCH cùng updatedAt ⇒ một 200, một 409 da_doi, đúng một dòng nhật ký", async () => {
  const w = setup();
  const ma = await themLoai(w);
  const u = (await mot(w, ma)).updatedAt;
  const a = await sua(w, ma, { ten: "Spa A", updatedAt: u });
  const b = await sua(w, ma, { ten: "Spa B", updatedAt: u }, ADM);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(b.json.error.code, "da_doi");
  assert.equal(b.json.error.message, DA_DOI);
  assert.equal(nhatKy(w, "prc_partner_type_renamed").length, 1);
  assert.equal(dongLoai(w, ma).name, "Spa A");
});

test("A5: mở (đọc updatedAt) → người khác Tắt → PATCH ⇒ 409 da_doi, không ghi", async () => {
  const w = setup();
  const ma = await themLoai(w);
  const u = (await mot(w, ma)).updatedAt;
  await new Promise((r) => setTimeout(r, 2)); // mốc Tắt khác mốc thêm
  const t = await w.call("POST", `/api/pricing/loai-doi-tac/${ma}/tat`, { as: ADM, body: {} });
  assert.equal(t.status, 200, t.text);
  const n = soNhatKy(w);
  const r = await sua(w, ma, { ten: "Spa sau tắt", updatedAt: u });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "da_doi");
  assert.equal(soNhatKy(w), n);
  assert.equal(dongLoai(w, ma).name, TEN);
});

test("A6: sửa ghi chú ⇒ dòng prc_partner_type_note có mã, detail KHÔNG chứa nội dung ghi chú", async () => {
  const w = setup();
  const ma = await themLoai(w);
  const r = await sua(w, ma, { ghiChu: "Lễ tân khu Trần Phú", updatedAt: (await mot(w, ma)).updatedAt });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.loai.ghiChu, "Lễ tân khu Trần Phú");
  const nk = nhatKy(w, "prc_partner_type_note");
  assert.equal(nk.length, 1);
  assert.doesNotMatch(nk[0]!.detail ?? "", /Trần Phú/);
  assert.equal(nk[0]!.target_id, ma);
  assert.equal(nk[0]!.target_type, "ledger");
  assert.equal(nhatKy(w, "prc_partner_type_renamed").length, 0, "chỉ sửa ghi chú ⇒ không dòng đổi tên");
  // ghiChu rỗng ⇒ xoá ghi chú (NULL)
  const x = await sua(w, ma, { ghiChu: "   ", updatedAt: (await mot(w, ma)).updatedAt });
  assert.equal(x.status, 200, x.text);
  assert.equal(dongLoai(w, ma).note, null);
  assert.equal(nhatKy(w, "prc_partner_type_note").length, 2);
});

test("A7: thêm, tắt, bật, đổi tên, sửa ghi chú ⇒ mọi dòng nhật ký prc_partner_type_% có target_type ledger và target_id = mã", async () => {
  const w = setup();
  const ma = await themLoai(w);
  assert.equal((await w.call("POST", `/api/pricing/loai-doi-tac/${ma}/tat`, { as: KT, body: {} })).status, 200);
  assert.equal((await w.call("POST", `/api/pricing/loai-doi-tac/${ma}/bat`, { as: KT, body: {} })).status, 200);
  assert.equal((await sua(w, ma, { ten: "Spa đổi", updatedAt: (await mot(w, ma)).updatedAt })).status, 200);
  assert.equal((await sua(w, ma, { ghiChu: "Ghi chú thử", updatedAt: (await mot(w, ma)).updatedAt })).status, 200);
  const rows = w.q("SELECT action, target_type, target_id FROM audit_log WHERE action LIKE 'prc_partner_type_%' ORDER BY rowid");
  assert.deepEqual(rows.map((x: { action: string }) => x.action), ["prc_partner_type_added", "prc_partner_type_off", "prc_partner_type_on", "prc_partner_type_renamed", "prc_partner_type_note"]);
  for (const x of rows) assert.deepEqual([x.target_type, x.target_id], ["ledger", ma], x.action);
});

test("Review: lưu không đổi gì ⇒ 200, 0 dòng nhật ký, updated_at giữ nguyên", async () => {
  const w = setup();
  const ma = await themLoai(w);
  assert.equal((await sua(w, ma, { ghiChu: "Có ghi chú", updatedAt: (await mot(w, ma)).updatedAt })).status, 200);
  const l = await mot(w, ma);
  const dong = dongLoai(w, ma);
  const n = soNhatKy(w);
  const r = await sua(w, ma, { ten: `  ${TEN} `, ghiChu: " Có ghi chú ", updatedAt: l.updatedAt });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.loai, l);
  assert.equal(soNhatKy(w), n);
  assert.deepEqual({ ...dongLoai(w, ma) }, { ...dong });
});

test("Review: đổi «Nhân viên spa» → «nhân viên  SPA» (chỉ hoa thường / khoảng trắng của CHÍNH nó) ⇒ 200, không coi là trùng", async () => {
  const w = setup();
  const ma = await themLoai(w);
  const r = await sua(w, ma, { ten: "nhân viên  SPA", updatedAt: (await mot(w, ma)).updatedAt });
  assert.equal(r.status, 200, r.text);
  assert.equal(dongLoai(w, ma).name, "nhân viên SPA");
  assert.equal(nhatKy(w, "prc_partner_type_renamed")[0]!.detail, "«Nhân viên spa» → «nhân viên SPA»");
});

test("Review: loại đang tắt vẫn đổi tên được", async () => {
  const w = setup();
  const ma = await themLoai(w);
  assert.equal((await w.call("POST", `/api/pricing/loai-doi-tac/${ma}/tat`, { as: KT, body: {} })).status, 200);
  const r = await sua(w, ma, { ten: "Spa đã tắt", updatedAt: (await mot(w, ma)).updatedAt });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.loai.dangBat, false);
  assert.equal(r.json.loai.ten, "Spa đã tắt");
});

test("Review: gửi cả tên lẫn ghi chú đều đổi ⇒ hai dòng nhật ký (một mỗi hành động), dòng loại đổi một lần", async () => {
  const w = setup();
  const ma = await themLoai(w);
  const n = soNhatKy(w);
  const r = await sua(w, ma, { ten: "Spa hai việc", ghiChu: "Ghi chú hai việc", updatedAt: (await mot(w, ma)).updatedAt }, ADM);
  assert.equal(r.status, 200, r.text);
  assert.equal(soNhatKy(w), n + 2);
  assert.equal(nhatKy(w, "prc_partner_type_renamed").length, 1);
  assert.equal(nhatKy(w, "prc_partner_type_note").length, 1);
  const d = dongLoai(w, ma);
  assert.deepEqual([d.name, d.note, d.updated_by], ["Spa hai việc", "Ghi chú hai việc", ADM]);
  assert.equal(r.json.loai.updatedAt, d.updated_at);
});
