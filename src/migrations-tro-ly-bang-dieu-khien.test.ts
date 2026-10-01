// Migration *_tl_bang_dieu_khien.sql (ADR-0069 điều 3, 4, 5, 7): bốn bảng chỉ-thêm của module `tro-ly` trên SQLite thật (node:sqlite), cùng cách với
// migrations-tro-ly.test.ts. Tìm tệp theo ĐUÔI tên (đổi số chỉ phải đổi tên tệp — docs/CHANGE-GUIDE.md công thức d).
// Hàng rào (docs/SO-HANG-RAO.md): tập cột của bốn bảng GHIM đúng danh sách — không cột nào chứa khoá OpenAI (điều 2, 7); tl_hoi_dap chặn dãy 8 chữ số liền
// ở câu hỏi (lớp hai sau bộ che của máy chủ).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { PERMISSION_CODES } from "./shared/permissions.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const TEP = files.find((f) => f.endsWith("_tl_bang_dieu_khien.sql"));

function open(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-09-30T01:00:00.000Z";
const cols = (db: DatabaseSync, t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);
const AUDIT = ["created_at", "created_by", "updated_at", "updated_by"];
const luot = (id: string) =>
  `INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, ket_qua, created_at, updated_at) VALUES ('${id}', 's1', '2026-09-30', 'ok', '${NOW}', '${NOW}')`;
const hoiDap = (id: string, luotId: string, cauHoi = "đổi PIN [đã che]") =>
  `INSERT INTO tl_hoi_dap (id, luot_id, staff_id, vai, ngay_vn, cau_hoi, tra_loi, nguon, chi_phi_micro_usd, ket_qua, created_at, created_by, updated_at, updated_by)
   VALUES ('${id}', '${luotId}', 's1', '["SALES"]', '2026-09-30', '${cauHoi}', 'Vào trang Tôi', '["Chung › Đổi PIN"]', 12, 'ok', '${NOW}', 's1', '${NOW}', 's1')`;

test("tệp *_tl_bang_dieu_khien.sql có và mang số 0054 (0051–0053 đã dùng ở nhánh khác — kiểm 30/9)", () => {
  assert.ok(TEP, "thiếu migrations/*_tl_bang_dieu_khien.sql");
  assert.equal(TEP!.slice(0, 4), "0054");
});

test("HÀNG RÀO không cột khoá: ĐÚNG tập cột của bốn bảng mới (ADR-0069 điều 2, 7)", () => {
  const db = open();
  assert.deepEqual(cols(db, "tl_vai"), ["id", "ma_quyen", "bat", "valid_from_at", ...AUDIT]);
  assert.deepEqual(cols(db, "tl_loi_dan"), ["id", "cau_chao", "giong", "loi_dan_them", "cau_hoi_mau", "valid_from_at", ...AUDIT]);
  assert.deepEqual(cols(db, "tl_ngu_canh"), ["id", "doan_id", "tieu_de", "noi_dung", "bat", "valid_from_at", ...AUDIT]);
  assert.deepEqual(cols(db, "tl_hoi_dap"), ["id", "luot_id", "staff_id", "vai", "ngay_vn", "cau_hoi", "tra_loi", "nguon", "chi_phi_micro_usd", "ket_qua", ...AUDIT, "cuoc_tro_chuyen"]);
  const all = ["tl_vai", "tl_loi_dan", "tl_ngu_canh", "tl_hoi_dap", "tl_cai_dat", "tl_luot_hoi", "tl_bo_nao"].flatMap((t) => cols(db, t));
  for (const c of all) assert.ok(!/khoa|key|secret|token_api/i.test(c), `cột nghi chứa khoá: ${c}`);
});

test("gieo: công tắc bật cho ĐÚNG 9 mã quyền của app (= PERMISSION_CODES); lời dặn = câu chào bản 1.44/1.45, không câu hỏi mẫu", () => {
  const db = open();
  const vai = db.prepare("SELECT ma_quyen, bat FROM tl_vai ORDER BY ma_quyen").all() as { ma_quyen: string; bat: number }[];
  assert.deepEqual(vai.map((v) => v.ma_quyen), [...PERMISSION_CODES].sort());
  assert.ok(vai.every((v) => v.bat === 1));
  const ld = db.prepare("SELECT cau_chao, giong, loi_dan_them, cau_hoi_mau FROM tl_loi_dan").all();
  assert.deepEqual(ld.map((r) => ({ ...r })), [{
    cau_chao: "Chào bạn! Hỏi mình cách dùng app, ví dụ: “Đổi mã PIN thế nào?” hoặc “Lập đơn mới ra sao?”.",
    giong: "", loi_dan_them: "", cau_hoi_mau: "[]",
  }]);
  assert.equal((db.prepare("SELECT count(*) AS n FROM tl_ngu_canh").get() as { n: number }).n, 0);
});

test("chỉ thêm: UPDATE và DELETE bị trigger chặn ở cả bốn bảng", () => {
  const db = open();
  db.exec(`INSERT INTO tl_ngu_canh (id, doan_id, tieu_de, noi_dung, bat, valid_from_at, created_at, updated_at) VALUES ('n1', 'd1', 'Giờ làm', 'Tám giờ', 1, '${NOW}', '${NOW}', '${NOW}')`);
  db.exec(luot("l1"));
  db.exec(hoiDap("h1", "l1"));
  for (const t of ["tl_vai", "tl_loi_dan", "tl_ngu_canh", "tl_hoi_dap"]) {
    fails(db, `UPDATE ${t} SET created_by = 'x'`, /tl_append_only/);
    fails(db, `DELETE FROM ${t}`, /tl_append_only/);
  }
});

test("tl_hoi_dap: luot_id phải có trong tl_luot_hoi và duy nhất; ket_qua chỉ ok / loi; vai, nguon là mảng JSON", () => {
  const db = open();
  fails(db, hoiDap("h0", "khong-co"), /FOREIGN KEY/);
  db.exec(luot("l1"));
  db.exec(hoiDap("h1", "l1"));
  fails(db, hoiDap("h2", "l1"), /UNIQUE/);
  db.exec(luot("l2"));
  fails(db, hoiDap("h3", "l2").replace("'ok'", "'het_tran'"), /CHECK/);
  fails(db, hoiDap("h4", "l2").replace(`'["SALES"]'`, "'SALES'"), /CHECK/);
  fails(db, hoiDap("h5", "l2").replace(`'["Chung › Đổi PIN"]'`, "'{}'"), /CHECK/);
});

test("HÀNG RÀO lớp hai: câu hỏi có dãy 8 chữ số liền (SĐT chưa che) bị CSDL từ chối", () => {
  const db = open();
  db.exec(luot("l1"));
  fails(db, hoiDap("h1", "l1", "khách 0905123456 hỏi"), /CHECK/);
  db.exec(hoiDap("h2", "l1", "xe 16 chỗ lúc 07:30 ngày 5/10"));
});

test("tl_loi_dan: câu hỏi mẫu phải là mảng JSON; tl_vai / tl_ngu_canh: bat chỉ 0 / 1", () => {
  const db = open();
  fails(db, `INSERT INTO tl_loi_dan (id, cau_chao, cau_hoi_mau, valid_from_at, created_at, updated_at) VALUES ('x', 'chào', 'không phải json', '${NOW}', '${NOW}', '${NOW}')`, /CHECK|malformed/);
  fails(db, `INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, updated_at) VALUES ('x', 'SALES', 2, '${NOW}', '${NOW}', '${NOW}')`, /CHECK/);
  fails(db, `INSERT INTO tl_ngu_canh (id, doan_id, tieu_de, noi_dung, bat, valid_from_at, created_at, updated_at) VALUES ('x', 'd', 't', 'n', 5, '${NOW}', '${NOW}', '${NOW}')`, /CHECK/);
});
