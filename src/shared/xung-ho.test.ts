// ADR-0084 Đ2, Đ3, Đ5: luật thuần xưng hô của trợ lý Mai + dòng nối lời nhắc + thay {ten} trong câu chào + kiểm giá trị giới tính.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_CHAO_MAC_DINH, dongMai, gioiTinhHopLe, kiemGioiTinh, thayTen, xungHo } from "./xung-ho.ts";

test("Đ2: NAM → anh {tên} / em; NU → chị {tên} / em", () => {
  assert.deepEqual(xungHo("Vũ", "NAM"), { goi: "anh Vũ", xung: "em" });
  assert.deepEqual(xungHo("Lan", "NU"), { goi: "chị Lan", xung: "em" });
});

test("Đ2: chưa ghi giới tính, giá trị lạ, hoặc thiếu tên → bạn / mình", () => {
  for (const [ten, gt] of [["Vũ", null], ["Vũ", undefined], ["Vũ", ""], ["Vũ", "nam"], ["Vũ", "KHAC"], [null, "NAM"], ["", "NU"], ["   ", "NAM"], [undefined, undefined]] as const) {
    assert.deepEqual(xungHo(ten, gt), { goi: "bạn", xung: "mình" }, `${String(ten)} / ${String(gt)}`);
  }
});

test("Đ2: cắt khoảng trắng hai đầu, gộp khoảng trắng giữa, bỏ ký tự điều khiển — tên luôn nằm trên MỘT dòng", () => {
  assert.deepEqual(xungHo("  Vũ  ", "NAM"), { goi: "anh Vũ", xung: "em" });
  assert.deepEqual(xungHo("Minh\n Anh", "NU"), { goi: "chị Minh Anh", xung: "em" });
  assert.deepEqual(xungHo("A\u0000‮B", "NAM"), { goi: "anh A B", xung: "em" });
});

test("Đ3: dòng do máy chủ nối — đúng văn bản ADR, một dòng", () => {
  assert.equal(dongMai({ goi: "anh Vũ", xung: "em" }), "Tên bạn là Mai, trợ lý của Tour Đảo. Người đang hỏi: gọi là 'anh Vũ', xưng 'em'.");
  assert.equal(dongMai(xungHo(null, null)), "Tên bạn là Mai, trợ lý của Tour Đảo. Người đang hỏi: gọi là 'bạn', xưng 'mình'.");
  assert.ok(!dongMai(xungHo("A\nB", "NAM")).includes("\n"));
});

test("Đ5: thayTen thay MỌI {ten}; đầu câu viết hoa chữ đầu; câu không có {ten} giữ nguyên văn", () => {
  assert.equal(
    thayTen(CAU_CHAO_MAC_DINH, "anh Vũ"),
    "Chào anh Vũ, em là Mai — trợ lý của Tour Đảo. Anh Vũ cần hỏi gì về cách dùng app cứ hỏi em nhé!",
  );
  assert.equal(thayTen(CAU_CHAO_MAC_DINH, "bạn"), "Chào bạn, em là Mai — trợ lý của Tour Đảo. Bạn cần hỏi gì về cách dùng app cứ hỏi em nhé!");
  assert.equal(thayTen("{ten} ơi, chào nhé", "chị Lan"), "Chị Lan ơi, chào nhé");
  assert.equal(thayTen("Chào bạn! Hỏi mình nhé.", "anh Vũ"), "Chào bạn! Hỏi mình nhé.");
});

test("Đ5: câu chào mặc định đúng văn bản ADR", () => {
  assert.equal(CAU_CHAO_MAC_DINH, "Chào {ten}, em là Mai — trợ lý của Tour Đảo. {ten} cần hỏi gì về cách dùng app cứ hỏi em nhé!");
});

test("Đ1: gioiTinhHopLe — chỉ NAM / NU; còn lại NULL", () => {
  assert.equal(gioiTinhHopLe("NAM"), "NAM");
  assert.equal(gioiTinhHopLe("NU"), "NU");
  for (const x of [null, undefined, "", "KHAC", "nam", 1]) assert.equal(gioiTinhHopLe(x), null);
});

test("Đ1: kiemGioiTinh — vắng = giữ nguyên; null/'' = xoá; NAM/NU nhận; còn lại lỗi lời thường", () => {
  assert.deepEqual(kiemGioiTinh(undefined), { ok: true, value: undefined });
  assert.deepEqual(kiemGioiTinh(null), { ok: true, value: null });
  assert.deepEqual(kiemGioiTinh(""), { ok: true, value: null });
  assert.deepEqual(kiemGioiTinh("NAM"), { ok: true, value: "NAM" });
  assert.deepEqual(kiemGioiTinh("NU"), { ok: true, value: "NU" });
  for (const x of ["nam", "Nữ", "KHAC", 1, true, {}]) {
    const r = kiemGioiTinh(x);
    assert.equal(r.ok, false, String(x));
    if (!r.ok) assert.equal(r.message, "Giới tính chỉ nhận Nam, Nữ hoặc để trống.");
  }
});
