// Nhãn phiếu yêu cầu xoá dữ liệu — dùng chung máy chủ ↔ giao diện (ADR-0126; lát H-5 Gói 2). Thuần, không import. Chữ hiện ra là tiếng Việt có dấu,
// không bao giờ lộ mã thô (DA_THUC_HIEN → "Đã thực hiện").

/** Phần dữ liệu PHẢI giữ lại (đ4) — mã + nhãn, theo thứ tự hiện. Phiếu lưu danh sách MÃ lúc thực hiện (retained_codes) để chữ trả lời không đổi theo mã sau này.
 *  Hai mã động: TEN_HO_SO (khi giữ tên), SDT_DANG_NHAP (khi hồ sơ có tài khoản — đ9). */
export const PHAN_GIU_LAI: readonly { ma: string; nhan: string }[] = [
  { ma: "DON_BAN_CHUP", nhan: "Đơn hàng kèm bản chụp thông tin khách lúc lập đơn" },
  { ma: "HANH_KHACH", nhan: "Danh sách hành khách của chuyến, giữ tối thiểu 3 năm (chưa luật sư xác nhận)" },
  { ma: "LAN_THU", nhan: "Các khoản thu tiền" },
  { ma: "SO_TIEN", nhan: "Sổ tiền và công nợ" },
  { ma: "YEU_CAU_HOA_DON", nhan: "Bản chụp yêu cầu xuất hoá đơn" },
  { ma: "HO_TEN_NHAT_KY", nhan: "Họ tên trong nhật ký thao tác" },
  { ma: "NHAT_KY_CU_SDT", nhan: "Nhật ký cũ có số điện thoại" },
  { ma: "PHIEN_DA_BO_IP", nhan: "Dòng ghi máy đã đăng nhập (đã bỏ địa chỉ mạng và thông tin trình duyệt; tên máy vẫn giữ)" },
  { ma: "GIOI_TINH", nhan: "Giới tính trong hồ sơ" },
  { ma: "THU_DIEN_TU_LOP_HAI", nhan: "Địa chỉ thư điện tử dùng cho lớp xác thực thứ hai" },
  { ma: "NHAN_KHOA_NHANH", nhan: "Tên đặt cho khoá đăng nhập nhanh" },
  { ma: "NHAN_MAY_TIN_CAY", nhan: "Tên đặt cho máy tin cậy" },
  { ma: "NGAY_VA_HANG_GIAY_TO", nhan: "Ngày cấp, ngày hết hạn và hạng của giấy tờ đã ẩn danh (số giấy tờ đã xoá)" },
  { ma: "CHU_TU_DO", nhan: "Chữ tự do trong ghi chú, góp ý (chưa rà soát)" },
  { ma: "TEN_HO_SO", nhan: "Tên trong hồ sơ" },
  { ma: "SDT_DANG_NHAP", nhan: "Số điện thoại đăng nhập" },
];

/** Danh sách ĐÓNG lý do từ chối phiếu xoá: máy chủ chỉ nhận mã, không nhận chữ tự do. */
export const LY_DO_TU_CHOI_XOA: readonly { ma: "CAN_GIU_THEO_LUAT" | "NGUOI_DUNG_HUY_QUA_KENH_KHAC"; nhan: string }[] = [
  { ma: "CAN_GIU_THEO_LUAT", nhan: "Dữ liệu đang phải giữ theo quy định pháp luật" },
  { ma: "NGUOI_DUNG_HUY_QUA_KENH_KHAC", nhan: "Người dùng đã báo huỷ yêu cầu qua kênh khác" },
];

/** Câu tiếng Việt khi KHÔNG gửi được yêu cầu xoá (mã = `LyDoKhongGuiXoa` của máy chủ + `party_merged`). Quyền xoá không phụ thuộc đồng ý chính sách nên không có câu "chưa đồng ý". */
export const CAU_KHONG_GUI_XOA: Readonly<Record<"khong_ho_so" | "khong_ca_nhan" | "cong_ty_chu" | "dang_cho" | "da_gop", { code: string; message: string }>> = {
  khong_ho_so: { code: "no_party", message: "Tài khoản này chưa gắn hồ sơ nên chưa gửi được yêu cầu xoá. Hãy báo quản trị viên." },
  khong_ca_nhan: { code: "erasure_person_only", message: "Yêu cầu xoá hiện chỉ dành cho hồ sơ cá nhân. Hãy báo quản trị viên nếu cần xoá hồ sơ tổ chức." },
  cong_ty_chu: { code: "owner_company_protected", message: "Hồ sơ công ty chủ không xoá được." },
  dang_cho: { code: "erasure_pending_exists", message: "Bạn đã có yêu cầu xoá dữ liệu đang chờ xử lý." },
  da_gop: { code: "party_merged", message: "Hồ sơ của bạn đã được gộp vào hồ sơ khác. Hãy báo quản trị viên." },
};

export const CAU_CAN_CU_GIU_LAI = "Căn cứ giữ lại: chưa được luật sư hay kế toán xác nhận.";

const TRANG_THAI_PHIEU_XOA: Readonly<Record<string, string>> = {
  CHO_XU_LY: "Chờ xử lý",
  DA_THUC_HIEN: "Đã thực hiện",
  TU_CHOI: "Đã từ chối",
  RUT: "Đã rút",
};
export const nhanTrangThaiPhieuXoa = (s: string): string => (Object.hasOwn(TRANG_THAI_PHIEU_XOA, s) ? TRANG_THAI_PHIEU_XOA[s]! : "Trạng thái khác");

const LY_DO_XOA_ANH: Readonly<Record<string, string>> = {
  HET_QUAN_HE: "Hồ sơ không còn vai trò nào đang hiệu lực",
  DA_AN_DANH: "Giấy tờ đã được ẩn danh",
  DA_HUY: "Giấy tờ đã huỷ",
  DA_GIA_HAN: "Đã có giấy tờ gia hạn thay thế",
  HET_HAN: "Giấy tờ đã hết hạn",
  PHIEU_DA_XU_LY: "Phiếu tự khai đã xử lý xong",
  KHONG_NOI: "Ảnh không gắn với giấy tờ nào",
};
export const nhanLyDoXoaAnh = (s: string): string => (Object.hasOwn(LY_DO_XOA_ANH, s) ? LY_DO_XOA_ANH[s]! : "Lý do khác");
