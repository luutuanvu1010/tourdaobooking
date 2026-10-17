// Nhãn xác minh phiếu tự khai dùng chung máy chủ ↔ giao diện (ADR-0125 đ6; lát H-4 Gói 2). Thuần, không import.
// Danh sách lý do từ chối là ĐÓNG: máy chủ chỉ nhận mã, không nhận chữ tự do (chữ tự do dễ mang số giấy tờ vào nhật ký / câu trả lời).
export const LY_DO_TU_CHOI = {
  KHONG_DOC_DUOC: "Thông tin không đọc được hoặc không rõ",
  KHONG_KHOP_GIAY_TO: "Thông tin khai không khớp giấy tờ",
  GIAY_TO_HET_HAN: "Giấy tờ đã hết hạn",
  SAI_LOAI_GIAY_TO: "Sai loại giấy tờ",
  TRUNG_HO_SO_KHAC: "Số giấy tờ đã thuộc hồ sơ khác",
  KHONG_PHAI_CHINH_CHU: "Không phải thông tin của chính chủ",
  CHUA_DOI_CHIEU_DUOC: "Chưa đối chiếu được với bản gốc",
  HO_SO_DA_GOP: "Hồ sơ đã gộp vào hồ sơ khác",
} as const;
export type MaLyDoTuChoi = keyof typeof LY_DO_TU_CHOI;
export const laMaLyDoTuChoi = (v: unknown): v is MaLyDoTuChoi => typeof v === "string" && Object.hasOwn(LY_DO_TU_CHOI, v);
export const nhanLyDoTuChoi = (c: string): string => (Object.hasOwn(LY_DO_TU_CHOI, c) ? LY_DO_TU_CHOI[c as MaLyDoTuChoi] : "Lý do khác");
export const NHAN_LY_DO_CHAN: Readonly<Record<string, string>> = {
  nguoi_khai: "Đây là phiếu của chính bạn.",
  khong_tai_khoan: "Phiếu không còn gắn đúng tài khoản — chuyển Toàn quyền.",
  cap_bac: "Tài khoản này ngoài phạm vi bạn quản lý.",
  da_cham: "Bạn đã tạo hoặc từng hỗ trợ đăng nhập cho tài khoản này — để người khác xác minh.",
};
