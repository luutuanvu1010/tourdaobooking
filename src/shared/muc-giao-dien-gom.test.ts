import assert from "node:assert/strict";
import { test } from "node:test";
import { PERMISSION_CODES, type PermissionCode } from "./permissions.ts";
import { THANH_BEN, TRANG, coHien } from "./muc-giao-dien.ts";
import { traAnhEm } from "./muc-giao-dien-gom.ts";

const holder = (permissions: readonly string[]) => ({ id: "x", permissions: permissions as readonly PermissionCode[] });

test("Quản trị đứng ở /xe: ba trang Xe, Lịch xe bận, Giấy tờ sắp hết hạn; hienTai đúng", () => {
  const r = traAnhEm("/xe", holder(["ADMIN"]) as never);
  assert.deepEqual(r, [
    { nhan: "Xe", href: "/xe", hienTai: true },
    { nhan: "Lịch xe bận", href: "/lich-xe-ban", hienTai: false },
    { nhan: "Giấy tờ sắp hết hạn", href: "/giay-to-sap-het-han", hienTai: false },
  ]);
});

test("đứng ở /lich-xe-ban: hienTai ở mục thứ hai; trang mở từ Xe (/xe-chi-tiet) vẫn tính là Xe", () => {
  const r = traAnhEm("/lich-xe-ban", holder(["ADMIN"]) as never);
  assert.deepEqual(r.map((x) => x.hienTai), [false, true, false]);
  assert.deepEqual(traAnhEm("/xe-chi-tiet", holder(["ADMIN"]) as never).map((x) => x.hienTai), [true, false, false]);
});

test("không thuộc mục gộp nào, hoặc không có quyền quản lý xe: danh sách rỗng", () => {
  assert.deepEqual(traAnhEm("/xe", holder(["SALES"]) as never), []);
  assert.deepEqual(traAnhEm("/orders", holder(["ADMIN"]) as never), []);
});

test("MỌI tập quyền: chỉ trả trang người đó thấy, theo thứ tự gom, và đúng một mục hienTai khi đứng ở trang gom", () => {
  const bang: [string, string[]][] = [["/xe", ["xe", "lichXeBan", "sapHetHan"]], ["/bang-gia-xe", ["bangGiaXe", "bangKeXe"]], ["/bang-ke-xe", ["bangGiaXe", "bangKeXe"]]];
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const p = PERMISSION_CODES.filter((_, i) => m & (1 << i));
    for (const [duong, gom] of bang) {
      const r = traAnhEm(duong, holder(p) as never);
      const mong = gom.filter((k) => coHien({ trang: k as keyof typeof TRANG, nhan: "" }, { staff: holder(p) as never }));
      assert.deepEqual(r.map((x) => x.href), mong.map((k) => TRANG[k as keyof typeof TRANG].duong), `${p.join("+")} ở ${duong}`);
      assert.ok(r.filter((x) => x.hienTai).length <= 1);
    }
  }
});

test("MỌI khoá trong `gom` của THANH_BEN đều có nhãn tiếng Việt (không rơi về khoá trang bằng chữ Anh)", () => {
  const dayDu = holder(PERMISSION_CODES) as never;
  const khoaGom = THANH_BEN.flatMap((c) => ("gom" in c ? (c.gom as readonly (keyof typeof TRANG)[]) : []));
  assert.ok(khoaGom.length >= 5, "phải thấy các mục gộp");
  for (const k of khoaGom) {
    const dong = traAnhEm(TRANG[k].duong, dayDu).find((x) => x.href === TRANG[k].duong);
    assert.ok(dong, `${k}: người đủ quyền phải thấy trang này trong dải`);
    assert.notEqual(dong.nhan, k, `${k}: thiếu nhãn trong NHAN (đang hiện khoá trang bằng chữ Anh)`);
  }
});
