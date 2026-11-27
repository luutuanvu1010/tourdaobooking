// Menu Thiết lập nhiều tầng (đặc tả docs/superpowers/specs/2026-11-26-menu-thiet-lap-nhieu-tang.md, chủ duyệt 26/11/2026 «Duyệt cả ba»).
// Thiết lập chia sáu nhóm con theo chủ đề; nhóm con một mục hiện phẳng; tổng ≤ 5 mục thì không chia. Thanh bên máy tính và trang Thiết lập điện thoại cùng hỏi `khoiThietLap`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PERMISSION_CODES, type PermissionCode } from "./shared/permissions.ts";
import { THANH_BEN, khoiThietLap, thanhBen, type KhoiThanhBen } from "./shared/muc-giao-dien.ts";

const holder = (permissions: readonly PermissionCode[]) => ({ id: "x", permissions });
const thietLap = (p: readonly PermissionCode[]) => thanhBen({ staff: holder(p) }, "/").find((g) => g.nhom === "THIẾT LẬP")!.muc;
const tom = (k: KhoiThanhBen): string => ("muc" in k ? `${k.nhomGap.nhan}:${k.muc.length}` : k.nhan);

const DV = "Dịch vụ & giá bán", DT = "Đối tác & hoa hồng", VE = "Vé", VC = "Danh mục vận chuyển", TK = "Tài khoản & an toàn", HT = "Hệ thống";

test("Toàn quyền: sáu nhóm con đúng thứ tự và đúng số mục", () => {
  assert.deepEqual(khoiThietLap(thietLap(["ADMIN", "SUPER_ADMIN"])).map(tom), [`${DV}:5`, `${DT}:6`, `${VE}:3`, `${VC}:4`, `${TK}:4`, `${HT}:3`]);
  assert.deepEqual(khoiThietLap(thietLap(["SUPER_ADMIN"])).map(tom), [`${DV}:5`, `${DT}:6`, `${VE}:3`, `${VC}:4`, `${TK}:4`, `${HT}:3`]);
});

test("Quản trị: năm nhóm con, không có nhóm Hệ thống", () => {
  assert.deepEqual(khoiThietLap(thietLap(["ADMIN"])).map(tom), [`${DV}:5`, `${DT}:5`, `${VE}:2`, `${VC}:4`, `${TK}:2`]);
});

test("Kế toán: ba nhóm con, đủ tám mục như cũ", () => {
  assert.deepEqual(khoiThietLap(thietLap(["ACCOUNTING"])).map(tom), [`${DV}:2`, `${DT}:4`, `${VE}:2`]);
});

test("Nhân sự, Bán hàng: tổng ≤ 5 mục nên hiện phẳng, không tiêu đề nhóm", () => {
  for (const p of [["HR"], ["SALES"]] as const) assert.ok(khoiThietLap(thietLap(p)).every((k) => !("muc" in k)), p.join("+"));
});

test("mọi dòng Thiết lập có nhóm con; mỗi nhóm con là MỘT đoạn liền (nhóm không bị chẻ)", () => {
  const dong = THANH_BEN.filter((c) => c.nhom === "THIẾT LẬP");
  assert.ok(dong.every((c) => "nhomGap" in c && c.nhomGap), "dòng Thiết lập thiếu nhomGap");
  const thuTu = dong.map((c) => (c as { nhomGap: { ma: string } }).nhomGap.ma).filter((m, i, a) => m !== a[i - 1]);
  assert.equal(new Set(thuTu).size, thuTu.length, `nhóm con bị chẻ: ${thuTu.join(" ")}`);
});

test("MỌI tập quyền: khối Thiết lập giữ đủ mục (không mất, không thêm, đúng thứ tự)", () => {
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const muc = thietLap(PERMISSION_CODES.filter((_, i) => m & (1 << i)));
    const phang = khoiThietLap(muc).flatMap((k) => ("muc" in k ? k.muc : [k]));
    assert.deepEqual(phang.map((x) => x.trang), muc.map((x) => x.trang));
  }
});

test("thanh bên máy tính và trang Thiết lập điện thoại cùng vẽ theo khoiThietLap", () => {
  for (const tep of ["web/shell.ts", "web/thiet-lap.ts"]) assert.match(readFileSync(tep, "utf8"), /khoiThietLap\(/, tep);
});
