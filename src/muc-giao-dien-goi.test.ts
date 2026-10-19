// Bảng đường gọi chính tách riêng (`src/shared/muc-giao-dien-goi.ts`, Ruling R-P27 — sổ đại lý đợt 2 Task 12) phải ĐỒNG BỘ với `TRANG`: mỗi khoá trang đúng một dòng,
// không thừa, không thiếu (typecheck bắt khi viết; bài này bắt lúc chạy, kể cả khi ai đó ép kiểu). Giá trị đúng khuôn `GET /api/…` hoặc null (null chỉ hợp lệ khi có trong
// danh sách MIỄN của bài rào — bài `muc-hien-mo-duoc-*` kiểm). Gói giao diện không được kéo bảng này vào (nó chỉ cho bài rào).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { TRANG } from "./shared/muc-giao-dien.ts";
import { GOI_CHINH } from "./shared/muc-giao-dien-goi.ts";

test("GOI_CHINH ↔ TRANG: cùng tập khoá, không thừa không thiếu", () => {
  assert.deepEqual(Object.keys(GOI_CHINH).sort(), Object.keys(TRANG).sort());
});

test("mỗi đường gọi chính đúng khuôn `GET /api/…` (hoặc null)", () => {
  for (const [k, g] of Object.entries(GOI_CHINH)) assert.ok(g === null || /^GET \/api\/[^\s]+$/.test(g), `${k}: ${g}`);
});

test("TRANG không còn trường `goi` (chỉ một nguồn), và không tệp web/ nào nhập bảng đường gọi", () => {
  for (const [k, t] of Object.entries(TRANG)) assert.ok(!("goi" in t), `${k} còn trường goi`);
  const nhap = readdirSync(new URL("../web/", import.meta.url)).filter((f) => f.endsWith(".ts"))
    .filter((f) => readFileSync(new URL(`../web/${f}`, import.meta.url), "utf8").includes("muc-giao-dien-goi"));
  assert.deepEqual(nhap, []);
});
