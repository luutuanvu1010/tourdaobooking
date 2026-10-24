// Bài thuần của hàm chia theo người bán (Ruling R-154; R-81). Bài route (hai nơi: trần quầy = biên nhận) ở src/modules/billing/ben-kia.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chiaPhanNguoiBan, nguoiBanCuaDong } from "./chia-phan-nguoi-ban.ts";
import type { BanChup } from "./hoa-hong-dong.ts";

const CT = "pty-ct";
const ban = (serviceId: string, seller: string | null): BanChup => ({
  serviceId, beneficiaryPartyId: null, hoaHong: { status: "NONE" },
  cungUng: seller === null ? { status: "MISSING" } : { status: "SET", termId: "t", sellerPartyId: seller, supplierPartyId: seller === CT ? null : seller, costRateBp: seller === CT ? null : 8000 },
});

test("nguoiBanCuaDong: nhà cung cấp ⇒ id; công ty chủ, thiếu người bán, không bản chụp, không biết công ty chủ ⇒ null (phần Tour Đảo)", () => {
  assert.equal(nguoiBanCuaDong(ban("a", "ncc"), CT), "ncc");
  assert.equal(nguoiBanCuaDong(ban("a", CT), CT), null);
  assert.equal(nguoiBanCuaDong(ban("a", null), CT), null);
  assert.equal(nguoiBanCuaDong(undefined, CT), null);
  assert.equal(nguoiBanCuaDong(ban("a", "ncc"), null), null);
});

const dong = [{ id: "ht", ncc: null, tien: 1_000_000 }, { id: "ir", ncc: "ir", tien: 600_000 }, { id: "x", ncc: "x", tien: 300_000 }, { id: "ir2", ncc: "ir", tien: 100_000 }];
const chia = (giam: number, ds = dong) => chiaPhanNguoiBan(ds, (d) => d.ncc, (d) => d.tien, giam).map((p) => [p.nguoiBan, p.gross, p.giamGia, p.tong]);

test("chiaPhanNguoiBan: Tour Đảo đầu, nhà cung cấp theo thứ tự dòng đầu tiên; giảm trừ Tour Đảo trước, vượt trừ lần lượt", () => {
  assert.deepEqual(chia(0), [[null, 1_000_000, 0, 1_000_000], ["ir", 700_000, 0, 700_000], ["x", 300_000, 0, 300_000]]);
  assert.deepEqual(chia(20_000), [[null, 1_000_000, 20_000, 980_000], ["ir", 700_000, 0, 700_000], ["x", 300_000, 0, 300_000]], "đơn trộn: quầy giữ giá niêm yết");
  assert.deepEqual(chia(1_200_000), [[null, 1_000_000, 1_000_000, 0], ["ir", 700_000, 200_000, 500_000], ["x", 300_000, 0, 300_000]]);
  assert.deepEqual(chia(5_000_000).map((p) => p[3]), [0, 0, 0], "giảm quá tổng ⇒ mọi phần 0, không âm");
  assert.deepEqual(chia(-5), chia(0), "giảm âm coi là 0");
  assert.deepEqual(chia(20_000, [dong[1]!]), [["ir", 600_000, 20_000, 580_000]], "B-5: đơn chỉ vé i-resort ⇒ phần quầy 580.000");
  assert.deepEqual(chia(0, []), []);
});

test("một hàm cho hai nơi (R-154): biên nhận và trần quầy cùng gọi chiaPhanNguoiBan, không nơi nào tự trừ giảm giá theo phần", () => {
  for (const f of ["src/modules/receipt/rules.ts", "src/modules/billing/rules.ts"]) {
    const src = readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");
    assert.match(src, /chiaPhanNguoiBan\(/, `${f} phải gọi chiaPhanNguoiBan`);
    assert.doesNotMatch(src, /Math\.min\(\s*giam\b/, `${f}: vòng trừ giảm giá thứ hai (chép công thức chia)`);
  }
});
