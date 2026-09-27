// ADR-0024 6.3: cột pháp lý của company_profile THÔI được đọc. Siết (Điều 9.4 cho phép siết): (1) module company không đăng ký câu SQL nào nhắc
// các cột đó; (2) ngoài module company và tệp test, không tệp mã nào nhắc tên bảng company_profile (một nguồn định danh = hồ sơ công ty chủ, H5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import "./repository.ts";
import { registeredSql } from "../../shared/sql-registry.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const COT_PHAP_LY = /\b(company_name|tax_code|address|hotline|zalo_number|email)\b/i;

test("6.3: module company không còn câu SQL nào đọc cột pháp lý của company_profile", () => {
  const mine = registeredSql().filter((e) => e.module === "company");
  assert.ok(mine.length >= 1, "module nghiêm vẫn phải có ít nhất một câu đăng ký (src/architecture.test.ts)");
  assert.deepEqual(mine.filter((e) => COT_PHAP_LY.test(e.sql)).map((e) => e.name), []);
});

test("6.3: ngoài src/modules/company/ (và *.test.ts), không tệp .ts nào trong src/, web/ nhắc company_profile", () => {
  // Chỉ tệp .ts, bỏ *.test.ts và *.d.ts — như walk() của src/architecture.test.ts. Không quét tệp .txt: src/release-lib.fixtures/ có tên tệp
  // migration company_profile làm dữ liệu mẫu hợp lệ.
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return walk(p);
      return p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
    });
  const problems: string[] = [];
  for (const file of [...walk(join(ROOT, "src")), ...walk(join(ROOT, "web"))]) {
    const rel = relative(ROOT, file).split(sep).join("/");
    if (rel.startsWith("src/modules/company/")) continue;
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      if (line.includes("company_profile")) problems.push(`${rel}:${i + 1}`);
    });
  }
  assert.deepEqual(problems, [], "đọc định danh công ty qua hàm công bố ownerCompany của parties (GET /api/company), không qua bảng company_profile");
});
