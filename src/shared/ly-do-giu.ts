// "GIỮ" — chỗ sống DUY NHẤT của khái niệm này (ADR-0049 D2; Hiến chương 5.7; K9). Chuyến không đạt điều kiện thì ở PLANNED và hiện LÝ DO + AI XỬ LÝ
// (văn phòng / Quản trị / Toàn quyền). Không lưu cột "giữ": máy chủ và màn hình tính lại mỗi lần đọc bằng các hàm thuần ở `dieu-phoi-kiem.ts`, mọi hàm đó
// trả mã thuộc bộ `MA_GIU` dưới đây. Cùng bộ mã dùng cho lý do CHẶN một lệnh xếp/tạo/sửa chuyến (409 kèm lý do bằng lời) và lý do CẦN PHÁ LỆ (luật cấu hình).
// Logic thuần, không I/O, không import module. Câu chữ không bao giờ chứa tên khách, năm sinh, SĐT, số giấy tờ (LC-18); phần `chiTiet` chỉ là mã đơn,
// mã chuyến, biển số, con số.

export const AI_XU_LY = ["VAN_PHONG", "QUAN_TRI", "TOAN_QUYEN"] as const;
/** Chữ NÚT của lệnh "Cập nhật khách theo đơn" (R-P29, chủ lần 16 — route `POST /api/van-chuyen/chuyen/:id/cap-nhat-khach`) — màn và câu lý do giữ dùng CHUNG. */
export const NUT_CAP_NHAT_KHACH = "Cập nhật khách theo đơn";
export type AiXuLy = (typeof AI_XU_LY)[number];
export const NHAN_AI_XU_LY: Readonly<Record<AiXuLy, string>> = { VAN_PHONG: "Văn phòng", QUAN_TRI: "Quản trị", TOAN_QUYEN: "Toàn quyền" };

/**
 * Bộ mã ĐÓNG (thêm mã = sửa tệp này, có test). "Ai xử lý" = ai gỡ được: giấy tờ (GPLX, giấy tờ theo điều kiện xuất bến) → Quản trị (người giữ hồ sơ,
 * ô `vehicle.manage` / giấy tờ); chính sách, bảng hạng bằng, hợp đồng → Toàn quyền (ô `settings.ops`); xếp, tên khách, chặng, xe, tài xế → văn phòng
 * (người xếp xe, người phụ trách đơn); phá lệ mốc / khoảng nghỉ / cam kết xe → Quản trị (ô `trip.override` — chỉ Quản trị, Toàn quyền: ĐP3).
 */
export const MA_GIU = {
  // Tên, suất, chặng, đơn (văn phòng)
  THIEU_TEN: { loiNhan: "Chưa đủ tên khách", aiXuLy: "VAN_PHONG" },
  THIEU_SUAT: { loiNhan: "Chặng chưa xếp đủ người lên xe", aiXuLy: "VAN_PHONG" },
  THUA_SUAT: { loiNhan: "Chặng đang xếp nhiều người hơn số khách", aiXuLy: "VAN_PHONG" },
  VUOT_SO_NGUOI_CHANG: { loiNhan: "Xếp quá số khách của chặng", aiXuLy: "VAN_PHONG" },
  NGUOI_DA_O_CHUYEN_KHAC: { loiNhan: "Khách này đang ở một chuyến khác", aiXuLy: "VAN_PHONG" },
  KHACH_KHONG_THUOC_DON: { loiNhan: "Khách không thuộc đơn của chặng", aiXuLy: "VAN_PHONG" },
  CHANG_KHONG_HOP_LE: { loiNhan: "Chặng chưa xếp được: đơn chưa xác nhận, đã huỷ hoặc chặng đã bỏ", aiXuLy: "VAN_PHONG" },
  DON_DA_HUY: { loiNhan: "Có đơn đã huỷ còn khách trên chuyến", aiXuLy: "VAN_PHONG" },
  CHANG_DA_DONG: { loiNhan: "Có chặng đã bỏ còn khách trên chuyến", aiXuLy: "VAN_PHONG" },
  CHUA_CO_GIO: { loiNhan: "Chặng chưa chốt giờ đón", aiXuLy: "VAN_PHONG" },
  CHUA_CO_NOI_TRA: { loiNhan: "Chặng chưa có nơi trả", aiXuLy: "VAN_PHONG" },
  // ADR-0050 VK1-B: nơi đón / trả của chặng đổi sau khi xếp (khoá so sánh nơi lệch điểm của suất) → văn phòng bấm "cập nhật điểm theo đơn".
  NOI_HEN_DOI: { loiNhan: "Nơi đón / trả đã đổi sau khi xếp — cập nhật điểm", aiXuLy: "VAN_PHONG" },
  // R-P29 (chủ lần 16, khuôn VK1-B): suất trên xe mang khoá người KHÔNG còn là hành khách hiện hành của đơn (khách bị bỏ / thay sau khi gắn tên) → văn phòng
  // bấm "Cập nhật khách theo đơn". Câu không lộ tên; chi tiết chỉ mã đơn.
  KHACH_DA_DOI: { loiNhan: `Khách trong xe không còn trong đơn — bấm ${NUT_CAP_NHAT_KHACH}`, aiXuLy: "VAN_PHONG" },
  // I38 (R-P9): chặng có suất trên chuyến mà ngày đón đã dời ra ngoài khoảng đọc quanh ngày chạy (không còn thuộc chuyến này).
  GIO_HEN_NGOAI_CHUYEN: { loiNhan: "Ngày đón của chặng đã đổi ra ngoài ngày chạy của chuyến", aiXuLy: "VAN_PHONG" },
  // ADR-0096 Đ1 (LC-19): khách CHỜ LÊN có điểm trả đứng trước (hoặc bằng số) điểm đón — văn phòng đổi thứ tự điểm (nút ↑/↓). Chi tiết: mã đơn + số thứ tự
  // điểm (không tên nơi — chọn của người thi công A1, câu ADR có {nơi trả}). Không ai phá lệ (không thuộc MA_LUAT_PHA_LE).
  TRA_TRUOC_DON: { loiNhan: "Điểm trả đứng trước điểm đón — đổi thứ tự điểm rồi xuất bến", aiXuLy: "VAN_PHONG" },
  // ADR-0096 Đ2 (LC-20): giờ xuất bến sớm hơn giờ khởi hành dự kiến − cửa sổ của chính sách hiệu lực. Chi tiết dựng ở `lyDoNgoaiCuaSo` (dieu-phoi-kiem.ts):
  // giờ + ngày khởi hành, giờ + ngày được xuất bến, đường khắc phục (văn phòng sửa giờ chuyến). Không ai phá lệ.
  NGOAI_CUA_SO_XUAT_BEN: { loiNhan: "Chưa tới giờ được xuất bến", aiXuLy: "VAN_PHONG" },
  // Chuyến, xe, tài xế (văn phòng)
  CHUYEN_KHONG_CON_LEN_KE_HOACH: { loiNhan: "Chuyến đã chạy, đã kết thúc hoặc đã huỷ", aiXuLy: "VAN_PHONG" },
  GIO_CHUYEN_KHONG_HOP_LE: { loiNhan: "Giờ kết thúc phải sau giờ bắt đầu và chuyến không quá 24 giờ", aiXuLy: "VAN_PHONG" },
  CHUA_CO_TAI_XE: { loiNhan: "Chuyến chưa có tài xế", aiXuLy: "VAN_PHONG" },
  XE_KHONG_DUNG: { loiNhan: "Xe đang bảo dưỡng hoặc đã ngừng dùng", aiXuLy: "VAN_PHONG" },
  VUOT_SO_CHO: { loiNhan: "Vượt số chỗ của xe", aiXuLy: "VAN_PHONG" },
  TRUNG_GIO_XE: { loiNhan: "Xe trùng giờ với chuyến khác", aiXuLy: "VAN_PHONG" },
  TRUNG_GIO_TAI_XE: { loiNhan: "Tài xế trùng giờ với chuyến khác", aiXuLy: "VAN_PHONG" },
  CHEO_XE_TAI_XE: { loiNhan: "Tài xế không thuộc chủ của xe này", aiXuLy: "VAN_PHONG" },
  HANG_BANG_KHONG_DU: { loiNhan: "Hạng bằng lái không đủ chở số chỗ của xe", aiXuLy: "VAN_PHONG" },
  // Giấy tờ (Quản trị)
  GPLX_THIEU: { loiNhan: "Tài xế chưa có giấy phép lái xe còn dùng được", aiXuLy: "QUAN_TRI" },
  GPLX_THIEU_HANG: { loiNhan: "Giấy phép lái xe chưa ghi hạng", aiXuLy: "QUAN_TRI" },
  GPLX_HET_HAN: { loiNhan: "Giấy phép lái xe hết hạn trước khi chuyến kết thúc", aiXuLy: "QUAN_TRI" },
  DIEU_KIEN_GIAY_TO_XE: { loiNhan: "Xe thiếu hoặc hết hạn giấy tờ bắt buộc", aiXuLy: "QUAN_TRI" },
  DIEU_KIEN_GIAY_TO_TAI_XE: { loiNhan: "Tài xế thiếu hoặc hết hạn giấy tờ bắt buộc", aiXuLy: "QUAN_TRI" },
  // ADR-0057 C5 (chủ lần 18 "chưa có giá thì không được chạy"): chuyến xe thuê chưa có giá bảng đã chụp / giá thoả thuận — KHÔNG ai phá lệ (không thuộc
  // MA_LUAT_PHA_LE). aiXuLy giữ tập đóng AI_XU_LY (G-T5): Quản trị; lời nhắn nói rõ Kế toán cũng làm được. Không kèm số tiền (G-T4).
  THIEU_GIA: { loiNhan: "Chuyến xe thuê chưa có giá — Quản trị hoặc Kế toán nhập giá bảng hoặc giá thoả thuận", aiXuLy: "QUAN_TRI" },
  // Luật cấu hình — cần phá lệ (Quản trị, Toàn quyền) hoặc giữ vì nghỉ chưa đủ lúc xuất bến
  MOC_TOI_THIEU: { loiNhan: "Trong mốc tối thiểu trước giờ xuất bến — cần Quản trị phá lệ", aiXuLy: "QUAN_TRI" },
  KHOANG_NGHI: { loiNhan: "Chưa đủ khoảng nghỉ giữa hai chuyến — cần Quản trị phá lệ", aiXuLy: "QUAN_TRI" },
  NGHI_THIEU: { loiNhan: "Chưa đủ thời gian nghỉ sau chuyến trước", aiXuLy: "QUAN_TRI" },
  // ADR-0056 VK3-A (Đợt 7, C9): chuyến trái cam kết "xe riêng" / "xe tối thiểu N chỗ" của khách — Quản trị / Toàn quyền phá lệ (ô `trip.override`). Chi
  // tiết chỉ mã đơn + loại + con số (`kiemCamKet`), không tên.
  CAM_KET: { loiNhan: "Trái cam kết xe riêng / số chỗ tối thiểu", aiXuLy: "QUAN_TRI" },
  // Chính sách (Toàn quyền)
  CHINH_SACH_RONG: { loiNhan: "Chưa có chính sách điều phối đang hiệu lực", aiXuLy: "TOAN_QUYEN" },
  KHONG_CO_HANG_BANG: { loiNhan: "Chưa có quy định số khách cho hạng bằng lái này", aiXuLy: "TOAN_QUYEN" },
  HOP_DONG: { loiNhan: "Chính sách đòi hợp đồng vận chuyển nhưng app chưa hỗ trợ", aiXuLy: "TOAN_QUYEN" },
} as const satisfies Record<string, { loiNhan: string; aiXuLy: AiXuLy }>;

export type MaGiu = keyof typeof MA_GIU;
export const isMaGiu = (v: unknown): v is MaGiu => typeof v === "string" && Object.hasOwn(MA_GIU, v);

export interface LyDoGiu {
  ma: MaGiu;
  loiNhan: string;
  aiXuLy: AiXuLy;
}

/** Dựng một lý do giữ/chặn. `chiTiet` (tuỳ chọn) chỉ gồm mã đơn, mã chuyến, biển số, con số — không bao giờ tên, năm sinh, SĐT, số giấy tờ. */
export function lyDoGiu(ma: MaGiu, chiTiet?: string): LyDoGiu {
  const m = MA_GIU[ma];
  return { ma, loiNhan: chiTiet ? `${m.loiNhan}: ${chiTiet}` : m.loiNhan, aiXuLy: m.aiXuLy };
}
