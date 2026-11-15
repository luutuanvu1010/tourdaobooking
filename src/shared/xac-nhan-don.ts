// Luật THUẦN của bước xác nhận đơn (ADR-0136 Đ1, Đ5, Đ9) — một nguồn cho máy chủ (orders) và giao diện. Không I/O, không import module.
// Test cạnh tệp: xac-nhan-don.test.ts.
import { congPhutGioHanhChinh, type KhungGioHanhChinh } from "./ban-hang-phu-trach.ts";

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

const HAN_PHUT = 15;

/**
 * Hạn xác nhận (Đ9, đổi theo ADR-0142 Đ5): 15 phút GIỜ HÀNH CHÍNH kể từ lúc gửi — khung do nơi gọi truyền (hôm nay 07:00–17:00 giờ Việt Nam, mọi ngày trong
 * tuần). Gửi ngoài khung thì đồng hồ chạy từ đầu khung; gửi sát cuối khung thì phần còn lại sang đầu khung hôm sau. Trả ISO UTC.
 */
export function hanXacNhan(guiLucIso: string, khung: Pick<KhungGioHanhChinh, "tuPhut" | "denPhut">): string {
  return congPhutGioHanhChinh(guiLucIso, HAN_PHUT, khung);
}

/**
 * Ai quyết định (Còn vé / Hết vé / Huỷ) được một đơn đang chờ (Đ5): người giữ ô `order.confirm.review`, và không phải người lập — trừ khi người lập là nội bộ
 * (không giữ PARTNER, không giữ INTERN) VÀ công tắc «tự xác nhận» đang bật. `laNoiBo` do route tính.
 * ADR-0142 Đ5: đơn đang trong ưu tiên của một Bán hàng được mời (`uuTienCuaNguoiKhac`) thì không ai quyết định, trừ Quản trị / Toàn quyền KHÔNG giữ quyền Đối tác.
 */
export function duocQuyetDinh(i: {
  laNguoiLap: boolean; laNoiBo: boolean; coQuyenXetDuyet: boolean; choTuXacNhan: boolean;
  uuTienCuaNguoiKhac: boolean; laQuanTriHoacToanQuyen: boolean; giuDoiTac: boolean;
}): boolean {
  if (i.uuTienCuaNguoiKhac && !(i.laQuanTriHoacToanQuyen && !i.giuDoiTac)) return false;
  return i.coQuyenXetDuyet && (!i.laNguoiLap || (i.laNoiBo && i.choTuXacNhan));
}

/** Đ9: yêu cầu QUÁ HẠN khi bây giờ SAU hạn (chỉ cảnh báo, không tự huỷ). `nowMs` do nơi gọi truyền — đồng hồ tiêm được, bài không phụ thuộc giờ thật. */
export function quaHanXacNhan(hanIso: string, nowMs: number): boolean {
  return nowMs > Date.parse(hanIso);
}
