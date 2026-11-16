// Luật nối vai đăng ký với phần của phiếu (ADR-0212 Đ2). THUẦN, dùng chung máy chủ và giao diện. Danh sách vai là DỮ LIỆU (`pty_role_type`, Đ1) — tệp này KHÔNG liệt kê loại do Kế toán thêm;
// nó chỉ nói vai CÓ MÃ nào đứng ở phần nào và điều kiện nào còn thiếu. Toàn quyền không mở được vai mà điều kiện chưa đủ.

/** Biểu mẫu đã có phần khai tổ chức và «gửi thay» được chưa (ADR-0212 Đ4; Task 13 bật). Hôm nay chưa. */
export const DA_CO_THAY_MAT_TO_CHUC = false;
/** Biểu mẫu đã có ô bằng lái và hạng (ADR-0212 Đ8) chưa. Hôm nay chưa. */
export const CO_O_BANG_LAI = false;

export type PhanCuaVai = "CA_NHAN" | "CHI_TO_CHUC" | "CA_NHAN_HOAC_TO_CHUC";

/** Vai đứng ở phần nào của phiếu: Công ty lữ hành chỉ ở tổ chức; loại do Kế toán thêm (cờ loại đối tác) ở cá nhân hoặc tổ chức; còn lại cá nhân. */
export function phanCuaVai(ma: string, laLoaiDoiTac: boolean): PhanCuaVai {
  if (ma === "TRAVEL_AGENCY") return "CHI_TO_CHUC";
  return laLoaiDoiTac ? "CA_NHAN_HOAC_TO_CHUC" : "CA_NHAN";
}

export interface DieuKienMoVai {
  /** Phiếu có phần khai tổ chức (`DA_CO_THAY_MAT_TO_CHUC`). */
  coThayMatToChuc: boolean;
  /** Chính sách riêng tư đang hiệu lực đã nêu việc thu thập thông tin của tổ chức. */
  chinhSachCoToChuc: boolean;
  /** Biểu mẫu có ô bằng lái và hạng (`CO_O_BANG_LAI`). */
  coOBangLai: boolean;
}

/** Câu nói VAI CHƯA MỞ ĐƯỢC vì thiếu gì; `null` nếu mở được. Mã vai lạ (loại do Kế toán thêm, vai cá nhân thường) ⇒ null. */
export function lyDoChuaMoDuoc(ma: string, dk: DieuKienMoVai): string | null {
  if (ma === "TRAVEL_AGENCY") {
    const thieu: string[] = [];
    if (!dk.coThayMatToChuc) thieu.push("phiếu đăng ký chưa có phần khai tổ chức");
    if (!dk.chinhSachCoToChuc) thieu.push("chính sách riêng tư chưa nêu việc thu thập thông tin của tổ chức");
    return thieu.length ? `Chưa mở được cho Công ty lữ hành: ${thieu.join("; ")}.` : null;
  }
  if (ma === "DRIVER_EXTERNAL") {
    return dk.coOBangLai ? null : "Chưa mở được cho Tài xế đối tác: biểu mẫu chưa có ô bằng lái và hạng, và người xác minh chưa chọn được nhà xe của người lái.";
  }
  return null;
}
