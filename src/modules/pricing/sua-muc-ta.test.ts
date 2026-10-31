// Mã định danh 5.26, Task 4 — route `PATCH /api/pricing/muc-ta/:code`: đổi tên + sửa ghi chú cấp đại lý (đặc tả 2026-10-31 §3, §6) và nhật ký cấp đại lý ghi mã ở ô đối tượng.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs); khung như muc-ta.test.ts / sua-loai-doi-tac.test.ts.
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
const ORG = "dda00000-0000-4000-8000-0000000000a1";
const DA_DOI = "Cấp đại lý này vừa được người khác sửa, mở lại để xem bản mới.";
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
async function themMuc(w: W, ten = "Cấp vàng"): Promise<string> {
  const r = await w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten } });
  assert.equal(r.status, 201, r.text);
  return r.json.muc.code as string;
}
/** Hồ sơ ORG mang một loại được hưởng (điều kiện để gắn cấp riêng). */
async function hoSoDuocHuong(w: W): Promise<void> {
  const loai = (await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: "Lữ hành" } })).json.loai.code;
  const g = await w.call("POST", `/api/parties/${ORG}/roles`, { as: ADM, body: { roleTypeCode: loai } });
  assert.equal(g.status, 201, g.text);
}
const sua = (w: W, code: string, body: unknown, as = KT) => w.call("PATCH", `/api/pricing/muc-ta/${code}`, { as, body });
const danhSach = async (w: W) => {
  const r = await w.call("GET", "/api/pricing/muc-ta", { as: KT });
  assert.equal(r.status, 200, r.text);
  return r.json;
};
const mot = async (w: W, code: string) => (await danhSach(w)).muc.find((x: { code: string }) => x.code === code);
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const soNhatKy = (w: W) => dem(w, "SELECT count(*) AS n FROM audit_log");
const nhatKy = (w: W, action: string): { detail: string; target_type: string | null; target_id: string | null }[] =>
  w.q("SELECT detail, target_type, target_id FROM audit_log WHERE action = ? ORDER BY rowid", action);
const dongMuc = (w: W, code: string) => w.q("SELECT name, name_key, note, updated_at, updated_by FROM prc_rate_tier WHERE code = ?", code)[0];
const cho = () => new Promise((r) => setTimeout(r, 2)); // khoá so updated_at tới mili-giây

test("A1: Kế toán đổi tên cấp ⇒ 200; danh sách và gắn riêng hiện tên mới cùng mã; một dòng nhật ký «cũ» → «mới» có mã", async () => {
  const w = setup();
  const ma = await themMuc(w);
  await hoSoDuocHuong(w);
  const g = await w.call("POST", `/api/pricing/ho-so/${ORG}/muc-rieng`, { as: KT, body: { muc: ma, tuNgay: "2026-01-01" } });
  assert.equal(g.status, 201, g.text);
  const truoc = await mot(w, ma);
  await cho();
  const r = await sua(w, ma, { ten: "Cấp bạch kim", updatedAt: truoc.updatedAt });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.muc.code, ma);
  assert.equal(r.json.muc.ten, "Cấp bạch kim");
  const ds = await danhSach(w);
  const sau = ds.muc.find((x: { code: string }) => x.code === ma);
  assert.equal(sau.ten, "Cấp bạch kim");
  assert.equal(sau.suaBoi, "Lan Kế Toán");
  assert.notEqual(sau.updatedAt, truoc.updatedAt);
  assert.equal(ds.ganRieng.find((x: { muc: string }) => x.muc === ma).tenMuc, "Cấp bạch kim");
  assert.deepEqual(nhatKy(w, "prc_rate_tier_renamed").map((x) => ({ ...x })), [{ detail: "«Cấp vàng» → «Cấp bạch kim»", target_type: "ledger", target_id: ma }]);
});

test("A1: DTO có đủ trường — ghi chú, ai tạo / sửa (tên), updatedAt, soLoai, soDoiTac đếm gắn đang / sắp hiệu lực", async () => {
  const w = setup();
  const ma = await themMuc(w);
  const l = await mot(w, ma);
  assert.equal(typeof l.updatedAt, "string");
  assert.deepEqual({ ghiChu: l.ghiChu, taoBoi: l.taoBoi, suaBoi: l.suaBoi, suaLuc: l.suaLuc, taoLuc: l.taoLuc, soLoai: l.soLoai, soDoiTac: l.soDoiTac },
    { ghiChu: null, taoBoi: "Lan Kế Toán", suaBoi: "Lan Kế Toán", suaLuc: l.taoLuc, taoLuc: l.updatedAt, soLoai: 0, soDoiTac: 0 });
  const loai = (await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: "Lữ hành" } })).json.loai.code;
  assert.equal((await w.call("POST", `/api/parties/${ORG}/roles`, { as: ADM, body: { roleTypeCode: loai } })).status, 201);
  assert.equal((await w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai, muc: ma, tuNgay: "2026-01-01" } })).status, 201);
  assert.equal((await w.call("POST", `/api/pricing/ho-so/${ORG}/muc-rieng`, { as: KT, body: { muc: ma, tuNgay: "2026-01-01" } })).status, 201);
  const x = await mot(w, ma);
  assert.deepEqual([x.soLoai, x.soDoiTac], [1, 1]);
});

test("A2: tên trùng cấp khác ⇒ 409 muc_trung, không đổi, không nhật ký; tên có SĐT ⇒ 400; ghi chú có SĐT ⇒ 400", async () => {
  const w = setup();
  const ma = await themMuc(w);
  await themMuc(w, "Cấp bạc");
  const truoc = await mot(w, ma);
  const dong = dongMuc(w, ma);
  const n = soNhatKy(w);
  const r = await sua(w, ma, { ten: "cấp  BẠC", updatedAt: truoc.updatedAt });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "muc_trung");
  assert.equal((await sua(w, ma, { ten: "Gọi 0905123456", updatedAt: truoc.updatedAt })).status, 400);
  assert.equal((await sua(w, ma, { ghiChu: "Gọi 0905123456", updatedAt: truoc.updatedAt })).status, 400);
  assert.deepEqual({ ...dongMuc(w, ma) }, { ...dong });
  assert.equal(soNhatKy(w), n);
});

test("A2: thân sai — vắng tên và ghi chú ⇒ 400; vắng / null / không phải chuỗi updatedAt ⇒ 400; mã sai dạng hoặc lạ ⇒ 404", async () => {
  const w = setup();
  const ma = await themMuc(w);
  const l = await mot(w, ma);
  const n = soNhatKy(w);
  assert.equal((await sua(w, ma, { updatedAt: l.updatedAt })).status, 400);
  assert.equal((await sua(w, ma, { ten: "Mới" })).status, 400);
  assert.equal((await sua(w, ma, { ten: "Mới", updatedAt: null })).status, 400);
  assert.equal((await sua(w, ma, { ten: "Mới", updatedAt: 5 })).status, 400);
  for (const code of ["MT_KHONGCOGI", "khong-hop-le", "LD_ABCDEFGH"]) {
    const r = await sua(w, code, { ten: "Mới", updatedAt: l.updatedAt });
    assert.equal(r.status, 404, `${code}: ${r.text}`);
    assert.equal(r.json.error.message, "Không tìm thấy cấp đại lý này.");
  }
  assert.equal(soNhatKy(w), n);
});

test("A4: thiếu ô partner.commission.write hoặc giữ quyền Đối tác ⇒ 403; Kế toán, Quản trị, Toàn quyền ⇒ 200", async () => {
  const w = setup();
  const ma = await themMuc(w);
  const n = soNhatKy(w);
  for (const as of [SALES, HDV, HR, DRV, DP, DT, KP]) {
    const r = await sua(w, ma, { ten: "Cấp bị chặn", updatedAt: (await mot(w, ma)).updatedAt }, as);
    assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
  assert.equal(soNhatKy(w), n);
  for (const [as, ten] of [[KT, "Cấp một"], [ADM, "Cấp hai"], [SA, "Cấp ba"]] as const) {
    await cho();
    const r = await sua(w, ma, { ten, updatedAt: (await mot(w, ma)).updatedAt }, as);
    assert.equal(r.status, 200, `${as}: ${r.text}`);
  }
});

test("A5: hai PATCH cùng updatedAt ⇒ một 200, một 409 da_doi đúng câu, đúng một dòng nhật ký (kể cả bên thua gửi cả tên lẫn ghi chú)", async () => {
  const w = setup();
  const ma = await themMuc(w);
  const u = (await mot(w, ma)).updatedAt;
  await cho();
  const n = soNhatKy(w);
  const a = await sua(w, ma, { ten: "Cấp A", updatedAt: u });
  const b = await sua(w, ma, { ten: "Cấp B", ghiChu: "Ghi chú bên thua", updatedAt: u }, ADM);
  assert.deepEqual([a.status, b.status], [200, 409]);
  assert.equal(b.json.error.code, "da_doi");
  assert.equal(b.json.error.message, DA_DOI);
  assert.equal(soNhatKy(w), n + 1);
  assert.equal(nhatKy(w, "prc_rate_tier_note").length, 0);
  assert.deepEqual([dongMuc(w, ma).name, dongMuc(w, ma).note], ["Cấp A", null]);
});

test("A5: mở (đọc updatedAt) → người khác Khoá cấp → PATCH ⇒ 409 da_doi, không ghi", async () => {
  const w = setup();
  const ma = await themMuc(w);
  const u = (await mot(w, ma)).updatedAt;
  await cho();
  assert.equal((await w.call("POST", `/api/pricing/muc-ta/${ma}/tat`, { as: ADM, body: {} })).status, 200);
  const n = soNhatKy(w);
  const r = await sua(w, ma, { ten: "Cấp sau khoá", updatedAt: u });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "da_doi");
  assert.equal(soNhatKy(w), n);
});

test("A6: sửa ghi chú ⇒ dòng prc_rate_tier_note có mã, detail KHÔNG chứa nội dung ghi chú; ghi chú rỗng / null xoá ghi chú", async () => {
  const w = setup();
  const ma = await themMuc(w);
  const r = await sua(w, ma, { ghiChu: "Đại lý khu Trần Phú", updatedAt: (await mot(w, ma)).updatedAt });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.muc.ghiChu, "Đại lý khu Trần Phú");
  const nk = nhatKy(w, "prc_rate_tier_note");
  assert.equal(nk.length, 1);
  assert.doesNotMatch(nk[0]!.detail ?? "", /Trần Phú/);
  assert.deepEqual([nk[0]!.target_type, nk[0]!.target_id], ["ledger", ma]);
  assert.equal(nhatKy(w, "prc_rate_tier_renamed").length, 0);
  await cho();
  assert.equal((await sua(w, ma, { ghiChu: null, updatedAt: (await mot(w, ma)).updatedAt })).status, 200);
  assert.equal(dongMuc(w, ma).note, null);
  assert.equal(nhatKy(w, "prc_rate_tier_note").length, 2);
  const dong = dongMuc(w, ma);
  const x = await sua(w, ma, { ten: null, updatedAt: (await mot(w, ma)).updatedAt });
  assert.equal(x.status, 400, x.text);
  assert.deepEqual({ ...dongMuc(w, ma) }, { ...dong });
});

test("A7: thêm, khoá, mở, đổi tên, sửa ghi chú ⇒ mọi dòng nhật ký prc_rate_tier_% có target_type ledger và target_id = mã", async () => {
  const w = setup();
  const ma = await themMuc(w);
  assert.equal((await w.call("POST", `/api/pricing/muc-ta/${ma}/tat`, { as: KT, body: {} })).status, 200);
  assert.equal((await w.call("POST", `/api/pricing/muc-ta/${ma}/bat`, { as: KT, body: {} })).status, 200);
  await cho();
  assert.equal((await sua(w, ma, { ten: "Cấp đổi", updatedAt: (await mot(w, ma)).updatedAt })).status, 200);
  await cho();
  assert.equal((await sua(w, ma, { ghiChu: "Ghi chú thử", updatedAt: (await mot(w, ma)).updatedAt })).status, 200);
  const rows = w.q("SELECT action, target_type, target_id FROM audit_log WHERE action LIKE 'prc_rate_tier_%' ORDER BY rowid");
  assert.deepEqual(rows.map((x: { action: string }) => x.action), ["prc_rate_tier_added", "prc_rate_tier_off", "prc_rate_tier_on", "prc_rate_tier_renamed", "prc_rate_tier_note"]);
  for (const x of rows) assert.deepEqual([x.target_type, x.target_id], ["ledger", ma], x.action);
});

test("Cấp đang khoá vẫn đổi tên được; lưu không đổi gì ⇒ 200, 0 dòng nhật ký, dòng giữ nguyên", async () => {
  const w = setup();
  const ma = await themMuc(w);
  assert.equal((await w.call("POST", `/api/pricing/muc-ta/${ma}/tat`, { as: KT, body: {} })).status, 200);
  await cho();
  const r = await sua(w, ma, { ten: "Cấp đã khoá", updatedAt: (await mot(w, ma)).updatedAt });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.muc.dangBat, false);
  const l = await mot(w, ma);
  const dong = dongMuc(w, ma);
  const n = soNhatKy(w);
  const k = await sua(w, ma, { ten: "  Cấp đã  khoá ", updatedAt: l.updatedAt });
  assert.equal(k.status, 200, k.text);
  assert.deepEqual(k.json.muc, l);
  assert.equal(soNhatKy(w), n);
  assert.deepEqual({ ...dongMuc(w, ma) }, { ...dong });
});

test("Chỉ đổi hoa thường / khoảng trắng của CHÍNH nó ⇒ 200, không coi là trùng", async () => {
  const w = setup();
  const ma = await themMuc(w);
  const r = await sua(w, ma, { ten: "cấp  VÀNG", updatedAt: (await mot(w, ma)).updatedAt });
  assert.equal(r.status, 200, r.text);
  assert.equal(dongMuc(w, ma).name, "cấp VÀNG");
});

test("Tên cấp mới hiện ở GET /muc-ta, trong gan[].muc.ten của gắn loại và trong chuỗi ghi cho mọi nơi đọc tên", async () => {
  const w = setup();
  const ma = await themMuc(w);
  const loai = (await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: "Lữ hành" } })).json.loai.code;
  assert.equal((await w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai, muc: ma, tuNgay: "2026-01-01" } })).status, 201);
  await cho();
  assert.equal((await sua(w, ma, { ten: "Cấp mới tinh", updatedAt: (await mot(w, ma)).updatedAt })).status, 200);
  const x = await mot(w, ma);
  assert.equal(x.ten, "Cấp mới tinh");
  assert.equal(x.gan[0].muc.ten, "Cấp mới tinh");
});
