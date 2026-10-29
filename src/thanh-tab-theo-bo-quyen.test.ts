import assert from "node:assert/strict";
import { test } from "node:test";
import { PERMISSION_CODES, can, seesAllOrders, type PermissionCode } from "./shared/permissions.ts";
import { sangTabToi, sangTai, thanhTab, type KhoaTrang } from "./shared/muc-giao-dien.ts";

const holder = (permissions: readonly PermissionCode[]) => ({ id: "x", permissions });
const nhan = (p: readonly PermissionCode[]) => thanhTab({ staff: holder(p) }).map((t) => t.nhan);

const BO: [string, PermissionCode[], string[]][] = [
  ["TQ", ["SUPER_ADMIN"], ["Trang chủ", "Đơn hàng", "Tạo đơn", "Thiết lập", "Tôi"]],
  ["QT", ["ADMIN"], ["Trang chủ", "Đơn hàng", "Tạo đơn", "Thiết lập", "Tôi"]],
  ["KT", ["ACCOUNTING"], ["Trang chủ", "Đơn hàng", "Sổ công nợ", "Tôi"]],
  ["BH", ["SALES"], ["Trang chủ", "Đơn hàng", "Tạo đơn", "Danh bạ", "Tôi"]],
  ["TT", ["INTERN"], ["Đơn hàng", "Tạo đơn", "Hỗ trợ", "Tôi"]],
  ["ĐT", ["PARTNER"], ["Đơn hàng", "Tạo đơn", "Hỗ trợ", "Tôi"]],
  ["HDV", ["FIELD"], ["Đơn hàng", "Hỗ trợ", "Hướng dẫn", "Tôi"]],
  ["NS", ["HR"], ["Tài khoản", "Hỗ trợ", "Hướng dẫn", "Tôi"]],
  ["TX", ["DRIVER"], ["Trang chủ", "Cuốc của tôi", "Hỗ trợ", "Tôi"]],
  ["TXĐT", ["DRIVER_PARTNER"], ["Trang chủ", "Cuốc của tôi", "Báo bận", "Hỗ trợ", "Tôi"]],
];
for (const [ten, p, mong] of BO) test(`thanh tab của ${ten}`, () => assert.deepEqual(nhan(p), mong));

test("tài xế công ty: Trang chủ trỏ /tai-xe", () => {
  assert.equal(thanhTab({ staff: holder(["DRIVER"]) })[0].href, "/tai-xe");
});

test("mọi tập con quyền: tối đa 5 mục, cuối là Tôi, Tạo đơn đúng chỗ", () => {
  const n = PERMISSION_CODES.length;
  assert.ok(n >= 10 && n <= 12, `số mã quyền ${n}`);
  for (let m = 0; m < 1 << n; m++) {
    const p = PERMISSION_CODES.filter((_, i) => m & (1 << i));
    const t = nhan(p);
    assert.ok(t.length <= 5, `${p}: ${t}`);
    assert.equal(t[t.length - 1], "Tôi", `${p}`);
    const i = t.indexOf("Tạo đơn");
    // Ngoại lệ DUY NHẤT (đặc tả 5.2 tự mâu thuẫn với "Tạo đơn thứ 3" cho tổ hợp Nhân sự + lập đơn, không có Trang chủ): đúng hình này, Tạo đơn thứ 2.
    // (INTERN+HR tạo được; chỉ PARTNER+HR không tồn tại.) Mọi tập khác giữ luật 3/5 – 2/4.
    const hrKhongTrangChu = can(holder(p), "account.view") && !can(holder(p), "admin.manage") && can(holder(p), "order.create") && !seesAllOrders(holder(p));
    if (hrKhongTrangChu) {
      assert.deepEqual(t, ["Đơn hàng", "Tạo đơn", "Tài khoản", "Hỗ trợ", "Tôi"], `${p}`);
      assert.equal(i, 1);
    } else if (i >= 0) assert.equal(i, t.length === 5 ? 2 : 1, `${p}: ${t}`);
  }
});

test("Bán hàng + Kế toán + Nhân sự: 5 mục, cuối Tôi", () => {
  const t = nhan(["SALES", "ACCOUNTING", "HR"]);
  assert.equal(t.length, 5);
  assert.equal(t[4], "Tôi");
});

test("sangTabToi theo tập tab đang hiện", () => {
  assert.equal(sangTabToi("/so-cong-no", ["trangChu", "donHang", "soCongNo", "toi"] as KhoaTrang[]), false);
  assert.equal(sangTabToi("/so-cong-no", ["trangChu", "donHang", "taoDon", "danhBa", "toi"] as KhoaTrang[]), true);
  assert.equal(sangTabToi("/staff", ["trangChu", "donHang", "taoDon", "thietLap", "toi"] as KhoaTrang[]), false);
  assert.equal(sangTai("thietLap", "/staff"), true);
});
