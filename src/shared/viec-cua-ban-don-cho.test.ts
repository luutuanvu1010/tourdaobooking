// ADR-0136 Đ9 (Task 3.5): thẻ «Đơn chờ xác nhận» của Trang chủ — hiện cho người giữ ô `order.confirm.review` (kể cả hướng dẫn viên, người KHÔNG xem được mọi đơn), đếm + số quá hạn, đích là trang danh sách chờ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { KHOA_PHAM_VI, nguonCanTai, viecCuaBan } from "./viec-cua-ban.ts";
import { PHAM_VI_O_TRANG_CHU } from "./pham-vi-so.ts";
import { PERMISSION_CODES, can, type PermissionHolder } from "./permissions.ts";

const nguoi = (...p: string[]): PermissionHolder => ({ id: `t-${p.join("-")}`, permissions: p as PermissionHolder["permissions"] });

test("thẻ donCho: hiện cho Bán hàng, Quản trị, Toàn quyền khi có đơn chờ (ADR-0142: Kế toán và HDV không còn); không cho Kế toán, HDV, Đối tác, Thực tập, Nhân sự, Tài xế", () => {
  for (const p of ["SALES", "ADMIN", "SUPER_ADMIN"]) {
    const kq = viecCuaBan(nguoi(p), { donCho: { count: 3, quaHan: 1 } });
    const the = kq.the.find((t) => t.khoa === "donCho");
    assert.ok(the, p);
    assert.equal(the!.so, 3);
    assert.equal(the!.href, "/cho-xac-nhan");
    assert.equal(the!.nhan, "Đơn chờ xác nhận");
    assert.doesNotMatch(the!.phu, /quá hạn/, "ADR-0142: quá hạn nay hiện ở thẻ «Đơn chưa có người phụ trách»");
  }
  for (const p of ["ACCOUNTING", "FIELD", "PARTNER", "INTERN", "HR", "DRIVER", "DRIVER_PARTNER"]) {
    assert.equal(viecCuaBan(nguoi(p), { donCho: { count: 3, quaHan: 0 } }).the.length, 0, p);
    assert.ok(!nguonCanTai(nguoi(p)).includes("donCho"), p);
  }
});

test("thẻ donCho: không có đơn thì vắng; nguồn lỗi (null) hiện «—» chứ không phải 0; không quá hạn thì dòng phụ không nói quá hạn", () => {
  assert.equal(viecCuaBan(nguoi("SALES"), { donCho: { count: 0, quaHan: 0 } }).the.some((t) => t.khoa === "donCho"), false);
  const loi = viecCuaBan(nguoi("SALES"), { donCho: null }).the.find((t) => t.khoa === "donCho");
  assert.equal(loi?.so, null);
  const yen = viecCuaBan(nguoi("SALES"), { donCho: { count: 2, quaHan: 0 } }).the.find((t) => t.khoa === "donCho")!;
  assert.doesNotMatch(yen.phu, /quá hạn/);
});

test("MỌI tập quyền: nguonCanTai có donCho ⇔ can(order.confirm.review) — một nguồn bảng quyền", () => {
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const s: PermissionHolder = { id: `tap-${m}`, permissions: PERMISSION_CODES.filter((_, i) => m & (1 << i)) };
    assert.equal(nguonCanTai(s).includes("donCho"), can(s, "order.confirm.review"), s.permissions.join("+"));
  }
});

test("phạm vi ô số: donCho là «Toàn công ty» (đếm mọi đơn chờ)", () => {
  assert.equal(PHAM_VI_O_TRANG_CHU[KHOA_PHAM_VI.donCho], "TOAN_CONG_TY");
});
