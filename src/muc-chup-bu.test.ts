// Sổ đại lý đợt 2, Task 12: lối vào trang «Chụp bù mức» (`/chup-bu`) — mục Thiết lập (thanh bên máy tính) và dòng trang Tôi (điện thoại) CÙNG cổng route
// `GET /api/orders/cho-chup-bu`: ô order.terms.override và không giữ quyền Đối tác (kể cả tài khoản lai). Trang đã khai PAGES + build:web (bài sw-policy / goi-trang-nhe lo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PERMISSION_CODES, can, holdsPartner, type PermissionHolder } from "./shared/permissions.ts";
import { PAGES, PRECACHE } from "./shared/sw-policy.ts";
import { thanhBen, trangToi } from "./shared/muc-giao-dien.ts";

const nguoi = (...p: string[]): PermissionHolder => ({ id: `t-${p.join("-")}`, permissions: p as PermissionHolder["permissions"] });
const coMucThietLap = (s: PermissionHolder): boolean =>
  thanhBen({ staff: s }, "/account").some((g) => g.nhom === "THIẾT LẬP" && g.muc.some((m) => m.href === "/chup-bu" && m.nhan === "Chụp bù mức"));
const coDongToi = (s: PermissionHolder): boolean => trangToi(s).sau.some((m) => m.href === "/chup-bu" && m.nhan === "Chụp bù mức");

test("Kế toán, Quản trị, Toàn quyền thấy «Chụp bù mức» ở Thiết lập và trang Tôi; Bán hàng, HDV, Đối tác, tài khoản lai Kế toán + Đối tác thì không", () => {
  for (const p of [["ACCOUNTING"], ["ADMIN"], ["SUPER_ADMIN"]]) {
    assert.equal(coMucThietLap(nguoi(...p)), true, p.join("+"));
    assert.equal(coDongToi(nguoi(...p)), true, p.join("+"));
  }
  for (const p of [["SALES"], ["FIELD"], ["PARTNER"], ["ACCOUNTING", "PARTNER"], ["INTERN"], ["HR"]]) {
    assert.equal(coMucThietLap(nguoi(...p)), false, p.join("+"));
    assert.equal(coDongToi(nguoi(...p)), false, p.join("+"));
  }
});

test("MỌI tập quyền: mục hiện ⇔ đúng cổng route (order.terms.override, không Đối tác)", () => {
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const s: PermissionHolder = { id: `tap-${m}`, permissions: PERMISSION_CODES.filter((_, i) => m & (1 << i)) };
    const cong = can(s, "order.terms.override") && !holdsPartner(s);
    assert.equal(coMucThietLap(s), cong, s.permissions.join("+"));
    assert.equal(coDongToi(s), cong, s.permissions.join("+"));
  }
});

test("trang /chup-bu có ở PAGES, nạp sẵn (trang + script), build:web và có tệp public/chup-bu.html", () => {
  assert.ok(PAGES.includes("/chup-bu"));
  assert.ok(PRECACHE.includes("/chup-bu") && PRECACHE.includes("/js/chup-bu.js"));
  assert.match(readFileSync(new URL("../package.json", import.meta.url), "utf8"), /web\/chup-bu\.ts/);
  assert.match(readFileSync(new URL("../public/chup-bu.html", import.meta.url), "utf8"), /<title>Chụp bù mức — Island Booking System<\/title>/);
});
