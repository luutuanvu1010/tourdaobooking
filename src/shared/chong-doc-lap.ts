// Luật thuần chống đọc lặp một mã vé ở trang Quét vé (web/quet-ve-may.ts). Camera đọc ~4 khung mỗi giây nên một mã đứng yên trước ống kính được đọc nhiều lần;
// màn kết quả cũng có thể mở lâu. Cửa sổ 3 giây tính từ LẦN GỬI hoặc từ lúc ĐÓNG màn kết quả (`batDauDong`) — mốc CỐ ĐỊNH: thấy lại cùng mã trong cửa sổ
// không dời mốc (đặc tả §2.5 chỉ nói «vài giây»; mốc trượt từng làm vé nằm yên trước camera không bao giờ được gửi lại — lỗi treo 21/11, Việc 9).
export const CHONG_LAP_MS = 3000;

export type DauDocCuoi = { ma: string; luc: number } | null;

/** Gặp mã `ma` lúc `bay` (mili giây): có gửi lên máy chủ không, và dấu mới. Mã khác dấu cũ, hoặc từ 3 giây kể từ dấu cũ ⇒ gửi. Thấy lại cùng mã trong cửa sổ ⇒ không gửi, GIỮ NGUYÊN dấu cũ. */
export function xetDocLap(cuoi: DauDocCuoi, ma: string, bay: number): { gui: boolean; cuoi: DauDocCuoi } {
  if (cuoi !== null && cuoi.ma === ma && bay - cuoi.luc < CHONG_LAP_MS) return { gui: false, cuoi };
  return { gui: true, cuoi: { ma, luc: bay } };
}

/** Đóng màn kết quả lúc `bay`: giữ mã, tính lại cửa sổ từ lúc đóng. */
export const batDauDong = (cuoi: DauDocCuoi, bay: number): DauDocCuoi => (cuoi === null ? null : { ma: cuoi.ma, luc: bay });
