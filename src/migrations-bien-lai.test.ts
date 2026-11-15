// Migration 0158 (ADR-0196 Đ3): bảng bil_receipt_proof — luật CSDL của ảnh biên lai chuyển khoản (chép khuôn fbk_attachment của 0124, thay TIN bằng KHOẢN THU).
// Chạy trên SQLite dựng từ MỌI migration, chèn thẳng bằng SQL để canh lớp CSDL độc lập với route (Hiến chương 5.1, hai lớp).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { TEP_MOI_GIO } from "./shared/tep-dinh-kem.ts";

const DIR = new URL("../migrations/", import.meta.url);
const T = "2026-11-11T01:00:00.000Z";
const HASH = "a".repeat(64);
const DT = "nguoi-doi-tac";
const KHAC = "nguoi-khac";
let n = 0;
const khoa = () => `bln/${(++n).toString(16).padStart(32, "0")}`;

function moi(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const lanThu = (db: DatabaseSync, id: string, by = DT, kind = "CUSTOMER_PAYMENT") =>
  db.prepare(`INSERT INTO bil_payment_receipt (id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code,
      occurred_date, reverses_id, note, created_at, created_by, updated_at, updated_by) VALUES (?, 'o1', ?, 1000, 'ct', 'COMPANY', 'BANK_TRANSFER', 'ct', 'PREPAID', '2026-11-11', NULL, NULL, ?, ?, ?, ?)`)
    .run(id, kind, T, by, T, by);
const chen = (db: DatabaseSync, o: Partial<{ id: string; receipt: string; key: string; kind: string; size: number; hash: string | null; by: string; at: string }> = {}) =>
  db.prepare(
    `INSERT INTO bil_receipt_proof (id, receipt_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8)`,
  ).run(o.id ?? crypto.randomUUID(), o.receipt ?? "r1", o.key ?? khoa(), o.kind ?? "png", o.size ?? 100, o.hash === undefined ? HASH : o.hash, o.at ?? T, o.by ?? DT);
const dem = (db: DatabaseSync) => Number((db.prepare("SELECT count(*) AS n FROM bil_receipt_proof").get() as { n: number }).n);

test("chèn ảnh hợp lệ của người ghi khoản thu: được; khoá kho phải đúng khuôn bln/<32 hex>; loại ngoài bốn loại, cỡ 0 hay quá 10 MB, thiếu băm bị CHECK chặn", () => {
  const db = moi();
  lanThu(db, "r1");
  chen(db, { id: "p1" });
  assert.equal(dem(db), 1);
  for (let i = 2; i < 9; i++) lanThu(db, `r${i}`);
  for (const key of ["fbk/" + "0".repeat(32), "bln/" + "G".repeat(32), "bln/abc"]) assert.throws(() => chen(db, { receipt: "r2", key }), /CHECK/, key);
  assert.throws(() => chen(db, { receipt: "r2", kind: "svg" }), /CHECK/);
  assert.throws(() => chen(db, { receipt: "r2", size: 0 }), /CHECK/);
  assert.throws(() => chen(db, { receipt: "r2", size: 10485761 }), /CHECK/);
  assert.throws(() => chen(db, { receipt: "r2", hash: null }), /CHECK/, "chưa quyết xoá thì phải có băm");
  assert.equal(dem(db), 1);
});

test("UNIQUE(receipt_id): dòng ảnh thứ hai cho cùng khoản bị chặn — kể cả sau khi ảnh đầu đã bị gỡ; INSERT OR REPLACE trên cùng khoản cũng bị chặn", () => {
  const db = moi();
  lanThu(db, "r1");
  chen(db, { id: "p1" });
  assert.throws(() => chen(db), /proof_no_replace|UNIQUE/);
  db.exec(`UPDATE bil_receipt_proof SET purged_at = '${T}', purge_reason = 'GO_TEP', content_hash = NULL WHERE id = 'p1'`);
  assert.throws(() => chen(db), /proof_no_replace|UNIQUE/, "gỡ rồi cũng không có ảnh thay thế (Đ11)");
  assert.throws(() => db.prepare(`INSERT OR REPLACE INTO bil_receipt_proof (id, receipt_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
     VALUES ('p9', 'r1', '${khoa()}', 'png', 5, '${HASH}', '${T}', '${DT}', '${T}', '${DT}')`).run(), /proof_no_replace/);
  assert.equal(dem(db), 1);
});

test("người tải phải là người ghi khoản thu; khoản không phải CUSTOMER_PAYMENT bị chặn; khoản không có thật bị chặn", () => {
  const db = moi();
  lanThu(db, "r1");
  db.exec("DROP TRIGGER bil_refund_within_held"); // dựng khoản trả lại khách không cần sổ giữ hộ — bài chỉ canh trigger của bảng ảnh
  lanThu(db, "hoan", DT, "CUSTOMER_REFUND");
  assert.throws(() => chen(db, { by: KHAC }), /proof_author_mismatch/);
  assert.throws(() => chen(db, { receipt: "hoan" }), /proof_author_mismatch/);
  assert.throws(() => chen(db, { receipt: "khong-co" }), /proof_author_mismatch/);
  assert.equal(dem(db), 0);
});

test(`trần ${TEP_MOI_GIO} ảnh / giờ / tài khoản (đếm riêng trên bảng này): ảnh thứ ${TEP_MOI_GIO + 1} trong một giờ bị chặn; ảnh cũ hơn một giờ không tính`, () => {
  const db = moi();
  const cu = "2026-11-11T00:00:00.000Z"; // đúng 1 giờ trước T — không tính
  lanThu(db, "cu");
  chen(db, { receipt: "cu", at: cu });
  for (let i = 0; i < TEP_MOI_GIO; i++) {
    lanThu(db, `g${i}`);
    chen(db, { receipt: `g${i}` });
  }
  lanThu(db, "qua");
  assert.throws(() => chen(db, { receipt: "qua" }), /proof_rate_limited/);
  lanThu(db, "khac", KHAC);
  chen(db, { receipt: "khac", by: KHAC }); // người khác không bị trần của người này
  assert.equal(dem(db), TEP_MOI_GIO + 2);
});

test("chỉ-thêm: không xoá dòng; không đổi khoản thu / khoá / loại / cỡ / người tải; ba mốc một chiều; băm chỉ về rỗng", () => {
  const db = moi();
  lanThu(db, "r1");
  lanThu(db, "r2");
  chen(db, { id: "p1", key: "bln/" + "1".repeat(32) });
  assert.throws(() => db.exec("DELETE FROM bil_receipt_proof WHERE id = 'p1'"), /proof_no_delete/);
  for (const set of ["receipt_id = 'r2'", "storage_key = 'bln/" + "2".repeat(32) + "'", "content_kind = 'pdf'", "byte_size = 5", `created_by = '${KHAC}'`, `created_at = '2020-01-01T00:00:00.000Z'`]) {
    assert.throws(() => db.exec(`UPDATE bil_receipt_proof SET ${set} WHERE id = 'p1'`), /proof_identity/, set);
  }
  assert.throws(() => db.exec(`UPDATE bil_receipt_proof SET content_hash = '${"b".repeat(64)}' WHERE id = 'p1'`), /proof_hash_one_way/);
  assert.throws(() => db.exec(`UPDATE bil_receipt_proof SET r2_deleted_at = '${T}' WHERE id = 'p1'`), /proof_purge_one_way/, "đã-xoá-khỏi-kho chỉ sau quyết xoá");
  db.exec(`UPDATE bil_receipt_proof SET stored_at = '${T}' WHERE id = 'p1'`);
  assert.throws(() => db.exec(`UPDATE bil_receipt_proof SET stored_at = '2026-11-12T00:00:00.000Z' WHERE id = 'p1'`), /proof_store_one_way/);
  db.exec(`UPDATE bil_receipt_proof SET purged_at = '${T}', purge_reason = 'GO_TEP', content_hash = NULL WHERE id = 'p1'`);
  assert.throws(() => db.exec(`UPDATE bil_receipt_proof SET purge_reason = 'TAI_LEN_DO_DANG' WHERE id = 'p1'`), /proof_purge_one_way/);
  db.exec(`UPDATE bil_receipt_proof SET r2_deleted_at = '${T}' WHERE id = 'p1'`);
  assert.throws(() => db.exec(`UPDATE bil_receipt_proof SET r2_deleted_at = NULL WHERE id = 'p1'`), /proof_purge_one_way/);
  // Tệp chưa lưu đã quyết xoá thì không đặt mốc đã lưu được nữa.
  chen(db, { id: "p2", receipt: "r2" });
  db.exec(`UPDATE bil_receipt_proof SET purged_at = '${T}', purge_reason = 'TAI_LEN_DO_DANG', content_hash = NULL WHERE id = 'p2'`);
  assert.throws(() => db.exec(`UPDATE bil_receipt_proof SET stored_at = '${T}' WHERE id = 'p2'`), /proof_store_one_way/);
});

test("bảng không có cột tên tệp gốc; có chỉ mục (created_by, created_at) cho trần và chỉ mục hàng chờ", () => {
  const db = moi();
  const cot = (db.prepare("PRAGMA table_info(bil_receipt_proof)").all() as { name: string }[]).map((c) => c.name).sort();
  assert.deepEqual(cot, ["byte_size", "content_hash", "content_kind", "created_at", "created_by", "id", "purge_reason", "purged_at", "r2_deleted_at", "receipt_id", "storage_key", "stored_at", "updated_at", "updated_by"]);
  const ix = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'bil_receipt_proof' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]).map((r) => r.name).sort();
  assert.deepEqual(ix, ["bil_receipt_proof_cho_ix", "bil_receipt_proof_nguoi_ix"]);
});
