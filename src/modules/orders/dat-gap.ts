// ĐẶT GẤP + MỐC TỐI THIỂU LÚC ĐẶT phía `orders` (ADR-0049 D2, D3; kế hoạch Task A10, I14, I16, I27, Q1 = (a)) — luật THUẦN (không I/O, không SQL): đọc thân
// `datGap`, khớp dấu đặt gấp khi lưu lại đơn nháp, xét "sửa chặng dưới mốc", dựng cảnh báo mốc. Mốc là MỘT luật với `kiemMocDat` (src/shared/moc-toi-thieu.ts)
// — không tính ngưỡng ở đây.
import { GHI_CHU_DAT_GAP_TOI_DA, isLyDoDatGap, type ChangHopLe, type LyDoDatGap } from "../../shared/chang-dua-don";
import { kiemMocDat } from "../../shared/moc-toi-thieu";
import { maskLongDigits } from "../../shared/text-guards";
import type { OrderDetailDto } from "../../shared/contracts";
import type { DatGapWrite, LegDatGapRow } from "./chang-hanh-khach-repo";
import type { ValidService } from "./service-rules";

/** Thân đặt gấp `{ lyDo, ghiChu? }` (route đặt gấp; khoá `datGap` của lệnh sửa / thêm chặng): lý do thuộc `LY_DO_DAT_GAP`, ghi chú che dãy số ≤ 120. */
export function docDatGap(v: unknown): { ok: true; value: { lyDo: LyDoDatGap; ghiChu: string | null } } | { ok: false; message: string } {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return { ok: false, message: "Chọn lý do đặt gấp." };
  const o = v as Record<string, unknown>;
  if (!isLyDoDatGap(o.lyDo)) return { ok: false, message: "Chọn lý do đặt gấp." };
  const g = o.ghiChu;
  if (g !== undefined && g !== null && typeof g !== "string") return { ok: false, message: "Ghi chú đặt gấp phải là chữ." };
  const ghiChu = typeof g === "string" && g.trim() !== "" ? maskLongDigits(g.trim()) : null;
  if (ghiChu !== null && ghiChu.length > GHI_CHU_DAT_GAP_TOI_DA) return { ok: false, message: `Ghi chú đặt gấp tối đa ${GHI_CHU_DAT_GAP_TOI_DA} ký tự.` };
  return { ok: true, value: { lyDo: o.lyDo, ghiChu } };
}

const khoa = (catalogCode: string | null, viTri: number, l: Pick<ChangHopLe, "direction" | "pickupDate" | "pickupTime" | "pickupLocationId" | "pickupPlace" | "dropoffLocationId" | "dropoffPlace">) =>
  JSON.stringify([catalogCode, viTri, l.direction, l.pickupDate, l.pickupTime, l.pickupLocationId, l.pickupPlace, l.dropoffLocationId, l.dropoffPlace]);

/** Năm cột dấu của một dòng CSDL (chép nguyên — không đổi người, lúc, số phút đã chụp). */
export const datGapCuaDong = (r: LegDatGapRow): DatGapWrite =>
  ({ lyDo: r.short_notice_reason, ghiChu: r.short_notice_note, by: r.short_notice_by, at: r.short_notice_at, phut: r.short_notice_lead_minutes });

/**
 * Q1 = (a) (chủ 29/9: "Còn, nếu không đổi giờ/nơi"): lưu lại đơn nháp xoá–chèn lại chặng — chặng MỚI khớp ĐÚNG MỘT chặng CŨ đã đặt gấp (cùng mã danh mục +
 * vị trí dịch vụ, chiều, ngày, giờ, nơi đón, nơi trả) thì mang năm cột dấu của chặng cũ. Không khớp, hoặc khớp nhiều hơn một (hai chặng cũ / mới giống hệt)
 * → KHÔNG mang (an toàn: phải đặt gấp lại). Giá trị lấy từ dòng CŨ trong CSDL, không bao giờ từ thân trình duyệt (TC-25). Trả khoá `"<i>|<j>"`.
 */
export function chepDatGapNhap(cu: readonly LegDatGapRow[], moi: readonly ValidService[]): Map<string, DatGapWrite> {
  const demCu = new Map<string, LegDatGapRow[]>();
  for (const r of cu) {
    const k = khoa(r.catalog_code, r.sort_order, {
      direction: r.direction, pickupDate: r.pickup_date, pickupTime: r.pickup_time, pickupLocationId: r.pickup_location_id, pickupPlace: r.pickup_place,
      dropoffLocationId: r.dropoff_location_id, dropoffPlace: r.dropoff_place,
    });
    demCu.set(k, [...(demCu.get(k) ?? []), r]);
  }
  const demMoi = new Map<string, string[]>();
  moi.forEach((s, i) => s.legs.forEach((l, j) => {
    const k = khoa(s.catalogCode, i, l);
    demMoi.set(k, [...(demMoi.get(k) ?? []), `${i}|${j}`]);
  }));
  const out = new Map<string, DatGapWrite>();
  for (const [k, viTri] of demMoi) {
    const dong = demCu.get(k);
    if (viTri.length === 1 && dong?.length === 1) out.set(viTri[0]!, datGapCuaDong(dong[0]!));
  }
  return out;
}

/**
 * I14 (Q3 chủ: "Chỉ Quản trị, Toàn quyền"): sửa ngày / giờ / nơi của chặng đơn ĐÃ XÁC NHẬN khi min(giờ cũ, giờ mới) dưới mốc → cần ô `order.leg.short_notice`
 * + lý do trong CHÍNH lệnh sửa. Dấu cũ KHÔNG miễn (nó duyệt nội dung cũ). Chặng chưa chốt giờ ở cả hai phía → không xét (I13).
 */
export function duoiMocKhiSua(cu: { pickupDate: string | null; pickupTime: string | null } | null, moi: { pickupDate: string | null; pickupTime: string | null } | null, bayGioMs: number, phut: number): boolean {
  const xet = (l: { pickupDate: string | null; pickupTime: string | null } | null) =>
    l !== null && kiemMocDat({ ngayDon: l.pickupDate, gioDon: l.pickupTime, datGap: false }, bayGioMs, phut).duoiMoc;
  return xet(cu) || xet(moi);
}

/** I27: cảnh báo mốc khi lưu nháp (KHÔNG chặn lưu) — chặng có giờ, chưa đặt gấp, dưới mốc. `legKey` = id chặng. */
export function canhBaoMocCua(
  legs: readonly { id: string; pickupDate: string | null; pickupTime: string | null }[], daDatGap: ReadonlySet<string>, bayGioMs: number, phut: number,
): { legKey: string; phutConLai: number }[] {
  return legs.flatMap((l) => {
    const k = kiemMocDat({ ngayDon: l.pickupDate, gioDon: l.pickupTime, datGap: daDatGap.has(l.id) }, bayGioMs, phut);
    return k.duoiMoc ? [{ legKey: l.id, phutConLai: k.phutConLai }] : [];
  });
}

/**
 * Dấu đặt gấp trên chi tiết đơn THEO VAI (chủ H4 / N-14, 29/9 tối — "Trả lời lần 12"): `xemDu` (ô `order.leg.short_notice.view`) → giữ nguyên dấu ĐỦ;
 * ngược lại mỗi chặng có dấu chỉ còn cờ `{ daDuyet: true }` (khoá lý do, người, lúc, ghi chú VẮNG MẶT), chặng không dấu giữ `null`. Dựng đối tượng MỚI.
 */
export function datGapTheoVai(order: OrderDetailDto, xemDu: boolean): OrderDetailDto {
  if (xemDu) return order;
  return {
    ...order,
    services: order.services.map((s) => ({ ...s, legs: s.legs.map((l) => ({ ...l, datGap: l.datGap ? { daDuyet: true as const } : null })) })),
  };
}
