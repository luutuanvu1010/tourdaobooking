/**
 * Bảng từ giao diện (ADR-0130): nơi DUY NHẤT ghi các chữ đã loại khỏi chữ người dùng nhìn thấy, kèm chữ thay.
 * Bài `src/bang-tu-giao-dien.test.ts` quét chuỗi trong mã giao diện, trợ giúp, câu báo của máy chủ: chữ đã loại quay lại là `npm test` đỏ.
 * Thêm một dòng = chủ dự án đã chọn tên (đưa 2–3 tên cho chủ chọn, không tự đặt). Mã nội bộ (tên hàm, `data-action`, đường API, cột CSDL) KHÔNG đổi theo.
 */
export interface TuDaLoai {
  /** Chữ đã loại (biểu thức, có cờ `u`). */
  cam: RegExp;
  /** Chữ dùng thay. */
  thay: string;
  /** Chủ chọn ngày nào, ở đâu. */
  nguon: string;
}

export const TU_DA_LOAI: readonly TuDaLoai[] = [
  { cam: /[Ll]ần thu|LẦN THU/u, thay: "khoản thu (Ghi khoản thu · Sửa khoản thu đã ghi · Ghi bù khoản thu)", nguon: "chủ 2026-10-08 (BACKLOG §25), áp 2026-10-18" },
  { cam: /[Ll]ần hoàn/u, thay: "khoản hoàn tiền", nguon: "theo «khoản thu», 2026-10-18" },
  { cam: /[Ll]ệnh Thay|[Tt]hay lần/u, thay: "Sửa khoản thu đã ghi", nguon: "chủ 2026-10-08" },
  // «Đảo» theo nghĩa ghi dòng ngược để huỷ một khoản (bút toán đảo). Chữ «đảo» theo nghĩa hòn đảo (Tour Đảo, tour 4 đảo…) không bị chặn — xem NGHIA_HON_DAO.
  { cam: /[Đđ]ảo/u, thay: "Huỷ khoản thu · (đã huỷ) · Huỷ dòng (chi phí xe)", nguon: "chủ 2026-10-18 (hộp hỏi: «Huỷ khoản thu»)" },
  { cam: /đã Đã giao|Đã Đã giao/u, thay: "đã giao / đơn ở bước Đã giao", nguon: "lỗi lặp chữ, 2026-10-18" },
  { cam: /(?<![\p{L}\p{N}_.\-/])[Aa]pp(?![\p{L}\p{N}_]| Store)/u, thay: "Nền tảng", nguon: "chủ 2026-10-02 («dùng từ Nền tảng thay cho App»)" },
  { cam: /Bỏ dấu(?! chọn)/u, thay: "Bỏ đánh dấu", nguon: "2026-10-18 («bỏ dấu» dễ hiểu là bỏ dấu thanh)" },
  { cam: /^Giữ đơn$/u, thay: "Không huỷ (nút trong hộp huỷ đơn)", nguon: "2026-10-18 (trùng chữ «Đang giữ đơn»)" },
  // Lượt 2 (hồ sơ docs/superpowers/specs/2026-10-18-ra-soat-ngon-ngu-luot-2.md): chủ tự bấm chọn cả bảy tên 18/10. Mẫu chặn hẹp theo ĐÚNG nghĩa đã đổi —
  // nghĩa khác giữ nguyên («mốc nhắc» giấy tờ, «mốc cập nhật», «phiên bản», «Đang giữ đơn», tiền công ty giữ của khách).
  { cam: /[Nn]gười nhận tiền|[Nn]gười thu(?! tiền)(?!\p{L})/u, thay: "Người thu tiền", nguon: "chủ 2026-10-18 (lượt 2)" },
  { cam: /giữ hộ|[Nn]gười đang giữ tiền|đang giữ .{0,40}? của công ty/u, thay: "chưa nộp về công ty (Tiền chưa nộp về công ty)", nguon: "chủ 2026-10-18 (lượt 2)" },
  { cam: /[Cc]hặng|CHẶNG/u, thay: "lượt đưa đón (gọi tắt «lượt» khi đã rõ)", nguon: "chủ 2026-10-18 (lượt 2)" },
  { cam: /[Mm]ốc (?:tối thiểu|ra lệnh|6 giờ)|(?:[Dd]ưới|[Ss]át|[Qq]uá|trước) mốc/u, thay: "hạn chốt (Hạn chốt trước giờ đón · Sắp tới hạn chốt · Quá hạn chốt)", nguon: "chủ 2026-10-18 (lượt 2)" },
  { cam: /[Xx]uất bến|XUẤT BẾN/u, thay: "cho xe chạy / xe chạy", nguon: "chủ 2026-10-18 (lượt 2)" },
  // «vai» là CHỮ, không phải mã nội bộ (`VAI`, `muc-vai`, `/api/tro-ly/vai`, khoá `vai`, cột SQL `h.vai,`); «đổi vai» (nhập vai) trong lời dặn Trợ lý là nghĩa khác.
  { cam: /^(?!vai$)[\s\S]*(?<![\p{L}\p{N}_\-/.])(?<!đổi )[Vv]ai(?![\p{L}\p{M}\p{N}_\-,])(?! trò)/u, thay: "vai trò", nguon: "chủ 2026-10-18 (lượt 2)" },
  { cam: /[Pp]hiên(?! bản)|PHIÊN(?! BẢN)/u, thay: "máy đang đăng nhập (Đăng xuất máy này)", nguon: "chủ 2026-10-18 (lượt 2)" },
];

/** Chữ «đảo» là hòn đảo (tên công ty, tên tour) — gỡ khỏi chuỗi trước khi so với dòng «Đảo» ở trên. */
export const NGHIA_HON_DAO = /(?:[Tt]our|TOUR)(?: \d+)? (?:đảo|Đảo|ĐẢO)|\d+ đảo|các đảo|ra đảo/gu;
