// Migration 0190 (ADR-0232): bảng abg_photo + abg_erasure_request — luật CSDL của «Ảnh bàn giao» (khuôn bil_receipt_proof của 0158).
// Chạy trên SQLite dựng từ MỌI migration, chèn thẳng bằng SQL để canh lớp CSDL độc lập với route (Hiến chương 5.1, hai lớp).
// Hạn giữ (ADR-0232 Đ7): trigger so với GIỜ HỆ THỐNG của SQLite — bài chèn thẳng dòng có created_at / retain_until trong quá khứ hoặc tương lai, không giả lập đồng hồ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { TEP_MOI_GIO } from "./shared/tep-dinh-kem.ts";

const DIR = new URL("../migrations/", import.meta.url);
const HASH = "a".repeat(64);
const NV = "nguoi-tai";
const XA = "2020-01-01T00:00:00.000Z"; // quá khứ xa
const GAN = new Date(Date.now() - 60_000).toISOString(); // một phút trước
const TUONG_LAI = "2099-01-01T00:00:00.000Z";
let n = 0;
const khoa = () => `abg/${(++n).toString(16).padStart(32, "0")}`;

function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  for (const id of ["o1", "o2", "o-nhap", "o-huy"])
    db.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES (?, ?, 'lap', 'draft', 'K', '0900000000', ?, ?)`)
      .run(id, `TD-${id}`, XA, XA);
  db.exec(`INSERT INTO order_service (id, order_id, name, unit, pax_adult, depart_date) VALUES ('s1', 'o1', 'Tour', 'perPax', 1, '2026-12-01'), ('s2', 'o2', 'Tour', 'perPax', 1, '2026-12-01')`);
  db.exec(`INSERT INTO ord_transfer_leg (id, order_id, order_service_id, direction, pickup_date, pickup_place, created_at, updated_at) VALUES ('l1', 'o1', 's1', 'OUT', '2026-12-01', 'KS', '${XA}', '${XA}'), ('l2', 'o2', 's2', 'OUT', '2026-12-01', 'KS', '${XA}', '${XA}')`);
  // Dựng trạng thái đơn trong CSDL thử: bỏ các trigger chặn chuyển trạng thái của orders — không phải điều đang kiểm.
  for (const t of db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'orders'").all() as { name: string }[]) db.exec(`DROP TRIGGER "${t.name}"`);
  db.exec(`UPDATE orders SET status = 'confirmed' WHERE id IN ('o1', 'o2')`);
  db.exec(`UPDATE orders SET status = 'cancelled' WHERE id = 'o-huy'`);
  return db;
}
type Chen = Partial<{ id: string; order: string; svc: string | null; leg: string | null; kind: string; note: string | null; tk: string; vk: string; ts: number; vs: number; hash: string | null; at: string; until: string; by: string }>;
const chen = (db: DatabaseSync, o: Chen = {}) =>
  db.prepare(
    `INSERT INTO abg_photo (id, order_id, order_service_id, transfer_leg_id, task_kind, note, thumb_key, view_key, thumb_size, view_size, content_hash, retain_until,
       created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?13, ?14)`,
  ).run(o.id ?? crypto.randomUUID(), o.order ?? "o1", o.svc === undefined ? null : o.svc, o.leg === undefined ? null : o.leg, o.kind ?? "GIAO_KHACH", o.note === undefined ? null : o.note,
    o.tk ?? khoa(), o.vk ?? khoa(), o.ts ?? 1000, o.vs ?? 5000, o.hash === undefined ? HASH : o.hash, o.until ?? TUONG_LAI, o.at ?? GAN, o.by ?? NV);
const dem = (db: DatabaseSync) => Number((db.prepare("SELECT count(*) AS n FROM abg_photo").get() as { n: number }).n);
const quyetGo = (db: DatabaseSync, id: string, lyDo: string, yc: string | null = null) =>
  db.prepare(`UPDATE abg_photo SET purged_at = ?2, purge_reason = ?3, erasure_request_id = COALESCE(erasure_request_id, ?4), content_hash = NULL, note = NULL, updated_at = ?2 WHERE id = ?1`)
    .run(id, new Date().toISOString(), lyDo, yc);

test("chèn ảnh hợp lệ được; khoá kho đúng khuôn abg/<32 hex>; cỡ ảnh nhỏ ≤ 100 KB, ảnh xem ≤ 600 KB; loại việc trong ba loại; ghi chú ≤ 200 ký tự", () => {
  const db = moi();
  chen(db, { id: "p1", leg: "l1" });
  chen(db, { svc: "s1", note: "Giao vé" });
  assert.equal(dem(db), 2);
  for (const tk of ["bln/" + "0".repeat(32), "abg/" + "G".repeat(32), "abg/abc"]) assert.throws(() => chen(db, { tk }), /CHECK/, tk);
  assert.throws(() => chen(db, { ts: 102401 }), /CHECK/);
  assert.throws(() => chen(db, { vs: 614401 }), /CHECK/);
  assert.throws(() => chen(db, { ts: 0 }), /CHECK/);
  assert.throws(() => chen(db, { kind: "KHAC_LA" }), /CHECK/);
  assert.throws(() => chen(db, { note: "x".repeat(201) }), /CHECK/);
  assert.throws(() => chen(db, { hash: null }), /CHECK/, "chưa quyết gỡ thì phải có băm");
  assert.throws(() => chen(db, { until: "2000-01-01T00:00:00.000Z" }), /CHECK/, "hạn giữ phải sau giờ tải");
  assert.equal(dem(db), 2);
});

test("ảnh chỉ gắn đơn đã xác nhận còn hiệu lực; dịch vụ / lượt đón phải thuộc đúng đơn; không gắn cả hai", () => {
  const db = moi();
  assert.throws(() => chen(db, { order: "o-nhap" }), /photo_order_not_confirmed/);
  assert.throws(() => chen(db, { order: "o-huy" }), /photo_order_not_confirmed/);
  assert.throws(() => chen(db, { order: "khong-co" }), /photo_order_not_confirmed/);
  assert.throws(() => chen(db, { svc: "s2" }), /photo_target_mismatch/);
  assert.throws(() => chen(db, { leg: "l2" }), /photo_target_mismatch/);
  assert.throws(() => chen(db, { svc: "s1", leg: "l1" }), /CHECK/);
  assert.equal(dem(db), 0);
});

test("chỉ thêm: không xoá dòng; không đổi đơn, khoá kho, người tải, giờ tải, hạn giữ; INSERT OR REPLACE bị chặn", () => {
  const db = moi();
  chen(db, { id: "p1" });
  assert.throws(() => db.exec("DELETE FROM abg_photo WHERE id = 'p1'"), /photo_no_delete/);
  for (const set of ["order_id = 'o2'", "thumb_key = 'abg/" + "f".repeat(32) + "'", "created_by = 'x'", "created_at = '2026-01-01T00:00:00.000Z'", "retain_until = '2100-01-01T00:00:00.000Z'", "task_kind = 'KHAC'"])
    assert.throws(() => db.exec(`UPDATE abg_photo SET ${set} WHERE id = 'p1'`), /photo_identity/, set);
  assert.throws(() => db.exec(`UPDATE abg_photo SET note = 'đổi' WHERE id = 'p1'`), /photo_identity/, "ghi chú chỉ được xoá về rỗng lúc quyết gỡ");
  const row = db.prepare("SELECT thumb_key, view_key FROM abg_photo WHERE id = 'p1'").get() as { thumb_key: string; view_key: string };
  assert.throws(() => db.prepare(`INSERT OR REPLACE INTO abg_photo (id, order_id, task_kind, thumb_key, view_key, thumb_size, view_size, content_hash, retain_until, created_at, created_by, updated_at, updated_by)
     VALUES ('p1', 'o1', 'KHAC', ?, ?, 1, 1, '${HASH}', '${TUONG_LAI}', '${GAN}', '${NV}', '${GAN}', '${NV}')`).run(row.thumb_key, row.view_key), /photo_no_replace/);
  assert.equal(dem(db), 1);
});

test("HẠN GIỮ (Đ7): trước retain_until không quyết gỡ được với HET_HAN; được với GIAY_TO_CHUP_NHAM; TAI_LEN_LOI chỉ cho ảnh chưa lưu xong", () => {
  const db = moi();
  chen(db, { id: "p1" });
  assert.throws(() => quyetGo(db, "p1", "HET_HAN"), /photo_retention_hold/);
  db.exec(`UPDATE abg_photo SET stored_at = '${GAN}' WHERE id = 'p1'`);
  assert.throws(() => quyetGo(db, "p1", "TAI_LEN_LOI"), /photo_retention_hold/, "ảnh đã lưu xong không gỡ bằng mã lỗi tải lên");
  assert.throws(() => quyetGo(db, "p1", "LY_DO_LA"), /photo_retention_hold/, "mã lý do ngoài danh sách cũng không qua");
  quyetGo(db, "p1", "GIAY_TO_CHUP_NHAM");
  chen(db, { id: "p2" });
  quyetGo(db, "p2", "TAI_LEN_LOI");
  // Quá hạn: HET_HAN được (ảnh tải năm 2020, hạn 2021).
  chen(db, { id: "p3", at: XA, until: "2021-01-01T00:00:00.000Z" });
  db.exec(`UPDATE abg_photo SET stored_at = '${XA}' WHERE id = 'p3'`);
  quyetGo(db, "p3", "HET_HAN");
  const r = db.prepare("SELECT count(*) AS n FROM abg_photo WHERE purged_at IS NOT NULL").get() as { n: number };
  assert.equal(Number(r.n), 3);
});

test("HẠN GIỮ, biến thể 7B: XOA_THEO_YEU_CAU trước hạn chỉ khi ảnh có mã yêu cầu xoá có thật của bảng abg_erasure_request; thiếu mã bị chặn", () => {
  const db = moi();
  chen(db, { id: "p1" });
  db.exec(`UPDATE abg_photo SET stored_at = '${GAN}' WHERE id = 'p1'`);
  assert.throws(() => quyetGo(db, "p1", "XOA_THEO_YEU_CAU"), /photo_retention_hold/);
  assert.throws(() => quyetGo(db, "p1", "XOA_THEO_YEU_CAU", "yc-khong-co"), /photo_retention_hold|photo_erasure_request_missing/);
  db.exec(`INSERT INTO abg_erasure_request (id, source, phieu_id, channel_note, created_at, created_by, updated_at, updated_by) VALUES ('yc1', 'KHACH', NULL, 'Khách gọi hotline', '${GAN}', 'tq', '${GAN}', 'tq')`);
  quyetGo(db, "p1", "XOA_THEO_YEU_CAU", "yc1");
  const r = db.prepare("SELECT note, content_hash, erasure_request_id FROM abg_photo WHERE id = 'p1'").get() as Record<string, unknown>;
  assert.deepEqual({ ...r }, { note: null, content_hash: null, erasure_request_id: "yc1" });
});

test("yêu cầu xoá: nguồn PHIEU phải có mã phiếu, nguồn KHACH phải có ghi chú kênh; chỉ thêm, không xoá", () => {
  const db = moi();
  const ins = (id: string, src: string, phieu: string | null, note: string | null) =>
    db.prepare(`INSERT INTO abg_erasure_request (id, source, phieu_id, channel_note, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, '${GAN}', 'tq', '${GAN}', 'tq')`).run(id, src, phieu, note);
  ins("a", "PHIEU", "phieu-1", null);
  ins("b", "KHACH", null, "Email ngày 22/11");
  assert.throws(() => ins("c", "PHIEU", null, null), /CHECK/);
  assert.throws(() => ins("d", "KHACH", null, null), /CHECK/);
  assert.throws(() => ins("e", "KHAC", null, "x"), /CHECK/);
  assert.throws(() => db.exec("DELETE FROM abg_erasure_request WHERE id = 'a'"), /erasure_request_no_delete/);
  assert.throws(() => db.exec("UPDATE abg_erasure_request SET phieu_id = 'phieu-2' WHERE id = 'a'"), /erasure_request_identity/);
});

test("đánh dấu ảnh vào yêu cầu (erasure_request_id) đi một chiều; ẩn đi một chiều, phải đủ người, giờ, lý do", () => {
  const db = moi();
  chen(db, { id: "p1" });
  db.exec(`INSERT INTO abg_erasure_request (id, source, phieu_id, channel_note, created_at, created_by, updated_at, updated_by) VALUES ('yc1', 'PHIEU', 'ph1', NULL, '${GAN}', 'tq', '${GAN}', 'tq'), ('yc2', 'PHIEU', 'ph2', NULL, '${GAN}', 'tq', '${GAN}', 'tq')`);
  db.exec("UPDATE abg_photo SET erasure_request_id = 'yc1' WHERE id = 'p1'");
  assert.throws(() => db.exec("UPDATE abg_photo SET erasure_request_id = 'yc2' WHERE id = 'p1'"), /photo_mark_one_way/);
  assert.throws(() => db.exec("UPDATE abg_photo SET erasure_request_id = NULL WHERE id = 'p1'"), /photo_mark_one_way/);
  assert.throws(() => db.exec(`UPDATE abg_photo SET hidden_at = '${GAN}' WHERE id = 'p1'`), /CHECK/);
  db.exec(`UPDATE abg_photo SET hidden_at = '${GAN}', hidden_by = 'tq', hidden_reason = 'Chụp nhầm đơn' WHERE id = 'p1'`);
  assert.throws(() => db.exec("UPDATE abg_photo SET hidden_at = NULL, hidden_by = NULL, hidden_reason = NULL WHERE id = 'p1'"), /photo_hide_one_way/);
  assert.throws(() => db.exec("UPDATE abg_photo SET hidden_reason = 'khác' WHERE id = 'p1'"), /photo_hide_one_way/);
});

test("mốc đã lưu / quyết gỡ / đã xoá kho đi một chiều như khuôn 0158", () => {
  const db = moi();
  chen(db, { id: "p1" });
  db.exec(`UPDATE abg_photo SET stored_at = '${GAN}' WHERE id = 'p1'`);
  assert.throws(() => db.exec(`UPDATE abg_photo SET stored_at = '${XA}' WHERE id = 'p1'`), /photo_store_one_way/);
  assert.throws(() => db.exec(`UPDATE abg_photo SET r2_deleted_at = '${GAN}' WHERE id = 'p1'`), /photo_purge_one_way/);
  quyetGo(db, "p1", "GIAY_TO_CHUP_NHAM");
  assert.throws(() => db.exec(`UPDATE abg_photo SET purge_reason = 'HET_HAN' WHERE id = 'p1'`), /photo_purge_one_way/);
  assert.throws(() => db.exec(`UPDATE abg_photo SET content_hash = '${HASH}' WHERE id = 'p1'`), /photo_hash_one_way|CHECK/);
  db.exec(`UPDATE abg_photo SET r2_deleted_at = '${GAN}' WHERE id = 'p1'`);
  assert.throws(() => db.exec(`UPDATE abg_photo SET r2_deleted_at = NULL WHERE id = 'p1'`), /photo_purge_one_way/);
});

test(`trần: ${TEP_MOI_GIO} ảnh / giờ / tài khoản; tối đa 30 ảnh còn hiện mỗi đơn`, () => {
  const db = moi();
  for (let i = 0; i < TEP_MOI_GIO; i++) chen(db, { by: "a" });
  assert.throws(() => chen(db, { by: "a" }), /photo_rate_limited/);
  chen(db, { by: "b", at: XA, until: "2021-01-01T00:00:00.000Z" }); // giờ tải cũ — không vào cửa sổ của b
  const db2 = moi();
  for (let i = 0; i < 30; i++) chen(db2, { by: `u${i}` });
  assert.throws(() => chen(db2, { by: "u99" }), /photo_order_full/);
  db2.exec(`UPDATE abg_photo SET hidden_at = '${GAN}', hidden_by = 'tq', hidden_reason = 'nhầm' WHERE rowid = 1`);
  chen(db2, { by: "u99" }); // ảnh đã ẩn không tính
});

test("cột photo_retention_years của chính sách riêng tư: trống hoặc 1–20 năm", () => {
  const db = moi();
  const cot = (db.prepare("PRAGMA table_info(pty_privacy_policy)").all() as { name: string }[]).map((c) => c.name);
  assert.ok(cot.includes("photo_retention_years"));
  const ins = (v: number | null, ver: number) =>
    db.prepare(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, photo_retention_years)
      VALUES (?, ?, 'Mục đích', 'Nội dung', '${GAN}', '${GAN}', 'tq', '${GAN}', 'tq', ?)`).run(`pp${ver}`, ver, v);
  ins(5, 1);
  ins(null, 2);
  assert.throws(() => ins(0, 3), /CHECK/);
  assert.throws(() => ins(21, 3), /CHECK/);
});

test("lý do xoá bằng chữ (purge_note, N3): chỉ ghi trong CÙNG câu quyết gỡ; không ghi trước, không đổi sau", () => {
  const db = moi();
  chen(db, { id: "p1" });
  assert.throws(() => db.exec("UPDATE abg_photo SET purge_note = 'Lọt căn cước' WHERE id = 'p1'"), /photo_purge_note_once|CHECK/);
  db.prepare(`UPDATE abg_photo SET purged_at = ?, purge_reason = 'GIAY_TO_CHUP_NHAM', purge_note = 'Lọt căn cước', content_hash = NULL, note = NULL WHERE id = 'p1'`).run(new Date().toISOString());
  assert.throws(() => db.exec("UPDATE abg_photo SET purge_note = 'khác đi' WHERE id = 'p1'"), /photo_purge_note_once|photo_purge_one_way/);
});
