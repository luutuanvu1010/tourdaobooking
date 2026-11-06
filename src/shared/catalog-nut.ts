// Chữ của nút «Bỏ ghi đè giá» ở Dịch vụ & giá (ADR-0166 câu 2). Nút chỉ bỏ GIÁ ghi đè; dấu «Ngừng bán» được giữ nguyên.
// Hàm thuần để có bài kiểm; `web/catalog.ts` chỉ vẽ.

/** Câu hỏi trước khi bỏ giá ghi đè. Dịch vụ đang ngừng bán thì nói rõ vẫn ngừng bán. */
export const CAU_HOI_BO_GHI_DE_GIA = (ma: string, dangNgungBan: boolean): string =>
  `Bỏ giá ghi đè của ${ma}, quay về giá theo Sheet?${dangNgungBan ? " Dịch vụ này đang ngừng bán và vẫn ngừng bán." : ""}`;
