import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { THANH_BEN, TRANG } from "./shared/muc-giao-dien.ts";

// M-1 (nợ Task 2): trang Giấy tờ sắp hết hạn cập nhật huy hiệu ở thanh bên sau khi đổi mốc. Huy hiệu ấy nay nằm ở MỤC GỘP chứa trang này, không còn ở
// liên kết riêng /giay-to-sap-het-han — selector phải trỏ đúng liên kết của mục gộp (đọc từ bảng THANH_BEN, không chép tay).
test("trang giấy tờ sắp hết hạn tìm huy hiệu ở liên kết của mục thanh bên gộp nó", () => {
  const muc = THANH_BEN.find((c) => "gom" in c && (c.gom as readonly string[]).includes("sapHetHan"));
  assert.ok(muc, "không còn mục thanh bên nào gom sapHetHan");
  const src = readFileSync(new URL("../web/giay-to-sap-het-han.ts", import.meta.url), "utf8");
  assert.ok(src.includes(`#sidebar a[href="${TRANG[muc.trang].duong}"] .sidebar-item-badge`), "selector huy hiệu không trỏ vào liên kết của mục gộp");
  assert.ok(!src.includes(`a[href="${TRANG.sapHetHan.duong}"]`), "còn selector cũ trỏ vào liên kết riêng của trang (thanh bên không còn liên kết này)");
  assert.notEqual(TRANG[muc.trang].duong, TRANG.sapHetHan.duong);
});
