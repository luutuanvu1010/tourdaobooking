// Bài của chính hằng câu khoá vé (Q-07, Task 3.2 Đợt 3): chỉ bài này so nguyên câu; bài route khẳng định MÃ lỗi và cờ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_CHO_CONG_TY_XAC_NHAN, CAU_CHO_DOI_TAC_NOP, CAU_CHUA_THU_DU, CAU_DOI_TAC_CHO_NOP, cauKhoaVe } from "./ve-cau-khoa.ts";
import { CAU_VE_QUA_HAN_TRA_SAU, CAU_VE_QUA_HAN_TRA_SAU_DOI_TAC } from "./tra-sau.ts";

const co = (x: Partial<Parameters<typeof cauKhoaVe>[0]> = {}) => ({ traSauQuaHan: false, nguoiXemLaDoiTac: false, choDoiTacNop: false, nguoiLapCamTien: false, ...x });

test("chữ của các hằng: phiếu B-2 phương án (2) cho đối tác đang chờ nộp; ba câu cũ giữ nguyên", () => {
  assert.equal(CAU_DOI_TAC_CHO_NOP, "Vé mở sau khi Công ty ghi nhận bạn đã nộp tiền.");
  assert.equal(CAU_CHO_CONG_TY_XAC_NHAN, "Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé.");
  assert.equal(CAU_CHO_DOI_TAC_NOP, "Đang chờ đối tác nộp tiền về công ty nên chưa xem hoặc gửi được vé.");
  assert.equal(CAU_CHUA_THU_DU, "Đơn chưa thu đủ tiền nên chưa xem hoặc gửi được vé.");
});

test("đối tác là người lập, còn số chờ nộp: câu mới", () => {
  assert.equal(cauKhoaVe(co({ nguoiXemLaDoiTac: true, choDoiTacNop: true, nguoiLapCamTien: true })), CAU_DOI_TAC_CHO_NOP);
});

test("đối tác, tiền chờ Công ty xác nhận (không có số chờ nộp của mình): câu cũ «Công ty chưa xác nhận…»", () => {
  assert.equal(cauKhoaVe(co({ nguoiXemLaDoiTac: true, choDoiTacNop: true })), CAU_CHO_CONG_TY_XAC_NHAN);
});

test("nhân viên văn phòng: câu chờ đối tác nộp, dù cờ người lập cầm tiền có bật nhầm", () => {
  assert.equal(cauKhoaVe(co({ choDoiTacNop: true })), CAU_CHO_DOI_TAC_NOP);
  assert.equal(cauKhoaVe(co({ choDoiTacNop: true, nguoiLapCamTien: true })), CAU_CHO_DOI_TAC_NOP);
});

test("khách còn thiếu tiền thật: «chưa thu đủ» cho mọi người xem", () => {
  assert.equal(cauKhoaVe(co()), CAU_CHUA_THU_DU);
  assert.equal(cauKhoaVe(co({ nguoiXemLaDoiTac: true, nguoiLapCamTien: true })), CAU_CHUA_THU_DU);
});

test("Trả sau quá hạn đứng trước mọi câu khác", () => {
  assert.equal(cauKhoaVe(co({ traSauQuaHan: true, nguoiXemLaDoiTac: true, choDoiTacNop: true, nguoiLapCamTien: true })), CAU_VE_QUA_HAN_TRA_SAU_DOI_TAC);
  assert.equal(cauKhoaVe(co({ traSauQuaHan: true })), CAU_VE_QUA_HAN_TRA_SAU);
});
