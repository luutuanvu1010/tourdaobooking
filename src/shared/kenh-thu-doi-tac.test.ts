// ADR-0178 Đ1 mục 2: luật thuần người thu hợp lệ của đơn mang dấu «Khách của đối tác trả cho Công ty» = Tắt (0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_KENH_THU_CHI_NGUOI_LAP, CAU_KENH_THU_CHUA_GAN_HO_SO, nguoiThuHopLeKenhTat } from "./kenh-thu-doi-tac.ts";

test("dấu Bật (1) hoặc không dấu (null): mọi người thu đều qua — cư xử như hôm nay", () => {
  for (const dauDon of [null, 1] as const) {
    for (const [lap, thu] of [["P1", "CONGTY"], [null, "P1"], ["P1", "P1"]] as const) {
      assert.deepEqual(nguoiThuHopLeKenhTat({ dauDon, nguoiLapPartyId: lap, collectorPartyId: thu }), { ok: true });
    }
  }
});

test("dấu Tắt (0): chỉ hồ sơ người lập; người khác ⇒ kenh_thu_chi_nguoi_lap; người lập chưa có hồ sơ ⇒ kenh_thu_chua_gan_ho_so", () => {
  assert.deepEqual(nguoiThuHopLeKenhTat({ dauDon: 0, nguoiLapPartyId: "P1", collectorPartyId: "P1" }), { ok: true });
  assert.deepEqual(nguoiThuHopLeKenhTat({ dauDon: 0, nguoiLapPartyId: "P1", collectorPartyId: "CONGTY" }), { ok: false, ma: "kenh_thu_chi_nguoi_lap", cau: CAU_KENH_THU_CHI_NGUOI_LAP });
  assert.deepEqual(nguoiThuHopLeKenhTat({ dauDon: 0, nguoiLapPartyId: null, collectorPartyId: "P1" }), { ok: false, ma: "kenh_thu_chua_gan_ho_so", cau: CAU_KENH_THU_CHUA_GAN_HO_SO });
  assert.equal(CAU_KENH_THU_CHI_NGUOI_LAP, "Đơn này chỉ nhận tiền khách trả cho đối tác đã lập đơn. Công ty không nhận tiền khách của đơn này.");
  assert.equal(CAU_KENH_THU_CHUA_GAN_HO_SO, "Tài khoản lập đơn chưa gắn hồ sơ nên chưa ghi được khoản thu. Nhờ văn phòng gắn hồ sơ.");
});

test("ADR-0225 Đ2: đơn mang dấu chỉ tiền mặt — phía Tour Đảo (Công ty, nhân viên) chỉ nhận tiền mặt; đối tác và quầy nhà cung cấp không đổi; đơn không dấu không xét", async () => {
  const { thuHoChiTienMat, CAU_CHI_TIEN_MAT } = await import("./kenh-thu-doi-tac.ts");
  for (const role of ["COMPANY", "STAFF"] as const) {
    assert.deepEqual(thuHoChiTienMat({ chiTienMat: true, collectorRole: role, method: "CASH", nguoiThuLaDoiTacLapDon: false }), { ok: true });
    for (const m of ["BANK_TRANSFER", "OTHER", "VIETQR"]) assert.deepEqual(thuHoChiTienMat({ chiTienMat: true, collectorRole: role, method: m, nguoiThuLaDoiTacLapDon: false }), { ok: false, ma: "don_doi_tac_chi_tien_mat", cau: CAU_CHI_TIEN_MAT }, `${role} ${m}`);
  }
  for (const role of ["BOOKER", "SUPPLIER"] as const) assert.deepEqual(thuHoChiTienMat({ chiTienMat: true, collectorRole: role, method: "BANK_TRANSFER", nguoiThuLaDoiTacLapDon: false }), { ok: true });
  assert.deepEqual(thuHoChiTienMat({ chiTienMat: false, collectorRole: "COMPANY", method: "BANK_TRANSFER", nguoiThuLaDoiTacLapDon: false }), { ok: true });
  // Đối tác không hưởng hoa hồng tự ghi «Tôi thu» (vai STAFF): tiền vào tay đối tác ⇒ qua. Công ty thì không bao giờ được miễn kiểu này.
  assert.deepEqual(thuHoChiTienMat({ chiTienMat: true, collectorRole: "STAFF", method: "BANK_TRANSFER", nguoiThuLaDoiTacLapDon: true }), { ok: true });
  assert.equal(thuHoChiTienMat({ chiTienMat: true, collectorRole: "COMPANY", method: "BANK_TRANSFER", nguoiThuLaDoiTacLapDon: true }).ok, false);
});
