import assert from "node:assert/strict";
import { test } from "node:test";
import { PERMISSION_CODES, type PermissionCode } from "./shared/permissions.ts";
import { THANH_BEN, demMucHienSan, gomNhomGap, thanhBen, type MucThanhBen } from "./shared/muc-giao-dien.ts";

const holder = (permissions: readonly PermissionCode[]) => ({ id: "x", permissions });
const nhan = (k: ReturnType<typeof gomNhomGap>[number]): string => ("muc" in k ? k.nhomGap.nhan : k.nhan);
const khoi = (p: readonly PermissionCode[], nhom: string) =>
  gomNhomGap(thanhBen({ staff: holder(p) }, "/").find((g) => g.nhom === nhom)!.muc);

test("Toàn quyền: khối thanh bên theo thứ tự, Điều phối gập hai mục, đúng 10 khối hiện sẵn", () => {
  const p = ["ADMIN", "SUPER_ADMIN"] as const;
  assert.deepEqual(khoi(p, "HẰNG NGÀY").map(nhan), ["Trang chủ", "Đơn hàng", "Danh bạ"]);
  const vc = khoi(p, "VẬN CHUYỂN");
  assert.deepEqual(vc.map(nhan), ["Điều phối", "Xe đang chạy", "Xe & giấy tờ", "Giá & chi phí"]);
  const dp = vc[0]!;
  assert.ok("muc" in dp);
  assert.deepEqual((dp as { muc: MucThanhBen[] }).muc.map((m) => m.nhan), ["Điều phối xe", "Đề nghị chuyển khách"]);
  assert.deepEqual(khoi(p, "TIỀN").map(nhan), ["Điều chỉnh công nợ", "Sổ công nợ & khoá sổ"]);
  assert.equal(demMucHienSan(thanhBen({ staff: holder(p) }, "/")), 10);
});

// Kế toán chỉ thấy "Điều phối xe" trong nhóm Điều phối (không thấy Đề nghị chuyển khách) ⇒ mục phẳng, không khối gập.
test("Kế toán: Điều phối xe đứng phẳng, không có khối gập nào", () => {
  const vc = khoi(["ACCOUNTING"], "VẬN CHUYỂN");
  assert.equal(nhan(vc[0]!), "Điều phối xe");
  assert.ok(vc.every((k) => !("muc" in k)));
});

test("thanh bên không còn dòng nổi bật và không còn mục Tạo đơn", () => {
  for (const c of THANH_BEN) assert.ok(!("noiBat" in c), c.nhan);
  assert.ok(!THANH_BEN.some((c) => c.trang === "taoDon"));
});

// Tập có quyền tài xế bị bỏ: "Cuốc của tôi" + "Báo bận" cộng với bộ văn phòng cho 11 khối (tổ hợp không phải vai thật; DRIVER_PARTNER phải đứng một mình).
test("MỌI tập quyền không kèm quyền tài xế: số khối hiện sẵn không quá 10", () => {
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const p = PERMISSION_CODES.filter((_, i) => m & (1 << i));
    if (p.some((x) => x.startsWith("DRIVER"))) continue;
    assert.ok(demMucHienSan(thanhBen({ staff: holder(p) }, "/")) <= 10, p.join("+"));
  }
});
