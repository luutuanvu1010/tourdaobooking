// Bài so khớp chữ tĩnh ở chân trang đăng nhập (public/login.html) với dữ liệu gieo của hồ sơ công ty chủ (ADR-0024 6.2): tên + MST do web/login.ts thay từ
// GET /api/auth/config, chữ tĩnh chỉ còn là DỰ PHÒNG (chưa tải xong, lỗi mạng) nên phải khớp dữ liệu. So chuỗi đã chuẩn hoá — "không so từng ký tự" (6.2).
// So với dữ liệu gieo (migrations/*.sql), KHÔNG so với production.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { OWNER_COMPANY_ROLE } from "./shared/cong-ty-chu.ts";

const html = readFileSync(new URL("../public/login.html", import.meta.url), "utf8");
/** Chuẩn hoá để so khớp (ADR-0024 6.2: "không so từng ký tự"): NFC, chữ thường tiếng Việt, bỏ dấu câu, gộp khoảng trắng. */
const chuan = (s: string) => s.normalize("NFC").toLocaleLowerCase("vi").replace(/[.,;:·]/g, " ").replace(/\s+/g, " ").trim();
const chuTrong = (re: RegExp, ten: string): string => {
  const m = re.exec(html);
  assert.ok(m, `public/login.html thiếu ${ten}`);
  return m[1]!.trim();
};

function hoSoGieo(): { display_name: string; tax_code: string; address: string } {
  const dir = new URL("../migrations/", import.meta.url);
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) db.exec(readFileSync(new URL(f, dir), "utf8"));
  const r = db.prepare(`SELECT p.display_name, o.tax_code, o.address FROM pty_party_role x JOIN pty_party p ON p.id = x.party_id JOIN pty_organization o ON o.party_id = p.id
                        WHERE x.role_type_code = ? AND x.valid_to_date IS NULL`).get(OWNER_COMPANY_ROLE) as { display_name: string; tax_code: string; address: string } | undefined;
  assert.ok(r, "dữ liệu gieo phải có hồ sơ công ty chủ");
  return r;
}

test("chân trang đăng nhập: có chỗ #company-name và #company-tax để web/login.ts thay chữ từ cấu hình (ADR-0024 6.2)", () => {
  chuTrong(/<span id="company-name"[^>]*>([^<]*)<\/span>/, "#company-name");
  chuTrong(/<span id="company-tax"[^>]*>([^<]*)<\/span>/, "#company-tax");
});

test("chữ tĩnh dự phòng (tên, MST, địa chỉ) khớp dữ liệu gieo của hồ sơ công ty chủ (chuỗi đã chuẩn hoá)", () => {
  const ho = hoSoGieo();
  assert.equal(chuan(chuTrong(/<span id="company-name"[^>]*>([^<]*)<\/span>/, "#company-name")), chuan(ho.display_name), "tên");
  assert.equal(chuTrong(/<span id="company-tax"[^>]*>([^<]*)<\/span>/, "#company-tax").replace(/[^0-9-]/g, ""), ho.tax_code, "MST");
  assert.equal(chuan(chuTrong(/<span class="login-address"[^>]*>([^<]*)<\/span>/, ".login-address")), chuan(ho.address), "địa chỉ");
});
