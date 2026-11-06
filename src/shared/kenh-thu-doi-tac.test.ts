// ADR-0178 Đ1 mục 3: luật thuần người thu hợp lệ của đơn mang dấu «Khách của đối tác trả cho Công ty» = Tắt (0).
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
