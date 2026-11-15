// Luật nhập lô vé dùng chung máy chủ ↔ giao diện (ADR-0156 Đ1, Đ3). Thuần, không I/O. Câu báo lỗi KHÔNG lặp lại mã vé: chuỗi QR có giá trị như vé (ADR-0153 Đ1 mục 5).

/** Mỗi lần gửi thêm vé vào lô: tối đa bấy nhiêu ảnh (cỡ thân yêu cầu giới hạn riêng ở route). */
export const TOI_DA_VE_MOI_DOT = 10;
/** Số đơn tối đa được xét cấp bù trong MỘT lần xác nhận lô (giữ lệnh dưới trần ~1.000 câu D1 mỗi lần gọi Worker). Còn đơn chưa xét ⇒ phản hồi `conDonChuaXet`. */
export const TOI_DA_DON_XET_CAP_BU = 30;
export const TOI_DA_BYTE_ANH = 3 * 1024 * 1024;

/** Trần lô: mặc định và khoảng Toàn quyền đặt được (`vdt_setting.batch_limit`; migration kiểm cùng khoảng). */
/** Ảnh của lô đã huỷ được lưu thêm từng này ngày để tra cứu, tra soát rồi mới tự xoá (chủ quyết 2/11/2026). */
export const NGAY_LUU_ANH_LO_HUY = 3;
/** Đường dẫn cho khách hết hạn sau ngày dùng cuối của vé từng này ngày (ADR-0153). */
export const NGAY_HAN_DUONG_DAN_SAU_NGAY_DUNG = 7;
export const TRAN_LO_MAC_DINH = 50;
export const TRAN_LO_NHO_NHAT = 1;
export const TRAN_LO_LON_NHAT = 200;
export const tranLoHopLe = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= TRAN_LO_NHO_NHAT && (n as number) <= TRAN_LO_LON_NHAT;
export const cauVuotTran = (tran: number, soAnh: number): string => `Một lô tối đa ${tran} vé, bạn đang chọn ${soAnh} ảnh.`;

export const DANG_MA_VE = /^[A-Za-z0-9._-]{1,40}$/;
/**
 * Khoá chống trùng lấy từ chuỗi QR (ADR-0156 Đ1): hiện là TOÀN BỘ chuỗi. Nếu thử tải cùng một vé hai lần cho thấy chuỗi đổi thì đổi khoá sang 12 số cuối (`S/N`) ở ĐÚNG hàm này.
 * Trả null khi chuỗi không đúng dạng mã vé.
 */
export const maVeTuQr = (chuoi: string): string | null => (DANG_MA_VE.test(chuoi) ? chuoi : null);

export interface AnhDaDoc { ten: string; chuoiQr: string | null; byte: number }
export interface AnhBiLoai { ten: string; lyDo: string }

/** Lọc các ảnh đã đọc QR trước khi gửi: giữ thứ tự; ảnh hỏng bị loại riêng và nêu tên tệp, không kéo các ảnh khác. */
export function locAnhDaDoc<T extends AnhDaDoc>(ds: readonly T[]): { hop: (T & { maVe: string })[]; bi: AnhBiLoai[] } {
  const hop: (T & { maVe: string })[] = [];
  const bi: AnhBiLoai[] = [];
  const daGap = new Map<string, string>();
  for (const a of ds) {
    if (a.byte > TOI_DA_BYTE_ANH) { bi.push({ ten: a.ten, lyDo: "Ảnh lớn hơn 3 MB." }); continue; }
    if (a.chuoiQr === null) { bi.push({ ten: a.ten, lyDo: "Không đọc được mã QR trên ảnh." }); continue; }
    const maVe = maVeTuQr(a.chuoiQr);
    if (maVe === null) { bi.push({ ten: a.ten, lyDo: "Mã QR trên ảnh không đúng dạng vé." }); continue; }
    const dau = daGap.get(maVe);
    if (dau !== undefined) { bi.push({ ten: a.ten, lyDo: `Trùng vé với ảnh ${dau} đã chọn.` }); continue; }
    daGap.set(maVe, a.ten);
    hop.push({ ...a, maVe });
  }
  return { hop, bi };
}
