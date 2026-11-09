// Luật thuần chống đọc lặp một mã vé ở trang Quét vé (web/quet-ve.ts). Camera đọc ~4 khung mỗi giây nên một mã đứng yên trước ống kính được đọc nhiều lần;
// màn kết quả cũng có thể mở lâu. Cửa sổ 3 giây tính từ LẦN THẤY CUỐI hoặc từ lúc ĐÓNG màn kết quả (`batDauDong`), cái nào muộn hơn — không xoá dấu khi đóng.
export const CHONG_LAP_MS = 3000;

export type DauDocCuoi = { ma: string; luc: number } | null;

/** Gặp mã `ma` lúc `bay` (mili giây): có gửi lên máy chủ không, và dấu mới. Mã khác dấu cũ, hoặc quá 3 giây kể từ dấu cũ ⇒ gửi. Thấy lại cùng mã trong cửa sổ ⇒ không gửi, cửa sổ trượt tiếp. */
export function xetDocLap(cuoi: DauDocCuoi, ma: string, bay: number): { gui: boolean; cuoi: DauDocCuoi } {
  if (cuoi !== null && cuoi.ma === ma && bay - cuoi.luc < CHONG_LAP_MS) return { gui: false, cuoi: { ma, luc: bay } };
  return { gui: true, cuoi: { ma, luc: bay } };
}

/** Đóng màn kết quả lúc `bay`: giữ mã, tính lại cửa sổ từ lúc đóng. */
export const batDauDong = (cuoi: DauDocCuoi, bay: number): DauDocCuoi => (cuoi === null ? null : { ma: cuoi.ma, luc: bay });
