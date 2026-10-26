// Luật THUẦN của bước xác nhận đơn (ADR-0136 Đ1, Đ5, Đ9) — một nguồn cho máy chủ (orders) và giao diện. Không I/O, không import module.
// Test cạnh tệp: xac-nhan-don.test.ts.

/** Kết quả một lần quyết định: Còn vé (xác nhận), Hết vé (huỷ, lý do HET_CHO), Huỷ. Mã lưu ở `ord_confirm_request.ticket`; không hiện mã ra người dùng. */
export type KetQuaXacNhan = "CON_VE" | "HET_VE" | "HUY";

export interface DichVuXet {
  /** Mã dịch vụ danh mục; null = dịch vụ nhập tay (không gắn cờ được). */
  ma: string | null;
  /** Mã nhóm dịch vụ hiện hành; null = chưa có nhóm. */
  nhom: string | null;
}

/**
 * Đ1 ba bước cho TỪNG dịch vụ: có dòng riêng trong `coDichVu` (khoá = `ma`) thì theo dòng đó; không có thì theo `coNhom` (khoá = `nhom`); không có cả hai,
 * hoặc `ma` null (nhập tay) thì KHÔNG cần. `DICH_VU` khi có ≥ 1 dịch vụ cần; `DAT_GAP` khi còn chặng dưới mốc 6 giờ chưa đặt gấp.
 */
export function canXacNhan(i: {
  dichVu: readonly DichVuXet[];
  coDichVu: ReadonlyMap<string, boolean>;
  coNhom: ReadonlyMap<string, boolean>;
  coChangDuoiMocChuaDatGap: boolean;
}): { can: boolean; vi: ("DICH_VU" | "DAT_GAP")[] } {
  const vi: ("DICH_VU" | "DAT_GAP")[] = [];
  const canDichVu = i.dichVu.some((d) => {
    if (d.ma === null) return false;
    const rieng = i.coDichVu.get(d.ma);
    if (rieng !== undefined) return rieng;
    if (d.nhom === null) return false;
    return i.coNhom.get(d.nhom) === true;
  });
  if (canDichVu) vi.push("DICH_VU");
  if (i.coChangDuoiMocChuaDatGap) vi.push("DAT_GAP");
  return { can: vi.length > 0, vi };
}

const PHUT = 60_000;
const GIO = 60 * PHUT;
const NGAY = 24 * GIO;
const LECH_VN = 7 * GIO;
const HAN_PHUT = 15;
const GIO_DEM_TU = 22 * GIO; // từ 22:00 giờ VN
const GIO_DEM_DEN = 6 * GIO; // đến 06:00 giờ VN

/**
 * Hạn xác nhận (Đ9): 15 phút LÀM VIỆC kể từ lúc gửi, khoảng 22:00–06:00 giờ Việt Nam không tính. Trả ISO UTC.
 * Gửi trong khoảng đêm thì đồng hồ chạy từ 06:00; gửi sát 22:00 thì phần còn lại sang 06:00 hôm sau.
 */
export function hanXacNhan(guiLucIso: string): string {
  const ms = Date.parse(guiLucIso);
  if (!Number.isFinite(ms)) throw new Error("hanXacNhan: mốc gửi không hợp lệ");
  const vnMs = ms + LECH_VN;
  const dauNgay = Math.floor(vnMs / NGAY) * NGAY;
  let batDau = vnMs;
  if (vnMs - dauNgay < GIO_DEM_DEN) batDau = dauNgay + GIO_DEM_DEN;
  else if (vnMs - dauNgay >= GIO_DEM_TU) batDau = dauNgay + NGAY + GIO_DEM_DEN;
  const cuoiNgayLam = Math.floor(batDau / NGAY) * NGAY + GIO_DEM_TU;
  const can = HAN_PHUT * PHUT;
  const hanVn = batDau + can <= cuoiNgayLam ? batDau + can : cuoiNgayLam + (NGAY - GIO_DEM_TU + GIO_DEM_DEN) + (can - (cuoiNgayLam - batDau));
  return new Date(hanVn - LECH_VN).toISOString();
}

/**
 * Ai quyết định (Còn vé / Hết vé / Huỷ) được một đơn đang chờ (Đ5): người giữ ô `order.confirm.review`, và không phải người lập — trừ khi người lập là nội bộ
 * (không giữ PARTNER, không giữ INTERN) VÀ công tắc «tự xác nhận» đang bật. `laNoiBo` do route tính.
 */
export function duocQuyetDinh(i: { laNguoiLap: boolean; laNoiBo: boolean; coQuyenXetDuyet: boolean; choTuXacNhan: boolean }): boolean {
  return i.coQuyenXetDuyet && (!i.laNguoiLap || (i.laNoiBo && i.choTuXacNhan));
}

/** Đ9: yêu cầu QUÁ HẠN khi bây giờ SAU hạn (chỉ cảnh báo, không tự huỷ). `nowMs` do nơi gọi truyền — đồng hồ tiêm được, bài không phụ thuộc giờ thật. */
export function quaHanXacNhan(hanIso: string, nowMs: number): boolean {
  return nowMs > Date.parse(hanIso);
}
