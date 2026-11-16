// Ô chọn vai ở màn duyệt (ADR-0212 Đ3, PF2; vòng sửa 1 Task 2): loại của phiếu đã tắt ⇒ không nhảy sang mục đầu, không gửi mã thay thế khi chưa chọn rõ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAU_LOAI_DA_TAT, canhBaoDoiVai, maDuyetGui, trangThaiChonVai } from "./dang-ky-chon-vai.ts";

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
  assert.ok(nd.includes("nutDuyet.disabled = maDuyetGui(vai.value) === null"), "nút Duyệt khoá khi chưa chọn");
  assert.ok(nd.includes("hidden: !canhBaoDoiVai(vai.value, d.loai)"), "cảnh báo đúng ngay lúc dựng");
  assert.ok(nd.includes("body: { roleCode: ma,"), "gửi mã đã kiểm, không gửi vai.value thô");
  assert.equal(CAU_LOAI_DA_TAT, "Loại đối tác này đã tắt. Hãy chọn loại khác hoặc từ chối phiếu.");
});
