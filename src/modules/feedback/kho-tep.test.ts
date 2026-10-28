// Việc BÊN NGOÀI của kho tệp vé hỗ trợ (ADR-0144 đ2, đ6; Hiến chương 5.16): datTepCuaTin chỉ đặt kho cho dòng CÓ THẬT, đặt hỏng ⇒ lô quyết xoá rồi xoá kho,
// và KHÔNG BAO GIỜ ném (route không được trả 5xx sau lô có vé). Chạy trên SQLite THẬT (schema từ migrations) + kho R2 giả.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, khoR2Gia, openDb } from "../../../tests/audit/harness.mjs";
import { datTepCuaTin, xoaKhoiKho } from "./kho-tep.ts";
import { datChoXoaTepStatement } from "./repository.ts";

const AT = "2026-10-28T03:00:00.000Z";
const KEY = "fbk/" + "1".repeat(32);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
function dung() {
  const db = openDb();
  const D = fakeD1(db);
  const r2 = khoR2Gia();
  db.prepare(`INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, context, submitter_id, client_request_id, last_activity_at, created_at, updated_at, team_id)
    VALUES ('v', 1, 'QUESTION', 'NEW', 't', '{}', 's', '99999999-9999-4999-8999-999999999999', ?, ?, ?, 'fbk-team-ky-thuat')`).run(AT, AT, AT);
  db.prepare("INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, updated_at, team_id) VALUES ('m', 'v', 's', 'x', 0, ?, ?, 'fbk-team-ky-thuat')").run(AT, AT);
  db.prepare(`INSERT INTO fbk_attachment (id, message_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES ('t', 'm', ?, 'png', ?, ?, ?, 's', ?, 's')`).run(KEY, PNG.length, "d".repeat(64), AT, AT);
  return { db, D, r2 };
}
const dong = (db: any) => ({ ...db.prepare("SELECT stored_at, purged_at, purge_reason, content_hash, r2_deleted_at FROM fbk_attachment WHERE id = 't'").get() });
const luc = () => "2026-10-28T04:00:00.000Z";
const loQuyetXoa = (D: any) => (tepId: string, at: string) => [datChoXoaTepStatement(D, { id: tepId, lyDo: "TAI_LEN_LOI", at, actorId: "s" })];

test("datTepCuaTin: đặt đúng byte dưới khoá đọc lại từ D1, đánh dấu đã lưu; tệp trong bộ nhớ KHÔNG có dòng thì không đặt và tính là hỏng", async () => {
  const { db, D, r2 } = dung();
  const loi = await datTepCuaTin(D, r2, { messageId: "m", tep: [{ id: "t", bytes: PNG, loai: "png" }, { id: "khong-co-dong", bytes: PNG, loai: "png" }], loQuyetXoa: loQuyetXoa(D), luc });
  assert.equal(loi, 1);
  assert.equal(r2.soLan.put, 1);
  assert.ok(r2.co(KEY));
  assert.equal(dong(db).stored_at, luc());
});

test("datTepCuaTin: kho hỏng khi đặt ⇒ lô quyết xoá TRƯỚC rồi xoá kho, đánh dấu đã-xoá-khỏi-kho; trả 1, không ném", async () => {
  const { db, D, r2 } = dung();
  r2.hong.put = true;
  const loi = await datTepCuaTin(D, r2, { messageId: "m", tep: [{ id: "t", bytes: PNG, loai: "png" }], loQuyetXoa: loQuyetXoa(D), luc });
  assert.equal(loi, 1);
  assert.deepEqual(dong(db), { stored_at: null, purged_at: luc(), purge_reason: "TAI_LEN_LOI", content_hash: null, r2_deleted_at: luc() });
});

test("datTepCuaTin: KHÔNG BAO GIỜ ném — đọc lại hỏng, lô quyết xoá hỏng, đánh dấu hỏng đều chỉ ghi log và tính là hỏng", async () => {
  const { db, D, r2 } = dung();
  const hongDoc = { ...D, prepare: () => { throw new Error("d1_hong"); } };
  assert.equal(await datTepCuaTin(hongDoc as any, r2, { messageId: "m", tep: [{ id: "t", bytes: PNG, loai: "png" }], loQuyetXoa: loQuyetXoa(D), luc }), 1);
  assert.equal(r2.soLan.put, 0);
  r2.hong.put = true;
  const loHong = () => [D.prepare("INSERT INTO bang_khong_co VALUES (1)")];
  assert.equal(await datTepCuaTin(D, r2, { messageId: "m", tep: [{ id: "t", bytes: PNG, loai: "png" }], loQuyetXoa: loHong, luc }), 1);
  assert.equal(dong(db).purged_at, null, "lô quyết xoá hỏng ⇒ dòng còn 'tải dở dang' cho lệnh chạy lại");
  r2.hong.put = false;
  db.exec("CREATE TRIGGER thu_hong BEFORE UPDATE OF stored_at ON fbk_attachment BEGIN SELECT RAISE(ABORT, 'thu_hong'); END");
  assert.equal(await datTepCuaTin(D, r2, { messageId: "m", tep: [{ id: "t", bytes: PNG, loai: "png" }], loQuyetXoa: loQuyetXoa(D), luc }), 1);
  assert.equal(await datTepCuaTin(D, r2, { messageId: "m", tep: [], loQuyetXoa: loQuyetXoa(D), luc }), 0, "không tệp ⇒ không đọc gì, trả 0");
});

test("xoaKhoiKho: kho hỏng ⇒ không ném, dòng còn 'chờ xoá' (r2_deleted_at rỗng)", async () => {
  const { db, D, r2 } = dung();
  await D.batch([datChoXoaTepStatement(D, { id: "t", lyDo: "GO_TEP", at: AT, actorId: "s" })]);
  r2.hong.delete = true;
  assert.deepEqual(await xoaKhoiKho(D, r2, [{ id: "t", storage_key: KEY }], luc), { daXoa: 0, loi: 1 });
  assert.equal(dong(db).r2_deleted_at, null);
  r2.hong.delete = false;
  assert.deepEqual(await xoaKhoiKho(D, r2, [{ id: "t", storage_key: KEY }], luc), { daXoa: 1, loi: 0 });
  assert.equal(dong(db).r2_deleted_at, luc());
});
