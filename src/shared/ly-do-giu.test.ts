// "Giữ" (Hiến chương 5.7; ADR-0049 D2): chuyến không đạt điều kiện thì ở PLANNED, hiện LÝ DO + AI XỬ LÝ. Kiểu `LyDoGiu` và bộ mã là CHỖ SỐNG DUY NHẤT của
// khái niệm này (K9) — máy chủ và màn hình cùng dùng; không lưu cột "giữ", tính lại mỗi lần đọc.
import { test } from "node:test";
import assert from "node:assert/strict";
import { AI_XU_LY, MA_GIU, NHAN_AI_XU_LY, NUT_CAP_NHAT_KHACH, isMaGiu, lyDoGiu } from "./ly-do-giu.ts";

test("mỗi mã giữ có câu tiếng Việt (không lộ mã kỹ thuật) và đúng một 'ai xử lý' thuộc tập đóng", () => {
  assert.deepEqual([...AI_XU_LY], ["VAN_PHONG", "QUAN_TRI", "TOAN_QUYEN"]);
  for (const a of AI_XU_LY) assert.ok(NHAN_AI_XU_LY[a].trim().length > 0);
  const ma = Object.keys(MA_GIU);
  assert.ok(ma.length >= 25, `bộ mã giữ phải đủ các luật của lượt 1, thấy ${ma.length}`);
  for (const [k, v] of Object.entries(MA_GIU)) {
    assert.match(k, /^[A-Z][A-Z0-9_]+$/, k);
    assert.ok(v.loiNhan.trim().length > 0, `${k}: thiếu câu`);
    assert.doesNotMatch(v.loiNhan, /\b[A-Z]{2,}_[A-Z_]+\b/, `${k}: câu không được lộ mã kỹ thuật`);
    assert.ok((AI_XU_LY as readonly string[]).includes(v.aiXuLy), `${k}: aiXuLy lạ ${v.aiXuLy}`);
  }
});

test("ai xử lý đúng vai: giấy tờ → Quản trị; chính sách / bảng hạng bằng / hợp đồng → Toàn quyền; xếp, tên, chặng → văn phòng; phá lệ → Quản trị", () => {
  const ai = (m: keyof typeof MA_GIU) => MA_GIU[m].aiXuLy;
  for (const m of ["GPLX_THIEU", "GPLX_THIEU_HANG", "GPLX_HET_HAN", "DIEU_KIEN_GIAY_TO_XE", "DIEU_KIEN_GIAY_TO_TAI_XE"] as const) assert.equal(ai(m), "QUAN_TRI", m);
  for (const m of ["CHINH_SACH_RONG", "KHONG_CO_HANG_BANG", "HOP_DONG"] as const) assert.equal(ai(m), "TOAN_QUYEN", m);
  for (const m of ["THIEU_TEN", "THIEU_SUAT", "THUA_SUAT", "CHUA_CO_TAI_XE", "CHUA_CO_NOI_TRA", "CHUA_CO_GIO", "DON_DA_HUY", "CHANG_DA_DONG", "VUOT_SO_CHO"] as const) {
    assert.equal(ai(m), "VAN_PHONG", m);
  }
  for (const m of ["MOC_TOI_THIEU", "KHOANG_NGHI", "NGHI_THIEU"] as const) assert.equal(ai(m), "QUAN_TRI", m);
});

test("ADR-0056 VK3-A (Đợt 7, C9): CAM_KET — trái cam kết xe riêng / số chỗ → Quản trị phá lệ; THIEU_GIA của Đợt 4 vẫn giữ (Quản trị)", () => {
  assert.deepEqual({ ...MA_GIU.CAM_KET }, { loiNhan: "Trái cam kết xe riêng / số chỗ tối thiểu", aiXuLy: "QUAN_TRI" });
  assert.deepEqual(lyDoGiu("CAM_KET", "ĐH-1024 xe riêng"), { ma: "CAM_KET", loiNhan: "Trái cam kết xe riêng / số chỗ tối thiểu: ĐH-1024 xe riêng", aiXuLy: "QUAN_TRI" });
  assert.equal(MA_GIU.THIEU_GIA.aiXuLy, "QUAN_TRI");
  assert.ok(isMaGiu("CAM_KET") && isMaGiu("THIEU_GIA"));
});

test("lyDoGiu(ma, chiTiet): dựng đúng khoá; chi tiết nối vào câu; mã lạ bị isMaGiu từ chối", () => {
  assert.deepEqual(lyDoGiu("THIEU_TEN"), { ma: "THIEU_TEN", loiNhan: MA_GIU.THIEU_TEN.loiNhan, aiXuLy: "VAN_PHONG" });
  const r = lyDoGiu("THIEU_TEN", "ĐH-1024 thiếu 2");
  assert.equal(r.loiNhan, `${MA_GIU.THIEU_TEN.loiNhan}: ĐH-1024 thiếu 2`);
  assert.deepEqual(Object.keys(r).sort(), ["aiXuLy", "loiNhan", "ma"]);
  assert.equal(isMaGiu("THIEU_TEN"), true);
  for (const bad of ["thieu_ten", "KHONG_CO_MA_NAY", "", null]) assert.equal(isMaGiu(bad), false, String(bad));
});

test("ADR-0050 VK1-B: NOI_HEN_DOI — nơi đón / trả đổi sau khi xếp → văn phòng xử lý (bấm 'cập nhật điểm theo đơn'); câu không lộ mã", () => {
  assert.deepEqual({ ...MA_GIU.NOI_HEN_DOI }, { loiNhan: "Nơi đón / trả đã đổi sau khi xếp — cập nhật điểm", aiXuLy: "VAN_PHONG" });
  assert.deepEqual(lyDoGiu("NOI_HEN_DOI", "ĐH-1024"), { ma: "NOI_HEN_DOI", loiNhan: "Nơi đón / trả đã đổi sau khi xếp — cập nhật điểm: ĐH-1024", aiXuLy: "VAN_PHONG" });
});

test("R-P29 (chủ lần 16): KHACH_DA_DOI — khách trong xe không còn trong đơn → văn phòng bấm nút 'Cập nhật khách theo đơn' (chữ nút DÙNG CHUNG); câu không lộ mã", () => {
  assert.equal(NUT_CAP_NHAT_KHACH, "Cập nhật khách theo đơn");
  assert.deepEqual({ ...MA_GIU.KHACH_DA_DOI }, { loiNhan: "Khách trong xe không còn trong đơn — bấm Cập nhật khách theo đơn", aiXuLy: "VAN_PHONG" });
  assert.deepEqual(lyDoGiu("KHACH_DA_DOI", "ĐH-1024"), { ma: "KHACH_DA_DOI", loiNhan: "Khách trong xe không còn trong đơn — bấm Cập nhật khách theo đơn: ĐH-1024", aiXuLy: "VAN_PHONG" });
});
