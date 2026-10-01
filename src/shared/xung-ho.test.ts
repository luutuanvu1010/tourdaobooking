// ADR-0084 Đ2, Đ3, Đ5: luật thuần xưng hô của trợ lý Mai + dòng nối lời nhắc + thay {ten} trong câu chào + kiểm giá trị giới tính.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_CHAO_MAC_DINH, DONG_DINH_DANG, dongMai, gioiTinhHopLe, kiemGioiTinh, thayTen, xungHo } from "./xung-ho.ts";

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

test("Đ5 + Đ2 (phán quyết điều phối 1/10): thayTen thay MỌI {ten} và {xung}; đầu câu viết hoa chữ đầu; câu không có chỗ thay giữ nguyên văn", () => {
  assert.equal(
    thayTen(CAU_CHAO_MAC_DINH, xungHo("Vũ", "NAM")),
    "Chào anh Vũ, em là Mai — trợ lý của Tour Đảo. Anh Vũ cần hỏi gì về cách dùng app cứ hỏi em nhé!",
  );
  // Đ2: chưa ghi giới tính ⇒ gọi "bạn", xưng "mình" — câu chào cũng vậy (không "Chào bạn, em là Mai").
  assert.equal(
    thayTen(CAU_CHAO_MAC_DINH, xungHo("Vũ", null)),
    "Chào bạn, mình là Mai — trợ lý của Tour Đảo. Bạn cần hỏi gì về cách dùng app cứ hỏi mình nhé!",
  );
  assert.equal(thayTen("{ten} ơi, chào nhé", xungHo("Lan", "NU")), "Chị Lan ơi, chào nhé");
  assert.equal(thayTen("Xin chào. {xung} là Mai.", xungHo(null, null)), "Xin chào. Mình là Mai.");
  assert.equal(thayTen("Chào bạn! Hỏi mình nhé.", xungHo("Vũ", "NAM")), "Chào bạn! Hỏi mình nhé.");
});

test("Đ5 (phán quyết điều phối 1/10): câu chào mặc định có {ten} và {xung}", () => {
  assert.equal(CAU_CHAO_MAC_DINH, "Chào {ten}, {xung} là Mai — trợ lý của Tour Đảo. {ten} cần hỏi gì về cách dùng app cứ hỏi {xung} nhé!");
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

test("Dòng định dạng do máy chủ nối (yêu cầu chủ 2026-10-01): đúng văn bản, một dòng, thay mọi câu cấm dấu sao của lời nhắc tự lưu", () => {
  assert.equal(
    DONG_DINH_DANG,
    "Định dạng: in đậm tên nút, mục menu, màn hình và đường điều hướng bằng cặp ** (ví dụ **Danh bạ › Hồ sơ mới**); ngoài cặp ** không dùng định dạng nào khác; dòng Nguồn không in đậm. Luật này thay mọi câu cấm dấu sao ở trên.",
  );
  assert.ok(!DONG_DINH_DANG.includes("\n"));
});
