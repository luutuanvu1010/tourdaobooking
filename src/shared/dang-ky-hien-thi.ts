// Chữ của bước xác minh phiếu đăng ký đối tác, dùng chung máy chủ ↔ giao diện (ADR-0207 Đ3; ADR-0210 Đ1). Thuần.
// Chín mã lý do là danh sách ĐÓNG: máy chủ chỉ nhận mã, không nhận chữ tự do. Bảy mã dùng lại nhãn của phiếu tự khai (bỏ «hồ sơ đã gộp»); hai mã mới.
// Câu cho NGƯỜI ĐĂNG KÝ nhìn thấy: văn bản chủ đã duyệt «chữ theo khuyến nghị» (docs/superpowers/specs/2026-11-15-dang-ky-dot-1-luot-a/PHU-LUC.md). Câu của mã TRUNG_HO_SO_KHAC cố ý
// không nói «đã có tài khoản» để người lạ không dò được ai đang là đối tác.
import { LY_DO_TU_CHOI } from "./xac-minh-hien-thi.ts";

export const LY_DO_PHIEU = {
  KHONG_DOC_DUOC: { nhan: LY_DO_TU_CHOI.KHONG_DOC_DUOC, nguoiDangKy: "Ảnh hoặc thông tin không đọc được. Vui lòng gửi lại bản rõ hơn." },
  KHONG_KHOP_GIAY_TO: { nhan: LY_DO_TU_CHOI.KHONG_KHOP_GIAY_TO, nguoiDangKy: "Thông tin khai không khớp với giấy tờ." },
  GIAY_TO_HET_HAN: { nhan: LY_DO_TU_CHOI.GIAY_TO_HET_HAN, nguoiDangKy: "Giấy tờ đã hết hạn." },
  SAI_LOAI_GIAY_TO: { nhan: LY_DO_TU_CHOI.SAI_LOAI_GIAY_TO, nguoiDangKy: "Giấy tờ gửi không đúng loại được yêu cầu." },
  TRUNG_HO_SO_KHAC: { nhan: LY_DO_TU_CHOI.TRUNG_HO_SO_KHAC, nguoiDangKy: "Thông tin này đã có trong hệ thống. Vui lòng liên hệ Tour Đảo." },
  KHONG_PHAI_CHINH_CHU: { nhan: LY_DO_TU_CHOI.KHONG_PHAI_CHINH_CHU, nguoiDangKy: "Giấy tờ không phải của người đăng ký." },
  CHUA_DOI_CHIEU_DUOC: { nhan: LY_DO_TU_CHOI.CHUA_DOI_CHIEU_DUOC, nguoiDangKy: "Chưa đối chiếu được giấy tờ. Vui lòng liên hệ Tour Đảo." },
  KHONG_LIEN_LAC_DUOC: { nhan: "Không liên lạc được số điện thoại đã khai", nguoiDangKy: "Không liên lạc được số điện thoại đã khai." },
  KHONG_THUOC_DIEN: { nhan: "Không thuộc diện đối tác của công ty", nguoiDangKy: "Đăng ký không thuộc diện đối tác của Tour Đảo." },
} as const;
export type MaLyDoPhieu = keyof typeof LY_DO_PHIEU;
export const MA_LY_DO_PHIEU = Object.keys(LY_DO_PHIEU) as MaLyDoPhieu[];
export const laMaLyDoPhieu = (v: unknown): v is MaLyDoPhieu => typeof v === "string" && Object.hasOwn(LY_DO_PHIEU, v);
/** Nhãn cho người xác minh. Mã lạ ⇒ «Lý do khác». */
export const nhanLyDoPhieu = (c: string): string => (laMaLyDoPhieu(c) ? LY_DO_PHIEU[c].nhan : "Lý do khác");
/** Câu cho người đăng ký (trang trạng thái, thư). Mã lạ ⇒ rỗng: không bịa câu. */
export const cauLyDoChoNguoiDangKy = (c: string | null): string | null => (c !== null && laMaLyDoPhieu(c) ? LY_DO_PHIEU[c].nguoiDangKy : null);

/** Nhãn của các mục xác minh (mã mục ở dk_item_result.item_code). ROLE, CALLED: mục chỉ phiếu cần (chính sách đăng ký); còn lại: mục bắt buộc của hồ sơ (parties). */
export const NHAN_MUC_XAC_MINH: Readonly<Record<string, string>> = {
  HO_TEN: "Họ tên",
  NGAY_SINH: "Ngày sinh",
  CCCD: "Căn cước công dân",
  ROLE: "Vai người dùng xin đăng ký",
  CALLED: "Đã gọi số điện thoại đã khai",
};
export const nhanMucXacMinh = (ma: string): string => NHAN_MUC_XAC_MINH[ma] ?? ma;

/** Trạng thái của phiếu người đăng ký thấy (PHU-LUC lượt A, cột khuyến nghị; chủ duyệt «chữ theo khuyến nghị» 15/11). Khoá = trạng thái của `dk_registration.status`. */
export const NHAN_TRANG_THAI_PHIEU = {
  DANG_DIEN: "Đang điền",
  CHO_XAC_MINH: "Đang chờ xác minh",
  CAN_BO_SUNG: "Cần bổ sung",
  CHO_DUYET: "Đang chờ duyệt",
  DA_DUYET: "Đã duyệt",
  TU_CHOI: "Bị từ chối",
  DA_RUT: "Đã rút",
  HET_HAN: "Hết hạn",
} as const;
export type TrangThaiPhieuDangKy = keyof typeof NHAN_TRANG_THAI_PHIEU;
export const nhanTrangThaiPhieu = (t: string): string => (Object.hasOwn(NHAN_TRANG_THAI_PHIEU, t) ? NHAN_TRANG_THAI_PHIEU[t as TrangThaiPhieuDangKy] : "Không rõ");

/** Câu báo lỗi của bốn route phiếu cho người đăng ký (chữ AI viết, chờ chủ chọn — BANG-THAM-CHIEU «Câu báo lỗi của phiếu đăng ký»). */
export const CAU_PHIEU = {
  hetPhien: "Lần đăng nhập để điền phiếu đã hết hạn. Hãy đăng nhập lại bằng email để tiếp tục.",
  daDuyet: "Phiếu này đã được duyệt nên không sửa được nữa.",
  daKetThuc: "Phiếu này đã kết thúc nên không sửa được nữa.",
  khongSua: "Phiếu này đang chờ xử lý nên chưa sửa được.",
  loaiKhoa: "Phiếu đã gửi một lần nên không đổi loại đối tác được.",
  loaiDong: "Loại đối tác này hiện chưa nhận đăng ký.",
  chuaChinhSach: "Chưa có chính sách riêng tư nên chưa gửi được thông tin. Hãy quay lại sau.",
  chuaDongY: "Bạn cần đọc và đồng ý chính sách riêng tư hiện hành trước khi gửi.",
  doiChinhSach: "Chính sách riêng tư vừa được cập nhật. Hãy đọc lại rồi gửi.",
  doiTrangThai: "Phiếu vừa thay đổi. Hãy tải lại phiếu rồi làm tiếp.",
} as const;
