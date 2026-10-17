// Nhãn tiếng Việt dùng chung máy chủ + giao diện cho phiếu yêu cầu xoá (ADR-0126; lát H-5 Gói 2, việc 2). Thuần.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_CAN_CU_GIU_LAI, LY_DO_TU_CHOI_XOA, nhanLyDoXoaAnh, nhanTrangThaiPhieuXoa, PHAN_GIU_LAI } from "./xoa-an-danh-hien-thi.ts";

const CO_DAU = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const CHU_ANH = /\b(the|and|of|session|order|log|ip|pin|user|agent|cancel(led)?|pending|done|rejected|withdrawn)\b/i;

function kiemNhan(nhan: string, ma: string): void {
  assert.ok(CO_DAU.test(nhan), `${ma}: nhãn phải là tiếng Việt có dấu — "${nhan}"`);
  assert.ok(!CHU_ANH.test(nhan), `${ma}: lộ chữ Anh — "${nhan}"`);
  assert.ok(!/[A-Z0-9]+_[A-Z0-9_]+/.test(nhan), `${ma}: lộ mã thô — "${nhan}"`);
}

test("mọi mã phần giữ lại có nhãn tiếng Việt có dấu, không chữ Anh, mã duy nhất, khuôn mã hợp CHECK retained_codes", () => {
  assert.ok(PHAN_GIU_LAI.length >= 11);
  assert.equal(new Set(PHAN_GIU_LAI.map((x) => x.ma)).size, PHAN_GIU_LAI.length);
  for (const { ma, nhan } of PHAN_GIU_LAI) {
    assert.match(ma, /^[A-Z0-9_]+$/);
    kiemNhan(nhan, ma);
  }
  const ma = PHAN_GIU_LAI.map((x) => x.ma);
  for (const m of ["DON_BAN_CHUP", "HANH_KHACH", "LAN_THU", "SO_TIEN", "YEU_CAU_HOA_DON", "HO_TEN_NHAT_KY", "NHAT_KY_CU_SDT", "PHIEN_DA_BO_IP", "CHU_TU_DO", "TEN_HO_SO", "SDT_DANG_NHAP"]) {
    assert.ok(ma.includes(m), m);
  }
});

test("nhãn HANH_KHACH nói rõ chưa luật sư xác nhận; câu căn cứ cố định đúng chữ ADR", () => {
  const nhan = PHAN_GIU_LAI.find((x) => x.ma === "HANH_KHACH")!.nhan;
  assert.match(nhan, /chưa luật sư xác nhận/);
  assert.equal(CAU_CAN_CU_GIU_LAI, "Căn cứ giữ lại: chưa được luật sư hay kế toán xác nhận.");
});

test("lý do từ chối phiếu xoá: danh sách đóng hai mã, nhãn tiếng Việt", () => {
  assert.deepEqual(LY_DO_TU_CHOI_XOA.map((x) => x.ma), ["CAN_GIU_THEO_LUAT", "NGUOI_DUNG_HUY_QUA_KENH_KHAC"]);
  assert.equal(LY_DO_TU_CHOI_XOA[0]!.nhan, "Dữ liệu đang phải giữ theo quy định pháp luật");
  assert.equal(LY_DO_TU_CHOI_XOA[1]!.nhan, "Người dùng đã báo huỷ yêu cầu qua kênh khác");
  for (const { ma, nhan } of LY_DO_TU_CHOI_XOA) kiemNhan(nhan, ma);
});

test("nhãn trạng thái phiếu xoá phủ đủ bốn trạng thái; mã lạ không lộ mã thô", () => {
  assert.equal(nhanTrangThaiPhieuXoa("CHO_XU_LY"), "Chờ xử lý");
  assert.equal(nhanTrangThaiPhieuXoa("DA_THUC_HIEN"), "Đã thực hiện");
  assert.equal(nhanTrangThaiPhieuXoa("TU_CHOI"), "Đã từ chối");
  assert.equal(nhanTrangThaiPhieuXoa("RUT"), "Đã rút");
  const la = nhanTrangThaiPhieuXoa("MO_LAI");
  assert.ok(!la.includes("MO_LAI") && CO_DAU.test(la));
});

test("nhãn lý do ảnh hết giữ: đủ bảy mã, mã lạ không lộ mã thô", () => {
  for (const m of ["HET_HAN", "DA_GIA_HAN", "DA_HUY", "DA_AN_DANH", "HET_QUAN_HE", "PHIEU_DA_XU_LY", "KHONG_NOI"]) {
    const nhan = nhanLyDoXoaAnh(m);
    kiemNhan(nhan, m);
    assert.ok(!nhan.includes(m));
  }
  const la = nhanLyDoXoaAnh("GI_DO");
  assert.ok(!la.includes("GI_DO") && CO_DAU.test(la));
});
