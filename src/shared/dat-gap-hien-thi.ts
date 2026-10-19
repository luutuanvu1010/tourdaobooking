// Luật thuần HIỂN THỊ mốc 6 giờ + đặt gấp trên biểu mẫu đơn và trang đơn (ADR-0049 D2, V12; bản vẽ docs/design/van-chuyen-dieu-phoi/project/07 Bieu mau don -
// chang don.dc.html; chủ H4 / N-14 29/9; ruling R-P15, R-P18). Không I/O, không DOM; import kèm đuôi .ts. Test: dat-gap-hien-thi.test.ts.
// - "Dưới mốc" dùng ĐÚNG luật `kiemMocDat` (src/shared/moc-toi-thieu.ts) — màn hình không tính lại; máy chủ vẫn quyết lúc lưu / xác nhận (canhBaoMoc, 409).
// - Nhãn đặt gấp HIỆN THEO KHOÁ CÓ TRONG DTO (`LegDto.datGap`): có `lyDoNhan` → đủ; chỉ `daDuyet` → "Quản trị đã duyệt". Không tự lọc theo vai ở trình duyệt.
// - Lý do đặt gấp: danh sách ĐÓNG `LY_DO_DAT_GAP` (một nguồn với máy chủ — R-P18); ghi chú ≤ `GHI_CHU_DAT_GAP_TOI_DA`.
import { CHIEU_LABEL, GHI_CHU_DAT_GAP_TOI_DA, LY_DO_DAT_GAP, isLyDoDatGap, type LyDoDatGap } from "./chang-dua-don.ts";
import { nhanThoiLuong } from "./chinh-sach-hien-thi.ts";
import type { DatGapDto, LegDto, OrderDetailDto } from "./contracts.ts";
import { kiemMocDat } from "./moc-toi-thieu.ts";
import { msToVnLocal, ngayNgan } from "./vn-date.ts";

/** "Giờ đón cách bây giờ 4 giờ 10 phút — dưới mốc 6 giờ" (bản vẽ 07); giờ đón đã qua → "Giờ đón đã qua — dưới mốc …". */
export function cauMoc(phutConLai: number, mocPhut: number): string {
  const moc = `quá hạn chốt ${nhanThoiLuong(mocPhut)}`;
  return phutConLai > 0 ? `Giờ đón cách bây giờ ${nhanThoiLuong(phutConLai)} — ${moc}` : `Giờ đón đã qua — ${moc}`;
}

/** Lúc duyệt ngắn gọn theo giờ VN: cùng ngày → "HH:MM"; khác ngày → "HH:MM dd/mm"; khác năm → "HH:MM dd/mm/yyyy". */
function lucNgan(iso: string, nowMs: number): string {
  const l = msToVnLocal(Date.parse(iso));
  const n = msToVnLocal(nowMs);
  if (l.date === n.date) return l.time;
  return `${l.time} ${ngayNgan(l.date, n.date)}`;
}

/** Nhãn "Đặt gấp — lý do — người duyệt HH:MM" (+ ghi chú) của bản vẽ 7c; dấu chỉ có cờ → "Đặt gấp — Quản trị đã duyệt" (chủ H4). */
export function nhanDatGap(d: DatGapDto, nowMs: number): { chinh: string; ghiChu: string | null } {
  if (!("lyDoNhan" in d)) return { chinh: "Đặt gấp — Quản trị đã duyệt", ghiChu: null };
  const duyet = `${d.nguoiDuyet ? `${d.nguoiDuyet} ` : ""}duyệt ${lucNgan(d.luc, nowMs)}`;
  return { chinh: `Đặt gấp — ${d.lyDoNhan} — ${duyet}`, ghiChu: d.ghiChu };
}

export interface ChangCanDatGap {
  serviceId: string;
  tenDichVu: string;
  legId: string;
  chieu: string;
  phutConLai: number;
}
/**
 * Chặng của đơn NHÁP còn phải đặt gấp trước khi xác nhận: có ngày + giờ đón, chưa đặt gấp (`datGap` null), dưới mốc (`kiemMocDat`). Đơn đã xác nhận: mốc chỉ xét
 * lúc SỬA chặng (I14 — máy chủ trả 409 cho lệnh sửa) → rỗng. Mốc chưa có (`null`) → rỗng (máy chủ trả 503 lúc xác nhận).
 */
export function changDuoiMoc(order: Pick<OrderDetailDto, "status" | "services">, mocPhut: number | null, nowMs: number): ChangCanDatGap[] {
  if (mocPhut === null || order.status !== "draft") return [];
  const out: ChangCanDatGap[] = [];
  for (const s of order.services) {
    for (const l of s.legs) {
      const r = kiemMocDat({ ngayDon: l.pickupDate, gioDon: l.pickupTime, datGap: l.datGap !== null }, nowMs, mocPhut);
      if (r.duoiMoc) out.push({ serviceId: s.id, tenDichVu: s.name, legId: l.id, chieu: CHIEU_LABEL[l.direction], phutConLai: r.phutConLai });
    }
  }
  return out;
}

/** Dòng khoá dưới nút "Xác nhận đơn" (bản vẽ 7a / 7b); không còn chặng cần đặt gấp → null. */
export function tomTatChanXacNhan(can: readonly ChangCanDatGap[], duocDatGap: boolean): string | null {
  if (can.length === 0) return null;
  return duocDatGap ? "Duyệt đặt gấp xong thì xác nhận được." : "Cần Quản trị duyệt đặt gấp";
}

/** Cảnh báo dưới mốc trên biểu mẫu CHƯA lưu (R-P15 — mốc từ GET /api/orders/moc-toi-thieu): chỉ để hiện; null = không cảnh báo. */
export function canhBaoChangForm(c: { ngayDon: string; gioDon: string; datGap: boolean }, mocPhut: number | null, nowMs: number): string | null {
  if (mocPhut === null || !c.ngayDon || !c.gioDon) return null;
  const r = kiemMocDat({ ngayDon: c.ngayDon, gioDon: c.gioDon, datGap: c.datGap }, nowMs, mocPhut);
  return r.duoiMoc ? cauMoc(r.phutConLai, mocPhut) : null;
}

/**
 * Biểu mẫu sửa đơn nháp: chặng chiều đi đã đặt gấp mà ngày / giờ / nơi đón trên biểu mẫu GIỮ NGUYÊN → máy chủ chép lại dấu khi lưu (Q1 = (a), `chepDatGapNhap`)
 * → không cảnh báo. Đổi bất kỳ thứ nào → dấu mất khi lưu → cảnh báo như chặng mới. (Chỉ để hiện — máy chủ quyết.)
 */
export function datGapGiuTrenForm(cu: LegDto | undefined, moi: { departDate: string; pickupTime: string; pickupPlace: string }): boolean {
  if (!cu || cu.datGap === null) return false;
  return cu.pickupDate === moi.departDate && (cu.pickupTime ?? "") === moi.pickupTime && cu.pickupLabel === moi.pickupPlace;
}

/** Lựa chọn của ô "Lý do" (bản vẽ 7a) — lấy từ `LY_DO_DAT_GAP` (một nguồn với máy chủ), không chép cứng. */
export const LUA_CHON_LY_DO_DAT_GAP: readonly { value: string; label: string }[] = Object.entries(LY_DO_DAT_GAP).map(([value, label]) => ({ value, label }));

/** Thân lệnh đặt gấp `{ lyDo, ghiChu }` (route POST …/legs/:legId/short-notice; khoá `datGap` của lệnh sửa chuyến). Máy chủ che dãy số và kiểm lại. */
export function thanDatGap(lyDo: string, ghiChu: string): { ok: true; value: { lyDo: LyDoDatGap; ghiChu: string | null } } | { ok: false; loi: string } {
  if (!isLyDoDatGap(lyDo)) return { ok: false, loi: "Chọn lý do đặt gấp." };
  const g = ghiChu.trim();
  if (g.length > GHI_CHU_DAT_GAP_TOI_DA) return { ok: false, loi: `Ghi chú ngắn tối đa ${GHI_CHU_DAT_GAP_TOI_DA} ký tự.` };
  return { ok: true, value: { lyDo, ghiChu: g === "" ? null : g } };
}
