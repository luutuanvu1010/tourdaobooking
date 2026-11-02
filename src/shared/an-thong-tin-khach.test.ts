// ADR-0154 Đ2.2, C2 — luật thuần «công tắc ẩn thông tin khách có áp cho tài khoản này không» (kế hoạch lượt 2 Task 2.1).
// Chỉ tài khoản giữ quyền Đối tác VÀ không giữ quyền nào ngoài nhóm bên ngoài (`EXTERNAL_PERMISSIONS`) mới bị áp; tài khoản lai (Bán hàng + Đối tác, …) thì không:
// vẫn nhập thông tin khách, đơn không mang dấu miễn danh sách (luật dự phòng của chủ ở C2, an toàn hơn và đảo được).
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, type PermissionCode } from "./permissions.ts";
import { apCongTacAnKhach } from "./an-thong-tin-khach.ts";

const nguoi = (...permissions: PermissionCode[]) => ({ permissions });

test("bảng ca: PARTNER đúng; PARTNER + DRIVER_PARTNER đúng; còn lại sai", () => {
  assert.equal(apCongTacAnKhach(nguoi("PARTNER")), true);
  assert.equal(apCongTacAnKhach(nguoi("PARTNER", "DRIVER_PARTNER")), true);
  assert.equal(apCongTacAnKhach(nguoi("SALES", "PARTNER")), false, "tài khoản lai Bán hàng + Đối tác");
  assert.equal(apCongTacAnKhach(nguoi("SALES")), false);
  assert.equal(apCongTacAnKhach(nguoi("DRIVER_PARTNER")), false, "tài xế đối tác không giữ quyền Đối tác");
  assert.equal(apCongTacAnKhach(nguoi()), false);
  for (const p of PERMISSION_CODES) {
    if (p === "PARTNER" || p === "DRIVER_PARTNER") continue;
    assert.equal(apCongTacAnKhach(nguoi("PARTNER", p)), false, `PARTNER + ${p}: có quyền nội bộ ⇒ không áp`);
  }
});

test("mọi tổ hợp quyền: đúng ⇔ có PARTNER và mọi quyền đều thuộc nhóm bên ngoài (hai nửa của vế điều kiện đều có người canh)", () => {
  const ngoai = new Set<PermissionCode>(["PARTNER", "DRIVER_PARTNER"]);
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const ds = PERMISSION_CODES.filter((_p, i) => (mask & (1 << i)) !== 0);
    const mong = ds.includes("PARTNER") && ds.every((p) => ngoai.has(p));
    assert.equal(apCongTacAnKhach(nguoi(...ds)), mong, ds.join("+") || "(rỗng)");
  }
});
