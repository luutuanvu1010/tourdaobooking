// Kiểm migration `company_email` (0013): chỉ điền email công ty vào `company_profile`, không đổi cấu trúc, không ghi đè email đã có.
// Dựng schema bằng node:sqlite từ migrations/*.sql (cùng cách `src/migrations-n1.test.ts`); e2e (tests/e2e/company.mjs) xác nhận lại trên D1 local.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const FILE = files.find((f) => f.endsWith("_company_email.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
/** Schema dựng đến ngay TRƯỚC migration email (mọi tệp có số nhỏ hơn). */
const before = (): string[] => files.filter((f) => f < FILE!);

function open(list: string[]): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
}
const profile = (db: DatabaseSync) => ({ ...(db.prepare("SELECT * FROM company_profile").all() as Record<string, unknown>[])[0]! });
const structure = (db: DatabaseSync) => db.prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").all().map((r) => ({ ...r }));

test("có migration company_email, đặt SAU 0002 (bảng company_profile)", () => {
  assert.ok(FILE, "thiếu migrations/*_company_email.sql");
  assert.ok(FILE! > "0002_company_profile.sql");
});

test("company_email: trước migration, hồ sơ công ty gieo ở 0002 có email NULL; sau migration là Tourdaotravel@gmail.com", () => {
  const db = open(before());
  assert.equal(profile(db).email, null, "0002 không gieo email");
  db.exec(sqlOf(FILE!));
  assert.equal(profile(db).email, "Tourdaotravel@gmail.com");
  assert.equal((db.prepare("SELECT count(*) AS n FROM company_profile").get() as { n: number }).n, 1, "vẫn đúng một dòng singleton");
});

test("company_email: chỉ đổi email và updated_at — tên, MST, địa chỉ, hotline, Zalo giữ nguyên", () => {
  const db = open(before());
  db.exec("UPDATE company_profile SET updated_at = '2026-01-01T00:00:00.000Z'");
  const was = profile(db);
  db.exec(sqlOf(FILE!));
  const now = profile(db);
  for (const k of ["id", "company_name", "tax_code", "address", "hotline", "zalo_number", "logo_url", "updated_by"]) assert.equal(now[k], was[k], k);
  assert.equal(now.company_name, "CÔNG TY TNHH TOUR ĐẢO");
  assert.equal(now.tax_code, "4201969169");
  assert.notEqual(now.updated_at, was.updated_at, "updated_at được cập nhật khi điền email");
  assert.match(String(now.updated_at), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test("company_email: KHÔNG ghi đè email đã có (chủ dự án có thể đã sửa tay), và chạy lại vẫn an toàn", () => {
  const db = open(before());
  db.exec("UPDATE company_profile SET email = 'khac@tourdao.vn', updated_at = '2026-01-01T00:00:00.000Z'");
  db.exec(sqlOf(FILE!));
  assert.equal(profile(db).email, "khac@tourdao.vn");
  assert.equal(profile(db).updated_at, "2026-01-01T00:00:00.000Z", "không đổi gì thì không đụng updated_at");
  const db2 = open(before());
  db2.exec(sqlOf(FILE!));
  const first = profile(db2);
  db2.exec(sqlOf(FILE!));
  assert.deepEqual(profile(db2), first, "chạy lần hai không đổi gì");
});

test("company_email: chỉ dữ liệu — không thêm/xoá/sửa bảng, chỉ mục, view, trigger nào", () => {
  const db = open(before());
  const was = structure(db);
  db.exec(sqlOf(FILE!));
  assert.deepEqual(structure(db), was);
  const code = sqlOf(FILE!).replace(/--.*$/gm, "");
  assert.doesNotMatch(code, /\b(?:ALTER|CREATE|DROP)\b/i, "migration dữ liệu: không đổi cấu trúc");
  assert.match(code, /\bUPDATE\s+company_profile\b/i);
});
