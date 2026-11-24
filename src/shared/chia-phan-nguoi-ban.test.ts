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

test("nguoiBanCuaDong: nhà cung cấp mua lại ⇒ id; công ty tự cung cấp, thiếu nhà cung cấp, không bản chụp ⇒ null (phần Tour Đảo)", () => {
  assert.equal(nguoiBanCuaDong(ban("a", "ncc")), "ncc");
  assert.equal(nguoiBanCuaDong(ban("a", CT)), null);
  assert.equal(nguoiBanCuaDong(ban("a", null)), null);
  assert.equal(nguoiBanCuaDong(undefined), null);
});

test("việc 15: đọc nhà cung cấp mua lại trong bản chụp, không so với công ty chủ HÔM NAY — bản chụp người bán = công ty chủ CŨ, không nhà cung cấp ⇒ vẫn phần Tour Đảo", () => {
  const cu: BanChup = { serviceId: "a", beneficiaryPartyId: null, hoaHong: { status: "NONE" }, cungUng: { status: "SET", termId: "prc-st-goc-all", sellerPartyId: "pty-cong-ty-cu", supplierPartyId: null, costRateBp: null } };
  assert.equal(nguoiBanCuaDong(cu), null);
});

const dong = [{ id: "ht", ncc: null, tien: 1_000_000 }, { id: "ir", ncc: "ir", tien: 600_000 }, { id: "x", ncc: "x", tien: 300_000 }, { id: "ir2", ncc: "ir", tien: 100_000 }];
const chia = (giam: number, ds = dong, phi = 0) => chiaPhanNguoiBan(ds, (d) => d.ncc, (d) => d.tien, giam, phi).map((p) => [p.nguoiBan, p.gross, p.giamGia, p.tong]);

test("chiaPhanNguoiBan: Tour Đảo đầu, nhà cung cấp theo thứ tự dòng đầu tiên; giảm trừ Tour Đảo trước, vượt trừ lần lượt", () => {
  assert.deepEqual(chia(0), [[null, 1_000_000, 0, 1_000_000], ["ir", 700_000, 0, 700_000], ["x", 300_000, 0, 300_000]]);
  assert.deepEqual(chia(20_000), [[null, 1_000_000, 20_000, 980_000], ["ir", 700_000, 0, 700_000], ["x", 300_000, 0, 300_000]], "đơn trộn: quầy giữ giá niêm yết");
  assert.deepEqual(chia(1_200_000), [[null, 1_000_000, 1_000_000, 0], ["ir", 700_000, 200_000, 500_000], ["x", 300_000, 0, 300_000]]);
  assert.deepEqual(chia(5_000_000).map((p) => p[3]), [0, 0, 0], "giảm quá tổng ⇒ mọi phần 0, không âm");
  assert.deepEqual(chia(-5), chia(0), "giảm âm coi là 0");
  assert.deepEqual(chia(20_000, [dong[1]!]), [["ir", 600_000, 20_000, 580_000]], "B-5: đơn chỉ vé i-resort ⇒ phần quầy 580.000");
  assert.deepEqual(chia(0, []), []);
});

// Đợt C, Task 5 (trang ghép 2026-10-28 §1; chủ 15/11): phí đưa đón vào phần Tour Đảo, giảm giá chỉ trừ gross dịch vụ.
const htBun = [{ id: "ht", ncc: "ht", tien: 1_000_000 }];
test("SV-PD-26: Tắm bùn Hòn Tằm (Hòn Tằm bán) 1.000.000 + phí đón 140.000 ⇒ phần Tour Đảo 140.000 (chỉ phí, đứng đầu), phần Hòn Tằm 1.000.000; tổng 1.140.000", () => {
  assert.deepEqual(chia(0, htBun, 140_000), [[null, 0, 0, 140_000], ["ht", 1_000_000, 0, 1_000_000]]);
});
test("SV-PD-29: thêm giảm giá 100.000 ⇒ giảm giá không trừ vào phí: phần Hòn Tằm 900.000, phần Tour Đảo 140.000, tổng 1.040.000; giảm tối đa 1.000.000 vẫn để nguyên phí", () => {
  assert.deepEqual(chia(100_000, htBun, 140_000), [[null, 0, 0, 140_000], ["ht", 1_000_000, 100_000, 900_000]]);
  assert.deepEqual(chia(1_000_000, htBun, 140_000), [[null, 0, 0, 140_000], ["ht", 1_000_000, 1_000_000, 0]]);
  assert.deepEqual(chia(20_000, dong, 200_000), [[null, 1_000_000, 20_000, 1_180_000], ["ir", 700_000, 0, 700_000], ["x", 300_000, 0, 300_000]], "Tour Đảo có dịch vụ: giảm trừ dịch vụ, phí cộng sau");
  assert.deepEqual(chia(0, htBun, 0), [["ht", 1_000_000, 0, 1_000_000]], "phí 0 đồng không tự sinh phần Tour Đảo");
});

test("một hàm cho hai nơi (R-154): biên nhận và trần quầy cùng gọi chiaPhanNguoiBan, không nơi nào tự trừ giảm giá theo phần", () => {
  for (const f of ["src/modules/receipt/rules.ts", "src/modules/billing/rules.ts"]) {
    const src = readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");
    assert.match(src, /chiaPhanNguoiBan\(/, `${f} phải gọi chiaPhanNguoiBan`);
    assert.doesNotMatch(src, /Math\.min\(\s*giam\b/, `${f}: vòng trừ giảm giá thứ hai (chép công thức chia)`);
  }
});
