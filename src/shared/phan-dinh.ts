// Luật thuần và chữ của "Phân định trách nhiệm" (ADR-0116 thi hành ADR-0088 đ9; TNV-G3) — dùng chung máy chủ ↔ web/. Không I/O.
// Con số tiền chỉ do máy chủ tính; ở đây là bảng trường hợp, hạn, chữ.

export const MA_TRUONG_HOP = ["T4", "T6", "T7", "T8", "T9", "T10", "T11"] as const;
export type MaTruongHop = (typeof MA_TRUONG_HOP)[number];
export const laMaTruongHop = (x: unknown): x is MaTruongHop => typeof x === "string" && (MA_TRUONG_HOP as readonly string[]).includes(x);

/** Bảng ADR-0088 đ9 (chủ duyệt 2/10). T1, T2, T3, T5 đã có đường sẵn nên không có ở đây. `benChiu`: "cong_ty" ⇒ bên chịu là công ty chủ, không dòng nợ. */
export const TRUONG_HOP: Record<MaTruongHop, { nhan: string; benChiu: "ho_so" | "cong_ty"; tienRaDuoc: boolean; goiY: string }> = {
  T4: { nhan: "Ghi nhầm làm sổ báo đủ, không đòi lại được khách", benChiu: "ho_so", tienRaDuoc: false, goiY: "Người ghi nhầm" },
  T6: { nhan: "Bồi thường khách do lỗi nhân viên", benChiu: "ho_so", tienRaDuoc: true, goiY: "Nhân viên gây lỗi" },
  T7: { nhan: "Bồi thường do lỗi xe, nhà xe", benChiu: "ho_so", tienRaDuoc: true, goiY: "Nhà xe" },
  T8: { nhan: "Bồi thường do lỗi nhà cung cấp", benChiu: "ho_so", tienRaDuoc: true, goiY: "Nhà cung cấp" },
  T9: { nhan: "Bồi thường do đối tác, đại lý", benChiu: "ho_so", tienRaDuoc: true, goiY: "Đối tác, đại lý" },
  T10: { nhan: "Bất khả kháng", benChiu: "cong_ty", tienRaDuoc: true, goiY: "Công ty" },
  T11: { nhan: "Chưa xác định được ai gây ra", benChiu: "cong_ty", tienRaDuoc: true, goiY: "Công ty tạm chịu" },
};

export const LY_DO_PHAN_DINH_TOI_THIEU = 10;
/** ADR-0088 đ9 QT4: T11 quá 7 ngày chỉ hiện đỏ, không tự gán ai. */
export const HAN_T11_NGAY = 7;
/** ADR-0116 đ6: chỉ nhắc (danh sách, ô đếm), không chặn, không đẩy tin. */
export const NHAC_CHUA_XU_LY_NGAY = 60;
/** ADR-0088 đ9 QT3. Không chặn phản hồi muộn (đặc tả mục 1.8). */
export const NGAY_LAM_VIEC_PHAN_HOI = 3;

const MOT_NGAY = 86_400_000;
export const quaHanT11 = (phanDinhLuc: string, bayGio: string): boolean => Date.parse(bayGio) - Date.parse(phanDinhLuc) > HAN_T11_NGAY * MOT_NGAY;
/** `ngayGiao`, `homNay` = ngày dân sự YYYY-MM-DD. */
export const quaHanNhac = (ngayGiao: string, homNay: string): boolean => (Date.parse(`${homNay}T00:00:00Z`) - Date.parse(`${ngayGiao}T00:00:00Z`)) / MOT_NGAY > NHAC_CHUA_XU_LY_NGAY;

/** Cộng `n` ngày làm việc (thứ Hai – thứ Sáu; CHƯA tính ngày lễ — hạn này chỉ để nhắc, không chặn). */
export function congNgayLamViec(ngay: string, n: number): string {
  const d = new Date(`${ngay}T00:00:00Z`);
  for (let con = n; con > 0;) {
    d.setUTCDate(d.getUTCDate() + 1);
    const t = d.getUTCDay();
    if (t !== 0 && t !== 6) con--;
  }
  return d.toISOString().slice(0, 10);
}

export const CAU_MAN_HINH = "Khi khách cần được hoàn hoặc bồi thường sau khi đơn đã giao: một người mở đề nghị, Quản trị hoặc Toàn quyền phân định ai chịu, rồi Kế toán ghi vào sổ trong một lần. Người ghi phải khác người phân định.";
export const NHAN_TRANG_THAI_PHIEU = { cho_phan_dinh: "Chờ phân định", cho_ghi: "Chờ ghi sổ", da_ghi: "Đã ghi sổ", da_dao: "Đã huỷ khoản" } as const;
export type TrangThaiPhieu = keyof typeof NHAN_TRANG_THAI_PHIEU;
export const TONG_TRANG_THAI_PHIEU: Record<TrangThaiPhieu, "cat" | "bien" | "la" | "xam"> = { cho_phan_dinh: "cat", cho_ghi: "bien", da_ghi: "la", da_dao: "xam" };

/** Câu chặn `refund_after_delivered` (ADR-0116 đ7) — đổi đuôi, chỉ tới đúng màn. */
export const CAU_HOAN_SAU_GIAO = "Đơn đã ở bước Đã giao — hoàn cho khách cần phân định trách nhiệm trước: mở màn «Phân định trách nhiệm».";
