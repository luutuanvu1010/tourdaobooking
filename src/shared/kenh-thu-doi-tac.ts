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
