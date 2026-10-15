import assert from "node:assert/strict";
import { test } from "node:test";
import type { FeedbackTeamsResponse } from "./contracts.ts";
import { chuaAiNhan, duongHangDoi, hienNhanViec, nhomChuyenDuoc, nhomHangDoi, tabHoTro } from "./ve-ho-tro-hien-thi.ts";

const NHOM = [
  { id: "fbk-team-ky-thuat", code: "KY_THUAT", name: "Kỹ thuật", description: "", sensitive: false },
  { id: "fbk-team-ke-toan", code: "KE_TOAN", name: "Kế toán", description: "", sensitive: true },
];
const nguoiThuong: FeedbackTeamsResponse = { teams: NHOM, mine: [], isSuper: false };
const thanhVienKeToan: FeedbackTeamsResponse = { teams: NHOM, mine: [{ teamId: "fbk-team-ke-toan", role: "MEMBER" }], isSuper: false };
const toanQuyen: FeedbackTeamsResponse = { teams: NHOM, mine: [], isSuper: true };

test("tabHoTro: người thường chỉ «Yêu cầu của tôi»; thành viên thêm hàng đợi; Toàn quyền thêm quản lý nhóm", () => {
  assert.deepEqual(tabHoTro(nguoiThuong), ["mine"]);
  assert.deepEqual(tabHoTro(thanhVienKeToan), ["mine", "queue"]);
  assert.deepEqual(tabHoTro(toanQuyen), ["mine", "queue", "teams"]);
});

test("tabHoTro: thành viên của nhóm đã ngưng (không còn trong danh sách nhóm đang dùng) không có tab hàng đợi", () => {
  assert.deepEqual(tabHoTro({ teams: NHOM, mine: [{ teamId: "fbk-team-da-ngung", role: "LEAD" }], isSuper: false }), ["mine"]);
});

test("nhomHangDoi: thành viên chỉ thấy nhóm mình; Toàn quyền thấy mọi nhóm", () => {
  assert.deepEqual(nhomHangDoi(thanhVienKeToan), [{ id: "fbk-team-ke-toan", name: "Kế toán" }]);
  assert.deepEqual(nhomHangDoi(toanQuyen).map((x) => x.id), ["fbk-team-ky-thuat", "fbk-team-ke-toan"]);
  assert.deepEqual(nhomHangDoi(nguoiThuong), []);
});

test("chuaAiNhan / hienNhanViec: người giữ bị khoá coi như chưa ai nhận; người gửi không thấy nút nhận phiếu mình; phiếu đóng không nhận", () => {
  const p = { assigneeId: null, assigneeActive: false, submitterId: "a", status: "NEW" as const };
  assert.equal(chuaAiNhan(p), true);
  assert.equal(chuaAiNhan({ assigneeId: "x", assigneeActive: false }), true);
  assert.equal(chuaAiNhan({ assigneeId: "x", assigneeActive: true }), false);
  assert.equal(hienNhanViec(p, "b"), true);
  assert.equal(hienNhanViec(p, "a"), false, "người gửi");
  assert.equal(hienNhanViec({ ...p, status: "DONE" }, "b"), false);
  assert.equal(hienNhanViec({ ...p, status: "DECLINED" }, "b"), false);
  assert.equal(hienNhanViec({ ...p, assigneeId: "x", assigneeActive: true }, "b"), false);
});

test("duongHangDoi: không gửi status rỗng (máy chủ trả 400)", () => {
  assert.equal(duongHangDoi("fbk-team-ke-toan", "ALL", ""), "/api/feedback/queue?team=fbk-team-ke-toan&loc=ALL");
  assert.equal(duongHangDoi("fbk-team-ke-toan", "UNASSIGNED", "NEW"), "/api/feedback/queue?team=fbk-team-ke-toan&loc=UNASSIGNED&status=NEW");
});

test("nhomChuyenDuoc: bỏ nhóm đang giữ phiếu", () => {
  assert.deepEqual(nhomChuyenDuoc(toanQuyen, "fbk-team-ke-toan"), [{ id: "fbk-team-ky-thuat", name: "Kỹ thuật" }]);
});
