// Giới hạn độ dài chữ tuỳ chỉnh của trợ lý Hỗ trợ (ADR-0069 điều 4) — MỘT nguồn cho máy chủ (`kiemLoiDan`, `kiemNguCanh` ở tro-ly.ts) và ô gõ của trang
// Trợ lý Hỗ trợ (web/tro-ly-cai-dat.ts, thuộc tính maxlength). Tệp riêng, không import gì: trang quản lý không kéo cả kho tri thức vào bundle.
// Giọng + lời dặn thêm đi kèm MỌI câu hỏi, ngoài ngân sách tài liệu 6.000 token ⇒ giữ ngắn (≈ 1.800 ký tự ≈ 600 token mỗi câu, trần chi phí vẫn chặn).
// Một đoạn ngữ cảnh ≤ 3.000 ký tự ≈ 1.000 token — dưới xa ngân sách 6.000 để `chonDoan` không bỏ qua đoạn mãi mãi.
// Bộ não (ADR-0073): lời nhắc 1–12.000 ký tự; token ra 800–4000, mức suy nghĩ Cao cần ≥ 2000 — CÙNG số với CHECK của migration *_tl_bo_nao.sql.
export const GIOI_HAN_TRO_LY = {
  cauChao: 300,
  giong: 300,
  loiDanThem: 1500,
  soCauMau: 6,
  cauMau: 120,
  tieuDeNguCanh: 80,
  noiDungNguCanh: 3000,
  soNguCanh: 30,
  loiNhac: 12000,
  tokenRaThap: 800,
  tokenRaCao: 4000,
  tokenRaKhiCao: 2000,
} as const;
