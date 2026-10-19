// Kiểm migration *_ten_luat_chuyen_khach.sql (rà soát ngôn ngữ lượt 2, chủ chọn 18/10): đổi CHỮ hai nhãn điều kiện chuyển khách — hai câu UPDATE label;
// mã, tầng, thứ tự, trạng thái, ngày tạo và mọi dòng khác giữ nguyên; không trigger. Nhãn phải khớp NHAN_LUAT_CHUYEN (src/shared/chuyen-khach.test.ts giữ
// hai nguồn khớp). Tệp tìm theo ĐUÔI tên (số có thể phải đổi khi nhiều nhánh cùng xếp hàng).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { NHAN_LUAT_CHUYEN } from "./shared/chuyen-khach.ts";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_ten_luat_chuyen_khach.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string): Row[] => (db.prepare(sql).all() as Row[]).map((r) => ({ ...r }));
const triggers = (db: DatabaseSync): string[] => (db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name").all() as { name: string }[]).map((r) => r.name);
const MOI: Record<string, string> = {
  MOC_TOI_THIEU: "Còn đủ hạn chốt trước giờ xe nhận chạy",
  CHANG_KHACH_HIEU_LUC: "Lượt đưa đón của khách còn hiệu lực",
};

test("(a) đúng một tệp *_ten_luat_chuyen_khach.sql; chỉ hai câu UPDATE vc_transfer_rule SET label; không trigger", () => {
  assert.equal(MATCHES.length, 1, `phải có đúng một tệp *_ten_luat_chuyen_khach.sql, thấy: ${JSON.stringify(MATCHES)}`);
  assert.doesNotMatch(FILE, /staff_party_required/);
  const cau = sqlOf(FILE).replace(/--.*$/gm, "").split(";").map((x) => x.trim()).filter(Boolean);
  assert.equal(cau.length, 2, JSON.stringify(cau));
  for (const c of cau) assert.match(c, /^UPDATE vc_transfer_rule SET label = '[^']+' WHERE code = '(MOC_TOI_THIEU|CHANG_KHACH_HIEU_LUC)'$/s);
  const db = open(files.filter((f) => f < FILE));
  const truoc = triggers(db);
  db.exec(sqlOf(FILE));
  assert.deepEqual(triggers(db), truoc);
});

test("(b) sau migration: hai nhãn mới = NHAN_LUAT_CHUYEN; mọi dòng khác và mọi cột khác giữ nguyên", () => {
  const truoc = rows(open(files.filter((f) => f < FILE)), "SELECT * FROM vc_transfer_rule ORDER BY code");
  const sau = rows(open(files), "SELECT * FROM vc_transfer_rule ORDER BY code");
  for (const [ma, nhan] of Object.entries(MOI)) {
    assert.equal(sau.find((r) => r.code === ma)!.label, nhan, ma);
    assert.equal(NHAN_LUAT_CHUYEN[ma as keyof typeof NHAN_LUAT_CHUYEN], nhan, `hằng trong mã khớp nhãn mới: ${ma}`);
  }
  assert.equal(truoc.find((r) => r.code === "MOC_TOI_THIEU")!.label, "Còn đủ mốc tối thiểu trước giờ xe nhận chạy", "trước migration là nhãn cũ");
  const coTruoc = new Set(truoc.map((r) => r.code));
  const cotCu = new Set(Object.keys(truoc[0]!));
  const chiCotCu = (r: Row) => Object.fromEntries(Object.entries(r).filter(([k]) => cotCu.has(k)));
  const traLaiNhanCu = (r: Row) => (r.code in MOI ? { ...r, label: truoc.find((t) => t.code === r.code)!.label } : r);
  assert.deepEqual(sau.filter((r) => coTruoc.has(r.code)).map((r) => chiCotCu(traLaiNhanCu(r))), truoc, "chỉ đổi đúng cột label của đúng hai dòng");
});

test("(c) dòng kiểm cũ (vc_transfer_check) không bị đụng — nhãn đọc lúc hiển thị; trigger vẫn cấm đổi mã / tầng", () => {
  const db = open(files);
  assert.throws(() => db.exec("UPDATE vc_transfer_rule SET tier = 'LOI' WHERE code = 'MOC_TOI_THIEU'"), /ck_rule_identity/);
  assert.doesNotMatch(sqlOf(FILE).replace(/--.*$/gm, ""), /vc_transfer_check/);
});
