// ADR-0122 đ5 (lát H-1 Gói 2): ngày sinh + liên hệ ĐỊA CHỈ qua route thật (tests/audit/harness.mjs). Đọc: Bán hàng, Kế toán không thấy; Quản trị theo cấp bậc,
// Toàn quyền, chính chủ thấy. Ghi: thiếu ô ⇒ 403 personal_forbidden; chính chủ ⇒ 403 personal_self. PUT vắng birthDate giữ nguyên. Tìm kiếm không khớp địa chỉ.
// Nhật ký không chứa ngày sinh / địa chỉ. Xem trước gộp gọi đúng nhãn "Địa chỉ" và không lộ địa chỉ của hồ sơ cấp trên.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ACC = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const ADM2 = "44444444-4444-4444-8444-444444444444";
const SUP = "77777777-7777-4777-8777-777777777777";
const NGAY = "1988-04-23";
const SO_NHA = "975310";
const DIA_CHI = `${SO_NHA} Đường Thử, Nha Trang`;

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000002", name: "Bình", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: ADM2, phone: "0900000004", name: "Quản trị Hai", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
const pty = (id: string) => `pty-${id}`;
async function taoKhach(w: any, ten = "Khách Riêng Tư", dc = DIA_CHI): Promise<string> {
  const r = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: ten, birthDate: NGAY, contacts: [{ kind: "PHONE", value: "0911222333" }, { kind: "ADDRESS", value: dc }] } });
  assert.equal(r.status, 201, r.text);
  return r.json.party.id as string;
}
const ngaySinh = (w: any, id: string) => w.q("SELECT birth_date FROM pty_person WHERE party_id = ?", id)[0].birth_date;
const datNgaySinh = (w: any, id: string, v: string | null) => w.sqlite.prepare("UPDATE pty_person SET birth_date = ? WHERE party_id = ?").run(v, id);
const nhatKy = (w: any, id: string): string[] => w.q("SELECT detail FROM audit_log WHERE target_id = ? ORDER BY rowid", id).map((r: any) => String(r.detail ?? ""));
async function sua(w: any, as: string, id: string, them: Record<string, unknown>) {
  const cur = w.q("SELECT updated_at u, active a, display_name n FROM pty_party WHERE id = ?", id)[0];
  return w.call("PUT", `/api/parties/${id}`, { as, body: { fullName: cur.n, active: cur.a === 1, expectedUpdatedAt: cur.u, ...them } });
}
/** Chèn thẳng một dòng ADDRESS đang mở (hồ sơ gắn tài khoản — không qua route để dựng ca cấp bậc). */
const gieoDiaChi = (w: any, partyId: string, value: string) =>
  w.sqlite.prepare(
    "INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, created_at, updated_at) VALUES (?, ?, 'ADDRESS', ?, ?, 1, '2026-01-01', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')",
  ).run(crypto.randomUUID(), partyId, value, value.toLowerCase());

test("đọc: Bán hàng, Kế toán không có khoá birthDate, không dòng ADDRESS, không chữ ngày sinh / địa chỉ; Quản trị, Toàn quyền thấy đủ", async () => {
  const w = setup();
  const id = await taoKhach(w);
  for (const as of [SALES, ACC]) {
    const r = await w.call("GET", `/api/parties/${id}`, { as });
    assert.equal(r.status, 200, r.text);
    assert.equal("birthDate" in r.json.party, false, as);
    assert.deepEqual(r.json.party.contacts.map((c: any) => c.kind), ["PHONE"], as);
    assert.doesNotMatch(r.text, new RegExp(`${SO_NHA}|${NGAY}`), as);
  }
  for (const as of [ADM, SUP]) {
    const r = await w.call("GET", `/api/parties/${id}`, { as });
    assert.equal(r.json.party.birthDate, NGAY, as);
    assert.ok(r.json.party.contacts.some((c: any) => c.kind === "ADDRESS" && c.value === DIA_CHI), as);
  }
});

test("đọc: phản hồi sau khi Bán hàng GHI (thêm SĐT, đổi tên) cũng không kèm ngày sinh / địa chỉ — mọi phản hồi hồ sơ đi qua cùng bộ lọc", async () => {
  const w = setup();
  const id = await taoKhach(w);
  let r = await w.call("POST", `/api/parties/${id}/contacts`, { as: SALES, body: { kind: "PHONE", value: "0911222444" } });
  assert.equal(r.status, 201, r.text);
  assert.doesNotMatch(r.text, new RegExp(`${SO_NHA}|${NGAY}`));
  r = await sua(w, SALES, id, { fullName: "Khách Tên Mới" });
  assert.equal(r.status, 200, r.text);
  assert.doesNotMatch(r.text, new RegExp(`${SO_NHA}|${NGAY}`));
});

test("đọc: chính chủ (Bán hàng mở hồ sơ của mình) thấy ngày sinh của mình", async () => {
  const w = setup();
  datNgaySinh(w, pty(SALES), NGAY);
  const r = await w.call("GET", `/api/parties/${pty(SALES)}`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.party.birthDate, NGAY);
});

test("đọc theo cấp bậc: Quản trị mở hồ sơ của Quản trị khác → không thấy; Toàn quyền mở → thấy", async () => {
  const w = setup();
  datNgaySinh(w, pty(ADM), NGAY);
  let r = await w.call("GET", `/api/parties/${pty(ADM)}`, { as: ADM2 });
  assert.equal(r.status, 200, r.text);
  assert.equal("birthDate" in r.json.party, false);
  r = await w.call("GET", `/api/parties/${pty(ADM)}`, { as: SUP });
  assert.equal(r.json.party.birthDate, NGAY);
});

test("ghi: Bán hàng gửi birthDate (tạo, sửa), thêm ADDRESS, đóng ADDRESS → 403 personal_forbidden, không ghi gì", async () => {
  const w = setup();
  const id = await taoKhach(w);
  let r = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Khách Mới", birthDate: "1990-01-01", contacts: [] } });
  assert.equal(r.status, 403);
  assert.equal(r.json.error.code, "personal_forbidden");
  r = await w.call("POST", "/api/parties", { as: SALES, body: { kind: "PERSON", fullName: "Khách Mới", contacts: [{ kind: "ADDRESS", value: "1 Đường Khác" }] } });
  assert.equal(r.status, 403);
  r = await sua(w, SALES, id, { birthDate: "1990-01-01" });
  assert.equal(r.status, 403);
  assert.equal(r.json.error.code, "personal_forbidden");
  assert.equal(ngaySinh(w, id), NGAY);
  r = await w.call("POST", `/api/parties/${id}/contacts`, { as: SALES, body: { kind: "ADDRESS", value: "1 Đường Khác" } });
  assert.equal(r.status, 403);
  const dc = w.q("SELECT id FROM pty_contact_point WHERE party_id = ? AND contact_kind_code = 'ADDRESS'", id)[0].id as string;
  r = await w.call("POST", `/api/parties/${id}/contacts/${dc}/end`, { as: SALES, body: {} });
  assert.equal(r.status, 403);
  assert.equal(w.q("SELECT valid_to_date FROM pty_contact_point WHERE id = ?", dc)[0].valid_to_date, null, "địa chỉ vẫn mở");
  assert.equal(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND contact_kind_code = 'ADDRESS'", id)[0].n, 1);
  assert.equal(w.q("SELECT count(*) n FROM pty_party WHERE display_name = 'Khách Mới'")[0].n, 0, "không tạo hồ sơ nào khi bị chặn");
});

test("ghi: Toàn quyền sửa ngày sinh của CHÍNH MÌNH → 403 personal_self; Toàn quyền sửa ngày sinh của Quản trị → được", async () => {
  const w = setup();
  let r = await sua(w, SUP, pty(SUP), { birthDate: NGAY });
  assert.equal(r.status, 403, r.text);
  assert.equal(r.json.error.code, "personal_self");
  assert.equal(ngaySinh(w, pty(SUP)), null);
  r = await sua(w, SUP, pty(ADM), { birthDate: NGAY });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.party.birthDate, NGAY);
});

test("PUT vắng birthDate ⇒ giữ nguyên (Bán hàng đổi tên không xoá ngày sinh); '' ⇒ xoá; nhật ký 'đổi ngày sinh' không kèm giá trị", async () => {
  const w = setup();
  const id = await taoKhach(w);
  let r = await sua(w, SALES, id, { fullName: "Khách Đổi Tên" });
  assert.equal(r.status, 200, r.text);
  assert.equal(ngaySinh(w, id), NGAY, "Bán hàng đổi tên không được xoá ngày sinh họ không thấy");
  r = await sua(w, ADM, id, { birthDate: "" });
  assert.equal(r.status, 200, r.text);
  assert.equal(ngaySinh(w, id), null);
  const nk = nhatKy(w, id);
  assert.ok(nk.some((d) => d.includes("đổi ngày sinh")));
  for (const d of nk) assert.doesNotMatch(d, new RegExp(`${NGAY}|${SO_NHA}|Đường Thử`), "nhật ký không chứa ngày sinh / địa chỉ");
});

test("tìm kiếm Danh bạ: chữ số của địa chỉ không ra hồ sơ; số điện thoại vẫn ra", async () => {
  const w = setup();
  const id = await taoKhach(w);
  let r = await w.call("GET", `/api/parties?q=${SO_NHA}`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.parties.some((p: any) => p.id === id), false, "tìm theo chữ số địa chỉ lộ người ở địa chỉ đó");
  r = await w.call("GET", `/api/parties?q=${SO_NHA}`, { as: ACC });
  assert.equal(r.json.parties.some((p: any) => p.id === id), false, "Kế toán cũng không dò được");
  r = await w.call("GET", "/api/parties?q=0911222333", { as: SALES });
  assert.equal(r.json.parties.some((p: any) => p.id === id), true);
});

test("ADDRESS cho hồ sơ tổ chức → 400; thêm địa chỉ cho người ghi nhật ký 'thêm địa chỉ' không kèm giá trị", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "ORGANIZATION", displayName: "Đại lý A", contacts: [] } })).json.party.id as string;
  let r = await w.call("POST", `/api/parties/${o}/contacts`, { as: ADM, body: { kind: "ADDRESS", value: "1 Đường A" } });
  assert.equal(r.status, 400, r.text);
  const p = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Người Không Địa Chỉ", contacts: [] } })).json.party.id as string;
  r = await w.call("POST", `/api/parties/${p}/contacts`, { as: ADM, body: { kind: "ADDRESS", value: DIA_CHI } });
  assert.equal(r.status, 201, r.text);
  const nk = nhatKy(w, p);
  assert.ok(nk.includes("thêm địa chỉ"));
  for (const d of nk) assert.doesNotMatch(d, new RegExp(SO_NHA));
});

test("xem trước gộp hồ sơ: liên hệ địa chỉ mang nhãn 'Địa chỉ', không 'Email'", async () => {
  const w = setup();
  const a = await taoKhach(w, "Nguyễn Văn Gộp", "11 Đường Gộp, Nha Trang");
  const b = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Nguyễn Văn Gộp", contacts: [] } })).json.party.id as string;
  const r = await w.call("POST", `/api/parties/${a}/merge/preview`, { as: ADM, body: { intoPartyId: b } });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.chuyen.some((m: any) => m.loai === "LIEN_HE" && m.nhan.startsWith("Địa chỉ ")), JSON.stringify(r.json.chuyen));
  assert.equal(r.json.chuyen.some((m: any) => m.nhan.startsWith("Email ")), false);
});

test("gộp hồ sơ: gộp khách có địa chỉ vào hồ sơ CỦA CHÍNH MÌNH → 403 personal_self, không gộp; gộp vào hồ sơ người khác quản được → được, địa chỉ sang hồ sơ chính", async () => {
  // Gộp chuyển liên hệ ĐỊA CHỈ sang hồ sơ chính = ghi trường riêng tư của hồ sơ chính — chính chủ không tự ghi (Hiến chương 5.23).
  const w = setup();
  const a = await taoKhach(w, "Khách Gộp Vào Mình", "21 Đường Gộp Mình, Nha Trang");
  let r = await w.call("POST", `/api/parties/${a}/merge`, { as: SUP, body: { intoPartyId: pty(SUP), xacNhan: "Khách Gộp Vào Mình" } });
  assert.equal(r.status, 403, r.text);
  assert.equal(r.json.error.code, "personal_self");
  assert.equal(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND contact_kind_code = 'ADDRESS'", pty(SUP))[0].n, 0);
  assert.equal(w.q("SELECT merged_into_id m FROM pty_party WHERE id = ?", a)[0].m, null, "hồ sơ phụ chưa bị gộp");
  r = await w.call("POST", `/api/parties/${a}/merge`, { as: SUP, body: { intoPartyId: pty(ADM), xacNhan: "Khách Gộp Vào Mình" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT count(*) n FROM pty_contact_point WHERE party_id = ? AND contact_kind_code = 'ADDRESS' AND valid_to_date IS NULL", pty(ADM))[0].n, 1);
});

test("xem trước gộp theo cấp bậc: Quản trị xem trước gộp hồ sơ của Quản trị KHÁC (có địa chỉ) vào hồ sơ khách → không thấy địa chỉ đó; Toàn quyền thấy", async () => {
  // Hồ sơ phụ gắn tài khoản chỉ bị CHẶN gộp (merge_source_has_account) nhưng bảng xem trước vẫn kê liên hệ của nó — lọt địa chỉ của cấp trên nếu không lọc.
  const w = setup();
  const DC_CAP_TREN = "864213 Đường Cấp Trên, Nha Trang";
  gieoDiaChi(w, pty(ADM), DC_CAP_TREN);
  const b = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Khách Đích", contacts: [] } })).json.party.id as string;
  let r = await w.call("POST", `/api/parties/${pty(ADM)}/merge/preview`, { as: ADM2, body: { intoPartyId: b } });
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.chan.some((c: any) => c.code === "merge_source_has_account"), r.text);
  assert.doesNotMatch(r.text, /864213|Đường Cấp Trên/, "Quản trị thấy địa chỉ của Quản trị khác qua bảng xem trước gộp");
  r = await w.call("POST", `/api/parties/${pty(ADM)}/merge/preview`, { as: SUP, body: { intoPartyId: b } });
  assert.equal(r.status, 200, r.text);
  assert.match(r.text, /864213/, "Toàn quyền quản được hồ sơ Quản trị nên thấy");
});
