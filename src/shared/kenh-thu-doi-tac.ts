// Luật thuần «Khách của đối tác trả cho Công ty» (ADR-0178 Đ1 mục 2): ở đơn mang dấu Tắt (0), người thu của mọi khoản khách trả mới chỉ được là hồ sơ của
// tài khoản Đối tác đã lập đơn. Dấu Bật (1) hoặc không dấu (null — đơn văn phòng lập) ⇒ không xét gì thêm. Dùng chung máy chủ (cổng billing) và giao diện.
// Lớp CSDL cùng luật: trigger `bil_receipt_partner_channel` (migration 0144).

export const CAU_KENH_THU_CHI_NGUOI_LAP = "Đơn này chỉ nhận tiền khách trả cho đối tác đã lập đơn. Công ty không nhận tiền khách của đơn này.";
export const CAU_KENH_THU_CHUA_GAN_HO_SO = "Tài khoản lập đơn chưa gắn hồ sơ nên chưa ghi được khoản thu. Nhờ văn phòng gắn hồ sơ.";

export type KetQuaNguoiThuKenh = { ok: true } | { ok: false; ma: "kenh_thu_chi_nguoi_lap" | "kenh_thu_chua_gan_ho_so"; cau: string };

export function nguoiThuHopLeKenhTat(i: { dauDon: 0 | 1 | null; nguoiLapPartyId: string | null; collectorPartyId: string }): KetQuaNguoiThuKenh {
  if (i.dauDon !== 0) return { ok: true };
  if (i.nguoiLapPartyId === null) return { ok: false, ma: "kenh_thu_chua_gan_ho_so", cau: CAU_KENH_THU_CHUA_GAN_HO_SO };
  if (i.collectorPartyId !== i.nguoiLapPartyId) return { ok: false, ma: "kenh_thu_chi_nguoi_lap", cau: CAU_KENH_THU_CHI_NGUOI_LAP };
  return { ok: true };
}

// ---- ADR-0225 Đ2 (Việc 5 (b2), đề xuất): «đơn đối tác chỉ thu hộ tiền mặt» ----
// Dấu `partner_cash_only` chụp lúc xác nhận (migration 0184): 1 = đơn đối tác. Ở đơn mang dấu 1, khoản khách trả MỚI mà người thu là phía Tour Đảo (Công ty, nhân viên / HDV)
// chỉ được là tiền mặt. Khách trả thẳng đối tác (BOOKER) và tại quầy nhà cung cấp (SUPPLIER) không đổi. Lớp CSDL cùng luật: trigger `bil_receipt_partner_cash_only` (0184).

export const CAU_CHI_TIEN_MAT = "Đơn của đối tác chỉ nhận khoản thu hộ bằng tiền mặt. Công ty không nhận chuyển khoản cho đơn này.";

export type KetQuaChiTienMat = { ok: true } | { ok: false; ma: "don_doi_tac_chi_tien_mat"; cau: string };

/** `nguoiThuLaDoiTacLapDon`: người thu là hồ sơ của TÀI KHOẢN ĐỐI TÁC đã lập đơn (đối tác không hưởng hoa hồng ghi «Tôi thu» mang vai STAFF) — tiền vào tay đối tác, không vào Tour Đảo. */
export function thuHoChiTienMat(i: { chiTienMat: boolean; collectorRole: "COMPANY" | "STAFF" | "BOOKER" | "SUPPLIER"; method: string; nguoiThuLaDoiTacLapDon: boolean }): KetQuaChiTienMat {
  if (!i.chiTienMat) return { ok: true };
  if (i.collectorRole !== "COMPANY" && i.collectorRole !== "STAFF") return { ok: true };
  if (i.collectorRole === "STAFF" && i.nguoiThuLaDoiTacLapDon) return { ok: true };
  if (i.method === "CASH") return { ok: true };
  return { ok: false, ma: "don_doi_tac_chi_tien_mat", cau: CAU_CHI_TIEN_MAT };
}
