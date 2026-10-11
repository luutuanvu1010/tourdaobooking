// BÀI NỐI (sổ đại lý đợt 1, Task 11): ba cổng ẩn/hiện của giao diện "bên đặt là đối tác" phải khớp ĐÚNG câu trả lời của route thật — giao diện chỉ ẩn/hiện, máy chủ luôn kiểm lại, nhưng một ô hiện ra mà route luôn
// từ chối (hay ngược lại một ô bị ẩn trong khi route cho) là lỗi giao diện. Mỗi cặp tài khoản thật gọi route thật qua khung thử (SQLite thật + cả ứng dụng):
//  - ô "Đặt qua đối tác"  ⇔ `GET /api/pricing/nguoi-huong` trả 200  (`coODatQuaDoiTac`);
//  - khối người bán       ⇔ `GET /api/pricing/cung-ung` trả 200       (`coXemNguoiBan`);
//  - nút "Ghi mức tay"    ⇔ `POST /api/orders/:id/thuong-mai/:serviceId` KHÔNG bị 403 (`duocGhiTay` với đơn đã xác nhận, chưa giao) — id đơn lạ nên qua cổng quyền thì nhận 404, không phải 403.
// Tài khoản lai (Bán hàng / Kế toán / Quản trị + Đối tác) nằm trong tập thử: "có quyền Đối tác là áp" (Ruling 12).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { coODatQuaDoiTac, coXemNguoiBan, duocGhiTay } from "../../shared/phan-doi-tac-hien-thi.ts";
import type { PermissionCode } from "../../shared/permissions.ts";

const TAP: { ten: string; perms: PermissionCode[] }[] = [
  { ten: "Bán hàng", perms: ["SALES"] },
  { ten: "Kế toán", perms: ["ACCOUNTING"] },
  { ten: "Quản trị", perms: ["ADMIN"] },
  { ten: "Toàn quyền", perms: ["SUPER_ADMIN"] },
  { ten: "Hướng dẫn viên", perms: ["FIELD"] },
  { ten: "Đối tác", perms: ["PARTNER"] },
  { ten: "Thực tập", perms: ["INTERN"] },
  { ten: "Tài xế", perms: ["DRIVER"] },
  { ten: "Nhân sự", perms: ["HR"] },
  { ten: "lai Bán hàng + Đối tác", perms: ["SALES", "PARTNER"] },
  { ten: "lai Kế toán + Đối tác", perms: ["ACCOUNTING", "PARTNER"] },
  { ten: "lai Quản trị + Đối tác", perms: ["ADMIN", "PARTNER"] },
];
const DON_LA = "99999999-9999-4999-8999-999999999999";

test("ba cổng ẩn/hiện khớp ĐÚNG câu trả lời của route thật, cho từng tài khoản (kể cả tài khoản lai)", async () => {
  const w = world();
  const ids = TAP.map((t, i) => {
    const id = `77777777-7777-4777-8777-7777777777${String(10 + i).padStart(2, "0")}`;
    seedStaff(w.sqlite, { id, phone: `09000001${String(10 + i).padStart(2, "0")}`, name: t.ten, perms: t.perms });
    return id;
  });
  const lech: string[] = [];
  for (const [i, t] of TAP.entries()) {
    const staff = { id: ids[i]!, permissions: t.perms };
    const timDoiTac = await w.call("GET", "/api/pricing/nguoi-huong?q=", { as: ids[i] });
    const cungUng = await w.call("GET", "/api/pricing/cung-ung", { as: ids[i] });
    const ghiTay = await w.call("POST", `/api/orders/${DON_LA}/thuong-mai/dich-vu-la`, { as: ids[i], body: {} });
    if ((timDoiTac.status === 200) !== coODatQuaDoiTac(staff)) lech.push(`${t.ten}: ô Đặt qua đối tác = ${coODatQuaDoiTac(staff)} nhưng nguoi-huong trả ${timDoiTac.status}`);
    if ((cungUng.status === 200) !== coXemNguoiBan(staff)) lech.push(`${t.ten}: khối người bán = ${coXemNguoiBan(staff)} nhưng cung-ung trả ${cungUng.status}`);
    const ghiTayDuoc = duocGhiTay(staff, { status: "confirmed", deliveredAt: null });
    if ((ghiTay.status !== 403) !== ghiTayDuoc) lech.push(`${t.ten}: nút Ghi mức tay = ${ghiTayDuoc} nhưng route ghi tay trả ${ghiTay.status}`);
  }
  assert.deepEqual(lech, []);
  // đối chứng: bài có răng — ít nhất một tài khoản mở được từng cổng và ít nhất một bị từ chối
  assert.equal(coODatQuaDoiTac({ id: "x", permissions: ["SALES"] }), true);
  assert.equal(coODatQuaDoiTac({ id: "x", permissions: ["SALES", "PARTNER"] }), false);
  assert.equal(duocGhiTay({ id: "x", permissions: ["ACCOUNTING"] }, { status: "confirmed", deliveredAt: null }), true);
});
