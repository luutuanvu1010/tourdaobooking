// Tệp chờ của phiếu đăng ký (ADR-0208 Đ1, Đ2, Đ5, Đ7; migration 0171) trên SQLite THẬT + kho R2 giả: lô D1 trước, đặt kho sau, đánh dấu đã lưu; thay tệp cùng ô;
// trần tệp mỗi phiếu nguyên tử; gỡ không chạm tệp đã chuyển; chuyển lúc duyệt dùng lại đúng khoá kho, băm về rỗng; mục bắt buộc + hai view công bố (ADR-0210 Đ1).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, khoR2Gia, openDb } from "../../../tests/audit/harness.mjs";
import { MUC_XAC_MINH_MO } from "../../shared/dau-xac-minh.ts";
import { cauChuyenTepCho, cauGoTepCho, cauTepChoMoi, datKhoTepCho, timTepChoTrung, xoaKhoTepChoDaGo } from "./tep-cho.ts";

const AT = "2026-11-15T03:00:00.000Z";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7]);
const HASH = (c: string) => c.repeat(64);
const PHIEU = "DK_ABCDEFGH";

function dung() {
  const db = openDb();
  const D = fakeD1(db);
  const r2 = khoR2Gia();
  const env = { DB: D, HO_SO: r2 } as unknown as Env;
  return { db, D, r2, env };
}
async function them(c: ReturnType<typeof dung>, slot: string, hash: string, extra: { toiDa?: number } = {}) {
  const m = cauTepChoMoi(c.D, { registrationId: PHIEU, slot, contentKind: "png", byteSize: PNG.length, contentHash: hash, actorRef: "ident-1", toiDaMoiPhieu: extra.toiDa });
  const kq = await c.D.batch(m.statements);
  return { ...m, daChen: kq[0]!.meta.changes as number };
}
const dong = (db: any, id: string) => ({ ...db.prepare("SELECT * FROM pty_registration_attachment WHERE id = ?").get(id) });

test("cauTepChoMoi: một dòng chưa lưu, khoá pty/<32 hex>, băm có; datKhoTepCho đặt kho rồi đánh dấu đã lưu", async () => {
  const c = dung();
  const m = await them(c, "CCCD_MAT_TRUOC", HASH("a"));
  assert.match(m.storageKey, /^pty\/[0-9a-f]{32}$/);
  assert.equal(m.daChen, 1);
  let r = dong(c.db, m.id);
  assert.deepEqual([r.registration_id, r.slot, r.content_kind, r.byte_size, r.content_hash, r.stored_at, r.created_by], [PHIEU, "CCCD_MAT_TRUOC", "png", PNG.length, HASH("a"), null, "ident-1"]);
  assert.equal(await datKhoTepCho(c.env, m.id, m.storageKey, PNG), true);
  r = dong(c.db, m.id);
  assert.ok(r.stored_at);
  assert.ok(c.r2.co(m.storageKey));
});

test("datKhoTepCho: kho lỗi ⇒ false, không ném, dòng còn «tải dở dang»; chạy lại cùng khoá xong", async () => {
  const c = dung();
  const m = await them(c, "CCCD_MAT_TRUOC", HASH("a"));
  c.r2.hong.put = true;
  assert.equal(await datKhoTepCho(c.env, m.id, m.storageKey, PNG), false);
  assert.equal(dong(c.db, m.id).stored_at, null);
  c.r2.hong.put = false;
  assert.equal(await datKhoTepCho(c.env, m.id, m.storageKey, PNG), true);
  assert.ok(dong(c.db, m.id).stored_at);
});

test("datKhoTepCho: thiếu kho (binding vắng) ⇒ false, không ném", async () => {
  const c = dung();
  const m = await them(c, "CCCD_MAT_TRUOC", HASH("a"));
  assert.equal(await datKhoTepCho({ DB: c.D } as unknown as Env, m.id, m.storageKey, PNG), false);
});

test("timTepChoTrung: cùng phiếu, cùng ô, cùng băm ⇒ dòng đang sống; khác ô hoặc khác băm ⇒ null", async () => {
  const c = dung();
  const m = await them(c, "CCCD_MAT_TRUOC", HASH("a"));
  assert.deepEqual(await timTepChoTrung(c.D, PHIEU, "CCCD_MAT_TRUOC", HASH("a")), { id: m.id, storageKey: m.storageKey, daLuu: false });
  assert.equal(await timTepChoTrung(c.D, PHIEU, "CCCD_MAT_SAU", HASH("a")), null);
  assert.equal(await timTepChoTrung(c.D, PHIEU, "CCCD_MAT_TRUOC", HASH("b")), null);
});

test("thay tệp cùng ô: dòng cũ nhận quyết gỡ trong cùng lô (băm về rỗng); ô khác không đụng; xoaKhoTepChoDaGo xoá kho của dòng đã gỡ", async () => {
  const c = dung();
  const a = await them(c, "CCCD_MAT_TRUOC", HASH("a"));
  const khac = await them(c, "CCCD_MAT_SAU", HASH("c"));
  for (const m of [a, khac]) await datKhoTepCho(c.env, m.id, m.storageKey, PNG);
  const b = await them(c, "CCCD_MAT_TRUOC", HASH("b"));
  assert.equal(b.daChen, 1);
  const cu = dong(c.db, a.id);
  assert.deepEqual([cu.purge_reason, cu.content_hash, cu.r2_deleted_at], ["THAY_TEP", null, null]);
  assert.ok(cu.purged_at);
  assert.equal(dong(c.db, khac.id).purged_at, null);
  const kq = await xoaKhoTepChoDaGo(c.env, PHIEU, () => AT);
  assert.deepEqual(kq, { daXoa: 1, loi: 0 });
  assert.equal(c.r2.co(a.storageKey), false);
  assert.ok(c.r2.co(khac.storageKey));
  assert.equal(dong(c.db, a.id).r2_deleted_at, AT);
});

test("xoaKhoTepChoDaGo: kho xoá lỗi ⇒ không ném, dòng còn «chờ xoá», chạy lại xong", async () => {
  const c = dung();
  const a = await them(c, "CCCD_MAT_TRUOC", HASH("a"));
  await datKhoTepCho(c.env, a.id, a.storageKey, PNG);
  await c.D.batch(cauGoTepCho(c.D, PHIEU, "DA_RUT", AT));
  c.r2.hong.delete = true;
  assert.deepEqual(await xoaKhoTepChoDaGo(c.env, PHIEU, () => AT), { daXoa: 0, loi: 1 });
  assert.equal(dong(c.db, a.id).r2_deleted_at, null);
  c.r2.hong.delete = false;
  assert.deepEqual(await xoaKhoTepChoDaGo(c.env, PHIEU, () => AT), { daXoa: 1, loi: 0 });
});

test("trần tệp mỗi phiếu nguyên tử: tệp thứ (trần + 1) không được chèn (changes = 0), kể cả tệp đã thay", async () => {
  const c = dung();
  const a = await them(c, "O_MOT", HASH("a"), { toiDa: 3 });
  await them(c, "O_MOT", HASH("b"), { toiDa: 3 }); // thay: tệp đầu bị gỡ nhưng VẪN tính vào trần
  await them(c, "O_HAI", HASH("c"), { toiDa: 3 });
  const bon = await them(c, "O_BA", HASH("d"), { toiDa: 3 });
  assert.equal(bon.daChen, 0);
  assert.equal(c.db.prepare("SELECT count(*) n FROM pty_registration_attachment").get().n, 3);
  assert.ok(a.id);
});

test("cauGoTepCho: gỡ mọi tệp chưa chuyển của phiếu (kể cả chưa lưu), băm về rỗng; phiếu khác không đụng", async () => {
  const c = dung();
  const a = await them(c, "O_MOT", HASH("a"));
  const b = await them(c, "O_HAI", HASH("b"));
  await datKhoTepCho(c.env, a.id, a.storageKey, PNG);
  const kia = cauTepChoMoi(c.D, { registrationId: "DK_ZZZZZZZZ", slot: "O_MOT", contentKind: "png", byteSize: 3, contentHash: HASH("e"), actorRef: "i2" });
  await c.D.batch(kia.statements);
  await c.D.batch(cauGoTepCho(c.D, PHIEU, "TU_CHOI", AT));
  for (const id of [a.id, b.id]) {
    const r = dong(c.db, id);
    assert.deepEqual([r.purged_at, r.purge_reason, r.content_hash], [AT, "TU_CHOI", null]);
  }
  assert.equal(dong(c.db, kia.id).purged_at, null);
  assert.equal(await timTepChoTrung(c.D, PHIEU, "O_MOT", HASH("a")), null, "tệp đã gỡ không còn là tệp đang sống");
});

function giayToHoSo(db: any) {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('hs', 'PERSON', 'Người A', 1, ?, ?)").run(AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('hs', 'A', ?, ?)").run(AT, AT);
  db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, expiry_date, created_at, created_by, updated_at, updated_by)
    VALUES ('gt', 'hs', 'CCCD', '079000111222', '079000111222', '2035-01-01', ?, 'ad', ?, 'ad')`).run(AT, AT);
}

test("cauChuyenTepCho: tệp đã lưu → dòng pty_attachment dùng lại ĐÚNG khoá kho + dòng nối; dòng chờ có mốc đã chuyển, băm về rỗng; tệp chưa lưu bị gỡ", async () => {
  const c = dung();
  const a = await them(c, "CCCD_MAT_TRUOC", HASH("a"));
  const b = await them(c, "CCCD_MAT_SAU", HASH("b"));
  const dolang = await them(c, "ANH_KHAC", HASH("d"));
  for (const m of [a, b]) await datKhoTepCho(c.env, m.id, m.storageKey, PNG);
  giayToHoSo(c.db);
  const khoaTruoc = c.db.prepare("SELECT storage_key k FROM pty_registration_attachment ORDER BY id").all().map((x: any) => x.k);
  await c.D.batch(cauChuyenTepCho(c.D, { registrationId: PHIEU, version: 1, partyId: "hs", documentId: "gt", approverId: "ad", at: AT }));
  const tep = c.db.prepare("SELECT id, party_id, storage_key, content_hash, stored_at, created_by FROM pty_attachment ORDER BY storage_key").all().map((x: any) => ({ ...x }));
  assert.deepEqual(tep.map((t: any) => t.storage_key).sort(), [a.storageKey, b.storageKey].sort());
  for (const t of tep) assert.deepEqual([t.party_id, t.created_by, t.content_hash === null], ["hs", "ad", false]);
  const noi = c.db.prepare("SELECT attachment_id, target_kind, target_id FROM pty_attachment_link ORDER BY attachment_id").all().map((x: any) => ({ ...x }));
  assert.deepEqual(noi.map((n: any) => [n.target_kind, n.target_id]), [["PERSON_DOCUMENT", "gt"], ["PERSON_DOCUMENT", "gt"]]);
  for (const m of [a, b]) {
    const r = dong(c.db, m.id);
    assert.deepEqual([r.transferred_at, r.content_hash, r.purged_at], [AT, null, null]);
  }
  const d = dong(c.db, dolang.id);
  assert.deepEqual([d.transferred_at, d.purge_reason, d.content_hash], [null, "KHONG_THUOC_BAN_KHAI", null]);
  // bất biến: không khoá kho nào vừa ở dòng chờ chưa chuyển, vừa ở pty_attachment
  assert.equal(c.db.prepare(`SELECT count(*) n FROM pty_registration_attachment w JOIN pty_attachment p ON p.storage_key = w.storage_key WHERE w.transferred_at IS NULL`).get().n, 0);
  assert.equal(khoaTruoc.length, 3);
});

test("sau khi chuyển: gỡ phiếu không chạm tệp đã chuyển; dòng đã chuyển không gỡ được bằng tay; xoaKhoTepChoDaGo không xoá khoá đã thuộc hồ sơ", async () => {
  const c = dung();
  const a = await them(c, "CCCD_MAT_TRUOC", HASH("a"));
  await datKhoTepCho(c.env, a.id, a.storageKey, PNG);
  giayToHoSo(c.db);
  await c.D.batch(cauChuyenTepCho(c.D, { registrationId: PHIEU, version: 1, partyId: "hs", documentId: "gt", approverId: "ad", at: AT }));
  await c.D.batch(cauGoTepCho(c.D, PHIEU, "HET_HAN", AT));
  assert.equal(dong(c.db, a.id).purged_at, null);
  assert.throws(() => c.db.prepare("UPDATE pty_registration_attachment SET purged_at = ?, purge_reason = 'X1', content_hash = NULL WHERE id = ?").run(AT, a.id), /registration_attachment_transferred|CHECK/);
  assert.deepEqual(await xoaKhoTepChoDaGo(c.env, PHIEU, () => AT), { daXoa: 0, loi: 0 });
  assert.ok(c.r2.co(a.storageKey));
});

test("trigger chỉ-thêm: không xoá, không đổi khoá kho / ô / cỡ, băm không đặt lại, mốc không đổi chiều, INSERT OR REPLACE bị chặn", async () => {
  const c = dung();
  const a = await them(c, "O_MOT", HASH("a"));
  await datKhoTepCho(c.env, a.id, a.storageKey, PNG);
  const loi = (sql: string, re: RegExp, ...p: unknown[]) => assert.throws(() => c.db.prepare(sql).run(...p), re, sql);
  loi("DELETE FROM pty_registration_attachment", /no_delete/);
  loi("UPDATE pty_registration_attachment SET slot = 'O_KHAC'", /identity/);
  loi("UPDATE pty_registration_attachment SET registration_id = 'DK_KHAC'", /identity/);
  loi("UPDATE pty_registration_attachment SET storage_key = ?", /identity/, "pty/" + "9".repeat(32));
  loi("UPDATE pty_registration_attachment SET content_hash = ?", /hash_one_way/, HASH("f"));
  loi("UPDATE pty_registration_attachment SET stored_at = ?", /store_one_way/, AT);
  loi("UPDATE pty_registration_attachment SET r2_deleted_at = ?", /purge_one_way/, AT);
  loi("INSERT OR REPLACE INTO pty_registration_attachment (id, registration_id, slot, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at) VALUES (?, ?, 'O_MOT', ?, 'png', 3, ?, ?, 'x', ?)",
    /no_replace/, a.id, PHIEU, "pty/" + "8".repeat(32), HASH("g"), AT, AT);
  loi("INSERT INTO pty_registration_attachment (id, registration_id, slot, storage_key, content_kind, byte_size, content_hash, stored_at, created_at, created_by, updated_at) VALUES ('z', ?, 'O_MOT', ?, 'png', 3, ?, ?, ?, 'x', ?)",
    /insert_clean/, PHIEU, "pty/" + "7".repeat(32), HASH("h"), AT, AT, AT);
  loi("INSERT INTO pty_registration_attachment (id, registration_id, slot, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at) VALUES ('z', ?, 'O_MOT', ?, 'svg', 3, ?, ?, 'x', ?)",
    /CHECK/, PHIEU, "pty/" + "6".repeat(32), HASH("h"), AT, AT);
});

test("mục bắt buộc: tập đóng trong mã khớp trigger; mục ngoài tập bị chặn; chỉ thêm; view lấy bản hiệu lực mới nhất", async () => {
  const { db } = dung();
  const dem = () => db.prepare("SELECT item_kind, item_code FROM v_pty_verification_requirement WHERE subject_kind = 'PERSON' ORDER BY item_kind, item_code").all().map((x: any) => `${x.item_kind}:${x.item_code}`);
  assert.deepEqual(dem(), ["ATTRIBUTE:HO_TEN", "ATTRIBUTE:NGAY_SINH", "DOCUMENT:CCCD"], "gieo mặc định cho cá nhân");
  assert.deepEqual(db.prepare("SELECT * FROM v_pty_verification_requirement WHERE subject_kind = 'ORGANIZATION'").all(), [], "tổ chức để đợt 2 đặt");
  const them = (kind: string, code: string, at: string) => db.prepare("INSERT INTO pty_verification_requirement (id, subject_kind, item_kind, item_code, valid_from_at, created_at, updated_at) VALUES (?, 'PERSON', ?, ?, ?, ?, ?)")
    .run(`${kind}-${code}-${at}`, kind, code, at, at, at);
  const cho = () => new Promise((r) => setTimeout(r, 5));
  await cho();
  const NOW = new Date().toISOString(); // bản đầy đủ của tập đóng, hiệu lực từ bây giờ
  for (const [kind, codes] of Object.entries(MUC_XAC_MINH_MO)) for (const code of codes) them(kind, code, NOW);
  assert.throws(() => them("ATTRIBUTE", "DIA_CHI", NOW), /item_closed/);
  assert.throws(() => them("DOCUMENT", "GPLX", NOW), /item_closed/);
  assert.throws(() => them("DOCUMENT", "HO_TEN", NOW), /item_closed/, "mã đúng nhưng sai loại mục");
  assert.throws(() => them("ATTRIBUTE", "ho ten", NOW), /CHECK/);
  assert.throws(() => db.prepare("UPDATE pty_verification_requirement SET item_code = 'CCCD'").run(), /append_only/);
  assert.throws(() => db.prepare("DELETE FROM pty_verification_requirement").run(), /append_only/);
  // bản mới hơn thay hẳn bản cũ: chỉ còn họ tên
  await cho();
  const MOI = new Date().toISOString();
  db.prepare("INSERT INTO pty_verification_requirement (id, subject_kind, item_kind, item_code, valid_from_at, created_at, updated_at) VALUES ('moi', 'PERSON', 'ATTRIBUTE', 'HO_TEN', ?, ?, ?)").run(MOI, MOI, MOI);
  assert.deepEqual(dem(), ["ATTRIBUTE:HO_TEN"]);
});

test("v_pty_privacy_current: phiên bản chính sách mới nhất; chưa có ⇒ rỗng", () => {
  const { db } = dung();
  const co = () => db.prepare("SELECT id, version FROM v_pty_privacy_current").all().map((x: any) => ({ ...x }));
  const cuoi = co();
  const v0 = db.prepare("SELECT COALESCE(MAX(version), 0) n FROM pty_privacy_policy").get().n as number;
  assert.equal(cuoi.length, v0 === 0 ? 0 : 1);
  db.prepare("INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at) VALUES ('pp-moi', ?, 'mục đích', 'toàn văn', '2099-01-01T00:00:00.000Z', ?, 'ad', ?)").run(v0 + 1, AT, AT);
  assert.deepEqual(co(), [{ id: "pp-moi", version: v0 + 1 }]);
});
