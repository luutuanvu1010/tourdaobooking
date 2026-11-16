// Chữ của trang công khai «Đăng ký làm đối tác» và của hàng chờ phiếu đăng ký (đợt 1 Task 12). Thuần, chỉ dữ liệu.
// Chữ chủ đã duyệt «theo khuyến nghị» (docs/superpowers/specs/2026-11-15-dang-ky-dot-1-luot-a/PHU-LUC.md): tên nút của người đăng ký, ba nút kết thúc xác minh, nút của Nhân sự,
// «Chưa kích hoạt», câu đóng đăng ký, lối vào ở màn Đăng nhập. Chữ còn lại do AI viết, chờ chủ chọn (BANG-THAM-CHIEU — khái niệm «Chữ của trang đăng ký đối tác»).

/** PHU-LUC lượt A, «Câu khi đang đóng đăng ký» (nguyên văn). Cùng câu với 409 `registration_closed` của bước nhập mã. */
export const CAU_DONG_DANG_KY = "Tour Đảo tạm ngừng nhận đăng ký mới.";
/** PHU-LUC lượt A, «Lối vào ở màn Đăng nhập». */
export const LOI_VAO_DANG_KY = "Đăng ký làm đối tác";

/** Hai ô ảnh của phiếu cá nhân (khoá = `O_TEP_PHIEU` của máy chủ). */
export const NHAN_O_TEP: Readonly<Record<string, string>> = { CCCD_MAT_TRUOC: "Ảnh mặt trước căn cước", CCCD_MAT_SAU: "Ảnh mặt sau căn cước" };

export const CHU_DANG_KY = {
  // Tên nút viết thẳng ở web/dang-ky.ts (bảng tham chiếu đối chiếu chữ nút trong mã): «Gửi phiếu», «Gửi lại», «Rút phiếu», «Đặt PIN» (PHU-LUC), «Gửi mã» (chờ chủ chọn).
  // Chữ dưới đây do AI viết, chờ chủ chọn.
  tieuDeEmail: "Bắt đầu bằng email",
  tieuDeVaoLai: "Đã gửi phiếu trước đây?",
  dongVaoLai: "Nếu bạn đã có phiếu, nhập email để xem lại phiếu.",
  giaiThichEmail: "Tour Đảo gửi một mã 6 số tới email này. Bạn dùng mã để mở phiếu, và xin mã mới mỗi lần quay lại.",
  daGuiMa: "Nếu email hợp lệ, mã đã được gửi. Hãy kiểm tra hộp thư (cả mục thư rác).",
  tieuDeMa: "Nhập mã",
  tieuDeThongTin: "Thông tin của bạn",
  nhapLaiSo: "Phiếu cần bổ sung: hãy xem lý do ở trên, sửa thông tin rồi bấm «Gửi lại». Số căn cước và số điện thoại cần nhập lại.",
  giaiThichAnh: "Chụp hoặc chọn ảnh hai mặt căn cước. Ảnh được thu nhỏ trên máy trước khi gửi. Sau khi gửi, bạn không xem lại được ảnh.",
  dongY: "Tôi đã đọc và đồng ý chính sách riêng tư của Tour Đảo.",
  daGui: "Đã gửi phiếu. Tour Đảo sẽ xác minh và báo kết quả qua email.",
  choXuLy: "Tour Đảo đang xử lý phiếu. Kết quả sẽ được báo qua email.",
  hoiRut: "Rút phiếu? Phiếu kết thúc và ảnh đã gửi bị xoá ngay. Muốn đăng ký lại, bạn phải điền phiếu mới.",
  daRut: "Đã rút phiếu.",
  tieuDeDatPin: "Đặt mã PIN để kích hoạt tài khoản",
  giaiThichDatPin: "Phiếu đã được duyệt. Xin một mã mới qua email, rồi tự đặt mã PIN 6 số. Không ai trong công ty biết mã PIN của bạn.",
  daKichHoat: "Đã kích hoạt tài khoản",
  moiDangNhap: "Hãy đăng nhập bằng số điện thoại đã khai và mã PIN vừa đặt.",
} as const;

/** Hàng chờ phiếu đăng ký ở Quản lý tài khoản. */
export const CHU_HANG_CHO_DK = {
  // PHU-LUC (da-chot)
  dat: "Đạt",
  khongDat: "Không đạt",
  xacMinhDat: "Xác minh đạt",
  yeuCauBoSung: "Yêu cầu bổ sung",
  duyet: "Duyệt mở tài khoản",
  chuaKichHoat: "Chưa kích hoạt",
  // cho-chon
  guiLaiLoiMoi: "Gửi lại lời mời",
  tieuDe: "Phiếu đăng ký đối tác",
  rong: "Không có phiếu nào đang chờ.",
  hoSoMoi: "Hồ sơ mới",
  ganHoSo: "Gắn vào hồ sơ này",
  capSeAp: "Cấp sẽ áp",
  capDaAp: "Cấp đã áp",
  // cho-chon (rà soát cuối 2026-11-16): «Trả về xác minh» (ADR-0207 Đ5), thư báo người đăng ký (ADR-0206 Đ13), cờ «còn nữa» của hàng chờ
  traVeXacMinh: "Trả về xác minh",
  guiLaiThu: "Gửi lại thư",
  thuCho: "Thư đang chờ gửi",
  thuLoi: "Thư chưa gửi được",
  conNua: "Còn phiếu khác chưa hiện. Hãy xử lý bớt các phiếu trên rồi tải lại.",
} as const;

/** Tên loại thư báo người đăng ký, để người trong công ty biết thư nào đang chờ (ADR-0206 Đ13; cho-chon). */
export const NHAN_LOAI_THU: Readonly<Record<string, string>> = {
  BO_SUNG: "thư «cần bổ sung»",
  DA_DUYET: "thư «đã được duyệt»",
  TU_CHOI: "thư «không được duyệt»",
  TU_CHOI_DUYET: "thư «không được duyệt»",
};
