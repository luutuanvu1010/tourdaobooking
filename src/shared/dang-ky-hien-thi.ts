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
  // Nhóm tổ chức (ADR-0212 Đ5): chữ CHÉP tên đã có ở `pty_verification_attribute` / `pty_organization_document_type` (0103) — một khái niệm một tên.
  TEN_PHAP_LY: "Tên pháp lý",
  MA_SO_THUE: "Mã số thuế",
  DIA_CHI_TO_CHUC: "Địa chỉ tổ chức",
  EMAIL_HOA_DON: "Email nhận hoá đơn",
  GPKD: "Giấy chứng nhận đăng ký kinh doanh",
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

/** Câu báo lỗi của bốn route phiếu và route tải tệp cho người đăng ký (chữ AI viết, chờ chủ chọn — BANG-THAM-CHIEU «Câu báo lỗi của phiếu đăng ký»). */
export const CAU_PHIEU = {
  hetPhien: "Lần đăng nhập để điền phiếu đã hết hạn. Hãy đăng nhập lại bằng email để tiếp tục.",
  daDuyet: "Phiếu này đã được duyệt nên không sửa được nữa.",
  daKetThuc: "Phiếu này đã kết thúc nên không sửa được nữa.",
  khongSua: "Phiếu này đang chờ xử lý nên chưa sửa được.",
  loaiKhoa: "Phiếu đã gửi một lần nên không đổi vai người dùng được.",
  loaiDong: "Vai người dùng này hiện chưa nhận đăng ký.",
  chuaChinhSach: "Chưa có chính sách riêng tư nên chưa gửi được thông tin. Hãy quay lại sau.",
  chuaDongY: "Bạn cần đọc và đồng ý chính sách riêng tư hiện hành trước khi gửi.",
  doiChinhSach: "Chính sách riêng tư vừa được cập nhật. Hãy đọc lại rồi gửi.",
  doiTrangThai: "Phiếu vừa thay đổi. Hãy tải lại phiếu rồi làm tiếp.",
  // Phần tổ chức (ADR-0212 Đ2, Đ4; đợt 2 Task 5). Không câu nào nhắc lại mã số thuế, số GPKD hay điều đã khai.
  toChucDong: "Phần thông tin tổ chức hiện chưa nhận đăng ký.",
  loaiToChucDong: "Vai người dùng này của tổ chức hiện chưa nhận đăng ký.",
  canPhanToChuc: "Vai người dùng này cần phần thông tin tổ chức. Hãy khai thông tin tổ chức hoặc chọn vai người dùng khác.",
  taiXeKhongKemToChuc: "Tài xế đối tác đăng ký riêng, không kèm thông tin tổ chức.",
  chonVaiCaNhan: "Hãy chọn một vai người dùng cá nhân.", // brief viết «Hãy chọn một vai cá nhân»; bảng từ ADR-0130 cấm «vai» trơn — ruling 16/11,
  khongBoToChuc: "Phiếu đã gửi kèm thông tin tổ chức nên không bỏ phần này được.",
  thieuAnhGpkd: "Cần tải xong ảnh giấy chứng nhận đăng ký kinh doanh trước khi gửi.",
  // Task 5 vòng sửa 1 (ruling điều phối 16/11): vai của tổ chức khoá sau lần gửi đầu, nên phải chọn TRƯỚC lần gửi đầu.
  chonVaiToChuc: "Muốn khai thông tin tổ chức, bạn cần chọn vai người dùng của tổ chức trước lần gửi đầu. Phiếu đã gửi một lần mà chưa chọn thì không thêm phần tổ chức được nữa.",
  anhToChucKhongPhan: "Hãy gỡ ảnh giấy phép hoặc khai phần tổ chức.",
  // ADR-0233 (ô tệp theo vai). Chữ AI viết, chờ chủ chọn.
  oKhongThuocVai: "Ô tệp này không dùng cho vai người dùng đã chọn.",
  tepNgoaiPhieu: "Phiếu còn tệp ở ô không dùng cho vai người dùng đã chọn. Hãy gỡ tệp đó rồi gửi lại.",
  thieuTepBatBuoc: (nhan: string) => `Cần tải xong «${nhan}» trước khi gửi.`,
} as const;

/** Tên mục khi NÓI VỚI NGƯỜI ĐĂNG KÝ về điều còn thiếu (chữ AI viết, chờ chủ chọn — BANG-THAM-CHIEU «Tên mục của phiếu đăng ký (người đăng ký thấy)»). Khác `NHAN_MUC_XAC_MINH` viết cho người xác minh («Đã gọi số điện thoại đã khai» là việc của họ). */
export const NHAN_MUC_CHO_NGUOI_DANG_KY: Readonly<Record<string, string>> = {
  HO_TEN: "Họ tên",
  NGAY_SINH: "Ngày sinh",
  CCCD: "Căn cước công dân còn hạn",
  ROLE: "Vai người dùng xin đăng ký (của bạn hoặc của tổ chức)", // ADR-0212 Đ4: đạt khi có vai cá nhân hoặc vai của tổ chức
  CALLED: "Số điện thoại",
};
export const nhanMucChoNguoiDangKy = (ma: string): string => NHAN_MUC_CHO_NGUOI_DANG_KY[ma] ?? ma;
