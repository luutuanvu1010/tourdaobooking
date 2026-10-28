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

// Tài xế công ty kiêm văn phòng là tổ hợp có chủ đích: "Cuốc của tôi" + "Báo bận" cộng bộ văn phòng ⇒ 11 khối (có từ trước, ghi nợ nhật ký). Chỉ DRIVER_PARTNER phải đứng một mình.
// Đặc tả §5.4 chỉ cố định 10 cho Toàn quyền; mọi tập không kèm quyền tài xế ≤ 10, tập kèm ≤ 11.
test("MỌI tập quyền: số khối hiện sẵn ≤ 10 (không quyền tài xế) hoặc ≤ 11 (có quyền tài xế)", () => {
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const p = PERMISSION_CODES.filter((_, i) => m & (1 << i));
    const tran = p.some((x) => x.startsWith("DRIVER")) ? 11 : 10;
    assert.ok(demMucHienSan(thanhBen({ staff: holder(p) }, "/")) <= tran, p.join("+"));
  }
});
