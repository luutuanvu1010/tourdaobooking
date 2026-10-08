// Mọi lô ghi tiền của billing phải dịch lỗi khoá tháng (đặc tả §8: "không bao giờ 500"). Đếm trong mã nguồn: số `db.batch(` = số `loiKhoaKy(`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
for (const tep of ["service.ts", "coc.ts", "thay-lan-thu.ts"]) {
  test(`${tep}: mỗi db.batch có loiKhoaKy trong catch`, () => {
    const src = readFileSync(new URL(`./${tep}`, import.meta.url), "utf8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    const lo = (src.match(/\bdb\.batch\(/g) ?? []).length;
    const dich = (src.match(/\bloiKhoaKy\(db, e,/g) ?? []).length;
    assert.ok(lo > 0, "không thấy lô nào — đổi tên biến db?");
    assert.equal(dich, lo, `${tep}: ${lo} lô nhưng ${dich} chỗ dịch lỗi khoá tháng`);
  });
}
