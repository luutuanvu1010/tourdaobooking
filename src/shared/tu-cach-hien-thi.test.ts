import { test } from "node:test";
import assert from "node:assert/strict";
import { cheDoTuCach, nhanMucTuCach, tuCachBanDau, type TuCachHienThi } from "./tu-cach-hien-thi.ts";

const NAM: TuCachHienThi = { partyId: "p-nam", ten: "Anh Nam", laToChuc: false };
const SUN: TuCachHienThi = { partyId: "p-sun", ten: "Khách sạn Sunrise", laToChuc: true };
const MOON: TuCachHienThi = { partyId: "p-moon", ten: "Công ty Moon", laToChuc: true };

test("cheDoTuCach: rỗng và chỉ cá nhân ⇒ không ô; một tổ chức ⇒ chỉ đọc; từ hai tư cách ⇒ ô chọn", () => {
  assert.equal(cheDoTuCach([]), "khong");
  assert.equal(cheDoTuCach([NAM]), "khong");
  assert.equal(cheDoTuCach([SUN]), "chi-doc");
  assert.equal(cheDoTuCach([NAM, SUN]), "chon");
  assert.equal(cheDoTuCach([SUN, MOON]), "chon");
});

test("tuCachBanDau: lần cuối nếu còn; hết thì cá nhân; không cá nhân thì mục đầu; rỗng thì null", () => {
  assert.equal(tuCachBanDau([NAM, SUN], "p-sun"), SUN);
  assert.equal(tuCachBanDau([NAM, SUN], "p-da-mat"), NAM);
  assert.equal(tuCachBanDau([NAM, SUN], null), NAM);
  assert.equal(tuCachBanDau([SUN, MOON], null), SUN);
  assert.equal(tuCachBanDau([], "p-sun"), null);
});

test("nhanMucTuCach: tổ chức chỉ tên; cá nhân kèm «(cá nhân)»", () => {
  assert.equal(nhanMucTuCach(SUN), "Khách sạn Sunrise");
  assert.equal(nhanMucTuCach(NAM), "Anh Nam (cá nhân)");
});
