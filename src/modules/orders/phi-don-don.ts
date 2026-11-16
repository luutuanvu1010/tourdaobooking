// Phí đưa đón trên đơn (Đợt C — ADR-0147 Đ3, ADR-0203 ĐB3; từ ADR-0214: mức do VĂN PHÒNG CHỌN, không còn tra bảng phí theo khu vực). Phần THUẦN phía `orders`: mức theo chặng
// (thân lập / lưu nháp, hoặc mức đã lưu trong dòng phí theo id chặng), chặng → dòng `order_item` loại phí nguồn CHON (công thức `tinhPhiChon` của src/shared/phi-don-chon.ts — một
// nguồn với giao diện), chặng mở chưa chọn ⇒ CHUA_CHON (không bao giờ 0 đồng — Hiến chương 5.7), DTO và câu nhật ký khi mức đổi. Không I/O (bài chạy thẳng bằng node).
import { CHIEU_LABEL } from "../../shared/chang-dua-don.ts";
import type { PaxCounts } from "../../shared/order-lines.ts";
import { payingGuests } from "../../shared/order-lines.ts";
import { tinhPhiChon, type MucChon } from "../../shared/phi-don-chon.ts";
import { mucDaLuuTheoLuot } from "../../shared/phi-don-o-chon.ts";
import { CHU_MIEN_PHI, soTien } from "../../shared/phi-don-hien-thi.ts";
import type { LyDoThieuPhiDonDto, PhiDuaDonCuaDonDto, PhiDuaDonDto } from "../../shared/contracts";
import type { FeeRow, OrderItemRowPhiDon } from "./chang-hanh-khach-repo.ts";

export type { OrderItemRowPhiDon };

/** Nội dung một dòng phí, chưa gắn id chặng (nơi sinh id chặng gắn `legId`). */
export type NoiDungPhi = Omit<OrderItemRowPhiDon, "legId">;
/** Khoá chặng của lần tính (vị trí `"<dịch vụ>|<chặng>"` khi lập / lưu nháp, hoặc id chặng khi sửa chặng / đọc) → dòng phí. */
export type PhiTheoChang = ReadonlyMap<string, NoiDungPhi>;
/** Lượt đón còn mở chưa chọn mức: chiều + tên dịch vụ cho câu «Chọn phí đưa đón cho lượt đón …» (`cauThieuPhiDon`). */
export interface ThieuPhiNhap { legKey: string; serviceRef: string; tenDichVu: string; direction: "OUT" | "RETURN"; lyDo: LyDoThieuPhiDonDto }
/** `apDung` = phí đang áp ở ngày tính (công tắc «ngày bắt đầu áp» của pricing). Chưa áp ⇒ không dòng, không thiếu. */
export interface PhiNhap { apDung: boolean; tong: number; theoChang: PhiTheoChang; thieu: ThieuPhiNhap[] }
export const KHONG_PHI: PhiNhap = { apDung: false, tong: 0, theoChang: new Map(), thieu: [] };

/** Một dịch vụ (thân lập / lưu nháp, hoặc đang lưu) ở dạng đủ để tính phí: số khách + chặng (chiều, xe riêng, số người chiều về, đã đóng). */
export interface DichVuChoPhi {
  ref: string;
  /** Tên dịch vụ (câu báo lượt đón chưa chọn phí). */
  ten: string;
  pax: PaxCounts;
  legs: readonly { legKey: string; direction: "OUT" | "RETURN"; exclusiveVehicle?: boolean; paxOverride?: number | null; closed?: boolean }[];
}

/**
 * Một chặng có mức → nội dung dòng phí nguồn CHON (ADR-0214; trigger 0173): không mã mức / vùng / cấp; kiểu = PER_TRIP khi xe riêng, PER_PAX khi đi chung; `feeReturnPax` = số người
 * chiều về GỐC (`paxOverride`, không phải số đã kẹp — «Sửa số khách» tính lại min(số đó, khách mới)) của chặng về đi chung. Không có khách tính tiền ⇒ null (không dòng).
 */
export function dongPhiThanhItem(v: { muc: MucChon; xeRieng: boolean; direction: "OUT" | "RETURN"; soKhachTinhTien: number; paxOverride: number | null }): NoiDungPhi | null {
  const t = tinhPhiChon(v);
  if (t === null) return null;
  return {
    feeSource: "CHON", feeChoice: v.muc.loai, feeRuleId: null, feeKind: v.xeRieng ? "PER_TRIP" : "PER_PAX", feeZoneCode: null, feeTierCode: null,
    feeReturnPax: v.direction === "RETURN" && !v.xeRieng ? v.paxOverride : null,
    description: `Phí đưa đón — ${CHIEU_LABEL[v.direction].toLowerCase()}`, quantity: t.soLuong, unitPrice: t.donGia, lineTotal: t.tien,
  };
}

/**
 * Phí của đơn khi phí ĐANG ÁP (THUẦN): mỗi chặng còn mở có mức (`muc` theo khoá chặng) ⇒ một dòng; không mức ⇒ `thieu` lý do CHUA_CHON. Số khách tính tiền = người lớn + trẻ em
 * + người cao tuổi (`payingGuests` — em bé không tính; một công thức với dòng tiền).
 */
export function phiNhapChon(dv: readonly DichVuChoPhi[], muc: ReadonlyMap<string, MucChon>): PhiNhap {
  const theoChang = new Map<string, NoiDungPhi>();
  const thieu: ThieuPhiNhap[] = [];
  let tong = 0;
  for (const s of dv) {
    for (const l of s.legs) {
      if (l.closed) continue;
      const m = muc.get(l.legKey);
      if (!m) {
        thieu.push({ legKey: l.legKey, serviceRef: s.ref, tenDichVu: s.ten, direction: l.direction, lyDo: "CHUA_CHON" });
        continue;
      }
      const d = dongPhiThanhItem({ muc: m, xeRieng: l.exclusiveVehicle ?? false, direction: l.direction, soKhachTinhTien: payingGuests(s.pax), paxOverride: l.paxOverride ?? null });
      if (d === null) continue;
      theoChang.set(l.legKey, d);
      tong += d.lineTotal;
    }
  }
  return { apDung: true, tong, theoChang, thieu };
}

/**
 * Mức của thân lập / lưu nháp, khoá theo vị trí `"<dịch vụ>|<chặng>"` (cùng khoá với nơi sinh id chặng ở repository `legWrites`): khoá `phiDon` có ⇒ mức thân (null = bỏ chọn);
 * VẮNG ⇒ giữ mức đã lưu của chặng cùng id (`daLuu` theo id chặng — khuôn «khoá vắng = giữ» của các ô phụ chặng); chặng mới vắng khoá ⇒ chưa chọn.
 */
export function mucTheoThan(services: readonly { legs: readonly { id: string | null; phiDon?: MucChon | null }[] }[], daLuu: ReadonlyMap<string, MucChon>): Map<string, MucChon> {
  const out = new Map<string, MucChon>();
  services.forEach((s, i) => s.legs.forEach((l, j) => {
    const m = l.phiDon !== undefined ? l.phiDon : l.id !== null ? (daLuu.get(l.id) ?? null) : null;
    if (m) out.set(`${i}|${j}`, m);
  }));
  return out;
}

/** Mức đã lưu theo id chặng (THUẦN): chỉ dòng do văn phòng chọn (có kiểu chọn); dòng bảng phí cũ của Đợt C coi như chưa chọn (ruling P6). MỘT luật với giao diện (`src/shared/phi-don-o-chon.ts`). */
export const mucDaLuuTheoChang = mucDaLuuTheoLuot;

const chuMuc = (m: MucChon | null): string =>
  m === null ? "chưa chọn" : m.loai === "DANH_SACH" && m.soTien === 0 ? CHU_MIEN_PHI : `${soTien(m.soTien)} ₫ (${m.loai === "DANH_SACH" ? "trong danh sách" : "số khác"})`;
const cungMuc = (a: MucChon | null, b: MucChon | null): boolean => (a === null || b === null ? a === b : a.loai === b.loai && a.soTien === b.soTien);

/** Câu nhật ký đơn (ADR-0214 Đ2): mỗi lượt đón có mức ĐỔI một mẩu «phí đưa đón chiều đi · <dịch vụ>: <cũ> → <mới>» — chiều, tên dịch vụ, mức, kiểu chọn; không tên khách. Không đổi ⇒ null. */
export function moTaPhiDonNhatKy(dong: readonly { chieu: "OUT" | "RETURN"; tenDichVu: string; cu: MucChon | null; moi: MucChon | null }[]): string | null {
  const manh = dong.filter((d) => !cungMuc(d.cu, d.moi)).map((d) => `phí đưa đón ${CHIEU_LABEL[d.chieu].toLowerCase()} · ${d.tenDichVu}: ${chuMuc(d.cu)} → ${chuMuc(d.moi)}`);
  return manh.length === 0 ? null : manh.join("; ");
}

/**
 * Câu báo 409 `transfer_fee_missing` của cửa xác nhận — thân hàm ở `src/shared/phi-don-hien-thi.ts` để băng báo trên trang đơn nháp dùng ĐÚNG câu này (giao diện không được nạp
 * `src/modules/`); ở đây chỉ chuyển tiếp.
 */
export { cauThieuPhiDon } from "../../shared/phi-don-hien-thi.ts";

/** Dòng phí đã lưu (kết quả `feeRowsStatement`) → DTO (THUẦN). */
export function phiDongDto(rows: readonly FeeRow[]): PhiDuaDonDto[] {
  return rows.map((r) => ({
    id: r.id, legId: r.transfer_leg_id, serviceId: r.order_service_id, direction: r.direction, zoneCode: r.fee_zone_code, zoneName: r.zone_name ?? r.fee_zone_code,
    loaiChon: r.fee_choice, kind: r.fee_kind, returnPax: r.fee_return_pax, quantity: r.quantity, unitPrice: r.unit_price, lineTotal: r.line_total, description: r.description,
  }));
}

/**
 * `OrderDto.phiDuaDon` (THUẦN): `dong` LUÔN là dòng phí đã lưu trên đơn (khớp tạm tính), không từ chặng đang mở. `thieu` chỉ có ở đơn NHÁP (kết quả tính lúc đọc, khoá chặng = id
 * chặng, `serviceRef` = id dịch vụ). null = không dòng phí nào và không chặng nào thiếu (phí chưa áp, hoặc đơn không có chặng mở). `duKien` = đơn còn nháp (chữ «dự kiến»).
 */
export function phiDuaDonDto(v: { nhap: boolean; dong: readonly PhiDuaDonDto[]; songNhap: PhiNhap | null }): PhiDuaDonCuaDonDto | null {
  const thieu = v.nhap && v.songNhap?.apDung
    ? v.songNhap.thieu.map((t) => ({ legId: t.legKey, serviceId: t.serviceRef, serviceName: t.tenDichVu, direction: t.direction, lyDo: t.lyDo }))
    : [];
  if (v.dong.length === 0 && thieu.length === 0) return null;
  return { dong: [...v.dong], thieu, duKien: v.nhap };
}
