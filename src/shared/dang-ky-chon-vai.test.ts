// Ô chọn vai ở màn duyệt (ADR-0212 Đ3, PF2; vòng sửa 1 Task 2): loại của phiếu đã tắt ⇒ không nhảy sang mục đầu, không gửi mã thay thế khi chưa chọn rõ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAU_LOAI_DA_TAT, canhBaoDoiVai, cauNguoiXacMinh, maDuyetGui, trangThaiChonVai, tuDuyetBiChan } from "./dang-ky-chon-vai.ts";
import { cauBuocKhac } from "./dang-ky-giao-dien.ts";

// Hai chỗ lệch nhỏ giữa giao diện và máy chủ (rà 18/11/2026):
// (1) người mở màn duyệt chính là người đã xác minh ⇒ máy chủ (trigger dk_decision_guard) từ chối trừ Toàn quyền — nút Duyệt phải khoá theo đúng luật đó, không để bấm rồi mới báo lỗi;
// (2) phiếu ở bước của người khác ⇒ câu nói phiếu đang chờ ai, thay câu chung «không thuộc việc của bạn».
test("người xác minh mở màn duyệt: nút Duyệt khoá, trừ Toàn quyền (cùng điều kiện với cờ của máy chủ)", () => {
  assert.equal(tuDuyetBiChan(true, false), true, "người xác minh không phải Toàn quyền ⇒ khoá");
  assert.equal(tuDuyetBiChan(true, true), false, "Toàn quyền duyệt được phiếu mình xác minh (ghi dấu)");
  assert.equal(tuDuyetBiChan(false, false), false, "người khác ⇒ không khoá vì lý do này");
  assert.match(cauNguoiXacMinh(false), /người khác/);
  assert.doesNotMatch(cauNguoiXacMinh(false), /trừ Toàn quyền/, "không nói ngoại lệ với người không dùng được nó");
  assert.match(cauNguoiXacMinh(true), /ghi dấu/);
  const nd = readFileSync(new URL("../../web/dang-ky-hang-cho.ts", import.meta.url), "utf8");
  assert.ok(nd.includes("const laToanQuyen = can(staff, \"admin.manage.superadmin\")"), "hỏi bảng quyền đúng ô máy chủ dùng cho cờ Toàn quyền");
  assert.ok(nd.includes("tuDuyetBiChan(!!d.nguoiXacMinhLaBan, laToanQuyen)"), "nút Duyệt khoá theo luật thuần");
  assert.ok(nd.includes("cauNguoiXacMinh(laToanQuyen)"), "câu nhắc theo đúng người đang xem");
});

test("phiếu ở bước của người khác: câu nói phiếu đang chờ ai", () => {
  assert.equal(cauBuocKhac("CAN_BO_SUNG"), "Phiếu đang chờ người đăng ký bổ sung thông tin.");
  assert.equal(cauBuocKhac("CHO_DUYET"), "Phiếu đã xác minh xong, đang chờ người duyệt mở tài khoản.");
  assert.equal(cauBuocKhac("CHO_XAC_MINH"), "Phiếu đang chờ người xác minh.");
  assert.equal(cauBuocKhac("DA_DUYET"), "Phiếu đã được duyệt, đang chờ người đăng ký tự đặt mã PIN.");
  assert.equal(cauBuocKhac("LA"), "Bước này không thuộc việc của bạn.", "trạng thái lạ ⇒ câu chung");
  const nd = readFileSync(new URL("../../web/dang-ky-hang-cho.ts", import.meta.url), "utf8");
  assert.ok(nd.includes("cauBuocKhac(p.trangThai)"), "khung chi tiết dùng câu theo trạng thái");
  assert.ok(!nd.includes("\"Bước này không thuộc việc của bạn.\""), "không còn câu chung viết thẳng trong trang");
});

const DS = [{ ma: "TRAVEL_AGENCY", ten: "Công ty lữ hành" }, { ma: "LD_X", ten: "Loại X" }];

test("loại của phiếu còn trong danh sách ⇒ chọn sẵn đúng loại đó; không cảnh báo đổi loại", () => {
  assert.deepEqual(trangThaiChonVai("LD_X", DS), { conDung: true, giaTriDau: "LD_X" });
  assert.equal(canhBaoDoiVai("LD_X", "LD_X"), false);
  assert.equal(maDuyetGui("LD_X"), "LD_X");
});

test("loại của phiếu đã tắt ⇒ chưa chọn («»), không gửi được mã nào; chọn loại khác thì cảnh báo đổi loại và gửi đúng mã đã chọn", () => {
  const t = trangThaiChonVai("LD_DA_TAT", DS);
  assert.deepEqual(t, { conDung: false, giaTriDau: "" });
  assert.equal(maDuyetGui(t.giaTriDau), null, "không thay mã âm thầm bằng mục đầu danh sách");
  assert.equal(canhBaoDoiVai(t.giaTriDau, "LD_DA_TAT"), false, "chưa chọn thì chưa cảnh báo");
  assert.equal(canhBaoDoiVai("TRAVEL_AGENCY", "LD_DA_TAT"), true);
  assert.equal(maDuyetGui("TRAVEL_AGENCY"), "TRAVEL_AGENCY");
  assert.equal(trangThaiChonVai("LD_X", []).giaTriDau, "", "danh sách rỗng ⇒ chưa chọn");
});

test("màn duyệt dùng đúng luật thuần: mục trống khoá, câu «đã tắt» hiện, nút Duyệt khoá tới khi chọn, hộp cảnh báo dựng theo giá trị lúc dựng", () => {
  const nd = readFileSync(new URL("../../web/dang-ky-hang-cho.ts", import.meta.url), "utf8");
  assert.ok(nd.includes("trangThaiChonVai(d.loai"), "dựng ô theo trangThaiChonVai");
  assert.ok(/disabled: true, selected: true/.test(nd), "mục trống bị khoá và chọn sẵn");
  assert.ok(nd.includes("CAU_LOAI_DA_TAT") && nd.includes("hidden: conDung"), "câu «đã tắt» hiện khi loại không còn");
  assert.ok(nd.includes("nutDuyet.disabled = tuDuyet || maDuyetGui(vai.value) === null"), "nút Duyệt khoá khi chưa chọn, hoặc khi người mở chính là người xác minh");
  assert.ok(nd.includes("hidden: !canhBaoDoiVai(vai.value, d.loai)"), "cảnh báo đúng ngay lúc dựng");
  assert.ok(nd.includes("body: { roleCode: ma,"), "gửi mã đã kiểm, không gửi vai.value thô");
  assert.equal(CAU_LOAI_DA_TAT, "Vai người dùng này đã tắt. Hãy chọn vai người dùng khác hoặc từ chối phiếu.");
});
