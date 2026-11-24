// «Cấp sẽ áp» khi duyệt phiếu đăng ký (ADR-0209 Đ3, Đ4; đợt 1 Task 12 — mục I-1 của bài kiểm Task 11). Thuần, dùng chung máy chủ ↔ giao diện.
// Máy chủ (pricing) tính kết quả và lý do; giao diện chỉ in câu. Tên cấp CHỈ đi kèm khi người xem giữ `partner.commission.view` (Nhân sự không thấy tên cấp — ADR-0209 Đ4).
// Ba câu đầu là chữ nguyên văn của ADR-0209 Đ3; câu VAI_KHONG_HUONG và VUA_DOI do AI viết (BANG-THAM-CHIEU, chờ chủ chọn).

/** Vì sao lô duyệt KHÔNG ghi cấp riêng (câu 8 chèn 0 dòng). Thứ tự xét ở máy chủ: CHUA_DAT → VAI_KHONG_HUONG → CAP_TAT → DA_CO_CAP_RIENG; VUA_DOI chỉ ở kết quả lệnh duyệt. */
export type LyDoKhongApCap = "CHUA_DAT" | "VAI_KHONG_HUONG" | "CAP_TAT" | "DA_CO_CAP_RIENG" | "VUA_DOI";

export const CAU_KHONG_AP_CAP: Readonly<Record<LyDoKhongApCap, string>> = {
  CHUA_DAT: "Loại này chưa đặt cấp.",
  CAP_TAT: "Cấp mặc định đang tắt.",
  DA_CO_CAP_RIENG: "Hồ sơ đã có cấp riêng.",
  VAI_KHONG_HUONG: "Loại này không còn được hưởng hoa hồng.",
  VUA_DOI: "Cấp mặc định vừa đổi lúc duyệt nên chưa ghi cấp riêng.",
};

/** Câu cho người duyệt khi chọn vai trò khác loại người đăng ký xin (ADR-0209 Đ4, nguyên văn). */
export const CAU_DOI_VAI_CAP = "Cấp hoa hồng sẽ theo chính sách của vai trò mới.";

/**
 * «Cấp sẽ áp» (xem trước) hoặc «cấp đã áp» (kết quả lệnh duyệt). `ap` = có / đã ghi cấp riêng. `cap` = tên cấp, null khi không áp HOẶC người xem không giữ `partner.commission.view`.
 * `lyDo` / `cau` chỉ có khi `ap` sai; câu không mang tên cấp nên ai xem cũng được.
 */
export interface KetQuaCapDto {
  ap: boolean;
  cap: { code: string; ten: string } | null;
  lyDo: LyDoKhongApCap | null;
  cau: string | null;
}

/** Dựng DTO cho MỘT người xem: `xemTen` = người xem giữ `partner.commission.view`. */
export function ketQuaCapChoNguoiXem(k: { cap: { code: string; ten: string } | null; lyDo: LyDoKhongApCap | null }, xemTen: boolean): KetQuaCapDto {
  if (k.lyDo !== null || k.cap === null) {
    const lyDo = k.lyDo ?? "CHUA_DAT";
    return { ap: false, cap: null, lyDo, cau: CAU_KHONG_AP_CAP[lyDo] };
  }
  return { ap: true, cap: xemTen ? k.cap : null, lyDo: null, cau: null };
}
