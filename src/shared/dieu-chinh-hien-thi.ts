// Chữ và thứ tự hiển thị của màn "Điều chỉnh công nợ" (web/dieu-chinh-cong-no.ts; ADR-0115 đợt 1). Thuần, có bài kiểm: trang không tự viết câu nào về
// trạng thái / hạn. Mọi luật (hạn 7 ngày, trần, người duyệt ≠ người tạo) ở MÁY CHỦ; ở đây chỉ chữ.
import type { TrangThaiYeuCauDieuChinh, YeuCauDieuChinhDto } from "./contracts.ts";

export const NHAN_TRANG_THAI: Record<TrangThaiYeuCauDieuChinh, string> = {
  cho_duyet: "Chờ duyệt",
  da_duyet: "Đã duyệt",
  tu_choi: "Bị từ chối",
  da_rut: "Đã rút",
  het_han: "Hết hạn",
};
/** Màu chip theo trạng thái (lớp badge sẵn có của Nền tảng). */
export const LOP_TRANG_THAI: Record<TrangThaiYeuCauDieuChinh, string> = {
  cho_duyet: "badge badge-draft",
  da_duyet: "badge badge-confirmed",
  tu_choi: "badge badge-cancelled",
  da_rut: "badge",
  het_han: "badge",
};
export const LOAI_DONG_CHON: readonly { ma: "HELD" | "SETTLEMENT" | "REFUND"; nhan: string }[] = [
  { ma: "HELD", nhan: "Tiền đang giữ hộ" },
  { ma: "SETTLEMENT", nhan: "Quyết toán (nộp / trả)" },
  { ma: "REFUND", nhan: "Hoàn khách" },
];
export const CAU_RONG_CHO_DUYET = "Không có yêu cầu nào đang chờ bạn duyệt.";
export const CAU_RONG_CUA_TOI = "Bạn chưa gửi yêu cầu nào.";
export const CAU_GIAI_THICH =
  "Điều chỉnh công nợ chỉ có hiệu lực khi một người KHÁC người gửi duyệt. Yêu cầu chưa ai quyết sau 7 ngày sẽ hết hạn (không tự duyệt). Số dư chỉ đổi ở lúc duyệt.";
export const CAU_LY_DO_TU_CHOI = "Lý do từ chối (bắt buộc)";

export const huongNhan = (h: YeuCauDieuChinhDto["huong"]): string => (h === "tang" ? "Tăng nợ" : "Giảm nợ");

/** «bên A nợ bên B 100.000 ₫» — `tien` đã định dạng ở trình duyệt (trang không cộng trừ). */
export const cauNoiDung = (y: Pick<YeuCauDieuChinhDto, "benNo" | "benDuocNo">, tien: string): string => `${y.benNo} nợ ${y.benDuocNo} ${tien}`;

/** Dòng phụ của một yêu cầu: trạng thái chờ → hạn; đã quyết → ai quyết (+ lý do từ chối). */
export function dongPhu(y: YeuCauDieuChinhDto, hanText: string): string {
  switch (y.trangThai) {
    case "cho_duyet": return `Gửi bởi ${y.nguoiTao} · hạn duyệt ${hanText}`;
    case "da_duyet": return `Gửi bởi ${y.nguoiTao} · ${y.nguoiQuyet ?? "—"} đã duyệt`;
    case "tu_choi": return `Gửi bởi ${y.nguoiTao} · ${y.nguoiQuyet ?? "—"} từ chối${y.lyDoQuyet ? `: ${y.lyDoQuyet}` : ""}`;
    case "da_rut": return `${y.nguoiTao} đã rút`;
    case "het_han": return `Gửi bởi ${y.nguoiTao} · quá hạn duyệt (${hanText})`;
  }
}

/** Khối «Chờ duyệt» chỉ gồm yêu cầu còn chờ (kể cả của chính mình để người đó thấy; nút duyệt do `coTheDuyet` quyết). Mới gửi trước. */
export const choDuyetTruoc = (ds: readonly YeuCauDieuChinhDto[]): YeuCauDieuChinhDto[] =>
  ds.filter((y) => y.trangThai === "cho_duyet").sort((a, b) => (a.taoLuc < b.taoLuc ? 1 : a.taoLuc > b.taoLuc ? -1 : 0));
/** Khối «Yêu cầu của tôi»: mọi trạng thái, mới trước. */
export const cuaToiTruoc = (ds: readonly YeuCauDieuChinhDto[]): YeuCauDieuChinhDto[] =>
  ds.filter((y) => y.laCuaToi).sort((a, b) => (a.taoLuc < b.taoLuc ? 1 : a.taoLuc > b.taoLuc ? -1 : 0));
