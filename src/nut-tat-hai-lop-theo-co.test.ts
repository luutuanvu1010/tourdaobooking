// HÀNG RÀO ĐỌC MÃ NGUỒN (ADR-0074 điều 5, ADR-0090 đ1 iv; Phần B Task 8, Minor của người kiểm Task 7): nút "Tắt bảo mật hai lớp" ở màn Quản lý tài khoản
// CHỈ hiện theo cờ máy chủ `canResetMfa` của từng dòng (máy chủ tính bằng CÙNG hàm cổng với route POST /api/staff/:id/mfa-reset — bài khớp cờ ↔ route ở
// src/modules/accounts/tat-hai-lop.test.ts). Giao diện không tự đoán "ai tắt được của ai" từ quyền (Quản trị không tắt của Toàn quyền / người giữ tiền…).
// Kịch bản Chrome `docs/evidence/2026-10-01-dang-nhap-b/kich-ban/hai-lop.mjs` bước 6 kiểm trên trình duyệt thật; bài này canh ở `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const WEB = new URL("../web/", import.meta.url);
const tep = (readdirSync(WEB, { recursive: true }) as string[]).filter((f) => f.endsWith(".ts") && !f.includes("vendor"));
const doc = (f: string) => readFileSync(new URL(f, WEB), "utf8");

test("nút «Tắt bảo mật hai lớp» chỉ hiện sau `s.canResetMfa &&` (cờ máy chủ), đúng hai chỗ (bảng máy tính + thẻ điện thoại) ở web/staff.ts", () => {
  const goi: string[] = [];
  for (const f of tep) {
    for (const dong of doc(f).split("\n")) {
      if (/\bopenTatHaiLop\(s\)/.test(dong) && !/function openTatHaiLop/.test(dong)) goi.push(`${f}: ${dong.trim()}`);
    }
  }
  assert.equal(goi.length, 2, `số chỗ mở hộp tắt lớp hai: ${goi.join(" | ")}`);
  for (const g of goi) assert.match(g, /^staff\.ts: s\.canResetMfa && btn\("Tắt bảo mật hai lớp", \(\) => openTatHaiLop\(s\)/, g);
});

test("giao diện không tự tính cờ canResetMfa (chỉ đọc từ máy chủ), không gọi route mfa-reset ngoài hộp xác nhận", () => {
  for (const f of tep) {
    const src = doc(f);
    assert.doesNotMatch(src, /canResetMfa\s*(=[^=]|:)/, `${f}: gán / khai cờ canResetMfa ở giao diện`);
    const route = (src.match(/\/mfa-reset`/g) ?? []).length;
    assert.equal(route, f === "staff.ts" ? 1 : 0, `${f}: gọi /api/staff/:id/mfa-reset`);
  }
});
