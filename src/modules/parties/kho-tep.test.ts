// Việc BÊN NGOÀI của kho tệp (ADR-0123 đ6; Hiến chương 5.16): lô D1 (quyết xoá) chạy TRƯỚC, xoá R2 SAU; lô lỗi ⇒ không chạm kho; kho lỗi ⇒ không ném,
// dòng còn "chờ xoá" để chạy lại. Chạy trên SQLite THẬT (schema từ migrations) + kho R2 giả.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, khoR2Gia, openDb } from "../../../tests/audit/harness.mjs";
import { ghiRoiXoaKho, xoaKhoiKho } from "./kho-tep.ts";
import { datChoXoaTepStatement } from "./repository.ts";

const AT = "2026-10-16T03:00:00.000Z";
const KEY = "pty/" + "1".repeat(32);
function dung() {
  const db = openDb();
  const D = fakeD1(db);
  const r2 = khoR2Gia();
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p', 'PERSON', 'p', 1, ?, ?)").run(AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p', 'p', ?, ?)").run(AT, AT);
  db.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, stored_at, created_at, created_by, updated_at, updated_by)
    VALUES ('t', 'p', ?, 'png', 3, ?, ?, ?, 's', ?, 's')`).run(KEY, "d".repeat(64), AT, AT, AT);
  return { db, D, r2 };
}
const dong = (db: any) => ({ ...db.prepare("SELECT purged_at, purge_reason, content_hash, r2_deleted_at FROM pty_attachment WHERE id = 't'").get() });
const luc = () => "2026-10-16T04:00:00.000Z";

test("ghiRoiXoaKho: lô D1 TRƯỚC (quyết xoá, băm về rỗng) rồi mới xoá kho; xoá xong đánh dấu r2_deleted_at", async () => {
  const { db, D, r2 } = dung();
  await r2.put(KEY, new Uint8Array([1, 2, 3]));
  let lucXoa: unknown = null;
  const xoaGoc = r2.delete;
  r2.delete = async (k: string) => { lucXoa = dong(db); return xoaGoc(k); };
  const kq = await ghiRoiXoaKho(D, r2, [datChoXoaTepStatement(D, { id: "t", lyDo: "TAI_LEN_LOI", at: AT, actorId: "s" })], [{ id: "t", storage_key: KEY }], luc);
  assert.deepEqual(kq, { daXoa: 1, loi: 0 });
  assert.equal((lucXoa as any).purged_at, AT, "lúc xoá kho, quyết định xoá ĐÃ nằm trong CSDL");
  assert.equal(r2.co(KEY), false);
  assert.deepEqual(dong(db), { purged_at: AT, purge_reason: "TAI_LEN_LOI", content_hash: null, r2_deleted_at: luc() });
});

test("ghiRoiXoaKho: lô D1 lỗi ⇒ ném lên, KHÔNG gọi xoá kho, dòng không đổi", async () => {
  const { db, D, r2 } = dung();
  await assert.rejects(ghiRoiXoaKho(D, r2, [D.prepare("INSERT INTO bang_khong_co VALUES (1)")], [{ id: "t", storage_key: KEY }], luc));
  assert.equal(r2.soLan.delete, 0);
  assert.equal(dong(db).purged_at, null);
});

test("xoaKhoiKho: kho lỗi ⇒ KHÔNG ném, đếm lỗi, dòng còn 'chờ xoá' (purged_at có, r2_deleted_at rỗng); lần sau kho lành ⇒ xoá xong", async () => {
  const { db, D, r2 } = dung();
  db.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI', content_hash = NULL WHERE id = 't'").run(AT);
  r2.hong.delete = true;
  assert.deepEqual(await xoaKhoiKho(D, r2, [{ id: "t", storage_key: KEY }], luc), { daXoa: 0, loi: 1 });
  assert.equal(dong(db).r2_deleted_at, null);
  r2.hong.delete = false;
  assert.deepEqual(await xoaKhoiKho(D, r2, [{ id: "t", storage_key: KEY }], luc), { daXoa: 1, loi: 0 });
  assert.equal(dong(db).r2_deleted_at, luc());
});
