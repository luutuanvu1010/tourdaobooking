// Bộ đếm lượt gõ sai mã vào tổ chức (ADR-0213 Đ7.3; mốc B2 Task 15): khoá `moi:` (tài khoản) và `dk:moi:` (danh tính đăng ký) dọn theo cửa sổ MỘT GIỜ của chính nó.
// Bẫy đã thấy lúc thiết kế: câu dọn 15 phút của đăng nhập (`key NOT LIKE 'dk:%'`) xoá cả dòng `moi:` ⇒ trần «5 lần mỗi giờ» âm thầm thành «5 lần mỗi 15 phút»; câu dọn `dk:` của xin mã
// (cửa sổ chính sách) xoá dòng `dk:moi:` sớm. Bài này gọi thẳng reserveAttempts trên SQLite thật dựng từ migrations/ (khung tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world } from "../../../tests/audit/harness.mjs";
import { reserveAttempts } from "./throttle.ts";

const PHUT = 60_000;
const GIO = 60 * PHUT;

for (const khoa of ["moi:staff:tk-1", "dk:moi:ident-1"]) {
  test(`${khoa}: 5 lần gõ sai, 20 phút sau một lượt đăng nhập và một lượt xin mã (khoá khác) dọn bảng — lần thứ 6 trong giờ vẫn bị chặn; qua một giờ thì được`, async () => {
    const w = world();
    const t0 = Date.now();
    for (let i = 0; i < 5; i++) assert.equal((await reserveAttempts(w.env.DB, [{ key: khoa, max: 5 }], t0 + i * 1000, GIO)).allowed, true, `lần ${i + 1}`);
    // Lượt đăng nhập (cửa sổ 15 phút) và lượt xin mã của đăng ký (cửa sổ 15 phút) chạy câu dọn của chúng.
    assert.equal((await reserveAttempts(w.env.DB, [{ key: "phone:0900000099", max: 5 }], t0 + 20 * PHUT)).allowed, true);
    assert.equal((await reserveAttempts(w.env.DB, [{ key: "dk:email:x", max: 5 }], t0 + 20 * PHUT, 15 * PHUT)).allowed, true);
    assert.equal(w.q("SELECT count(*) n FROM login_attempt WHERE key = ?", khoa)[0].n, 5, "câu dọn của không gian khác không xoá dòng lượt gõ mã");
    assert.equal((await reserveAttempts(w.env.DB, [{ key: khoa, max: 5 }], t0 + 21 * PHUT, GIO)).allowed, false, "lần thứ 6 trong cùng giờ ⇒ chặn");
    assert.equal((await reserveAttempts(w.env.DB, [{ key: khoa, max: 5 }], t0 + GIO + 10_000, GIO)).allowed, true, "qua một giờ ⇒ được");
  });
}

test("lượt gõ mã (cửa sổ một giờ) KHÔNG dọn dòng `dk:` của xin mã: câu dọn `dk:` chỉ chạy khi lượt gọi có khoá `dk:` khác `dk:moi:`", async () => {
  const w = world();
  const t0 = Date.now();
  assert.equal((await reserveAttempts(w.env.DB, [{ key: "dk:email:y", max: 5 }], t0, 3 * GIO)).allowed, true);
  assert.equal((await reserveAttempts(w.env.DB, [{ key: "dk:moi:ident-2", max: 5 }], t0 + 2 * GIO, GIO)).allowed, true);
  assert.equal(w.q("SELECT count(*) n FROM login_attempt WHERE key = 'dk:email:y'")[0].n, 1, "dòng xin mã (cửa sổ 3 giờ) còn nguyên");
});
