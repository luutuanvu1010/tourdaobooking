// Vòng sửa 1 lát H-4, I-3 (người kiểm nhóm A): "Mở khoá" ghi nhật ký `login_unlocked` CÙNG LÔ với việc xoá khoá đăng nhập — trước đây `unlockLogin` chạy xong rồi
// `adminAudit(...).run()` riêng, nên nhật ký hỏng ⇒ đã mở khoá mà thiếu dòng (và `login_unlocked` là tầng CUA_SO_30 của lính gác ADR-0125 đ5).
// Bài tĩnh trên thân route `POST /api/staff/:id/unlock`: đúng MỘT db.batch, nhật ký đứng TRƯỚC câu xoá khoá, không còn await/`.run()` riêng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { maskSource } from "../../../scripts/source-mask-lib.mjs";

const src = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
function thanRoute(): string {
  const i = src.indexOf('route("POST", "/api/staff/:id/unlock"');
  assert.ok(i >= 0, "không thấy route unlock");
  const j = src.indexOf("\n    route(", i + 10);
  return src.slice(i, j < 0 ? undefined : j);
}

test("route mở khoá: nhật ký login_unlocked và việc xoá khoá nằm trong MỘT db.batch, nhật ký trước", () => {
  const than = maskSource(thanRoute());
  const goiBatch = [...than.matchAll(/db\.batch\(/g)];
  assert.equal(goiBatch.length, 1, "đúng một db.batch");
  assert.doesNotMatch(than, /\bawait\s+unlockLogin\(/, "không gọi unlockLogin (lô riêng)");
  assert.doesNotMatch(than, /\.run\(\)/, "không ghi nhật ký bằng .run() riêng");
  const raw = thanRoute();
  const nhatKy = raw.indexOf('"login_unlocked"');
  const xoaKhoa = raw.indexOf("unlockLoginStatements(");
  assert.ok(nhatKy > 0 && xoaKhoa > nhatKy, "nhật ký đứng trước câu xoá khoá trong lô");
});
