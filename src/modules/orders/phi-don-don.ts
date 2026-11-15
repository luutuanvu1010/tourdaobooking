// Phí đưa đón trên đơn (Đợt C, Task 3; ADR-0147 Đ1–Đ3, ADR-0203; thiết kế 2026-11-14 §5, §7): phía `orders` chỉ LÀM PHẲNG chặng thành đầu vào của `pricing`
// (`tinhPhiDonChoDon` — một hàm tính duy nhất, cùng hàm với «Thử tra») và đổi dòng phí `pricing` trả về thành dòng `order_item`. Không có luật chọn mức ở đây.
// Tệp chỉ nhập KIỂU từ `../pricing` (bài thuần chạy thẳng bằng node — index của pricing không nạp được ngoài Worker); lời gọi `tinhPhiDonChoDon` nằm ở `service.ts`.
import type { ChangDauVao, DongPhiDon, KetQuaPhiDonDon } from "../pricing";
import type { PaxCounts } from "../../shared/order-lines.ts";
import { payingGuests } from "../../shared/order-lines.ts";
import type { PhiDuaDonCuaDonDto, PhiDuaDonDto } from "../../shared/contracts";
import type { FeeRow, OrderItemRowPhiDon } from "./chang-hanh-khach-repo.ts";

export type { OrderItemRowPhiDon };

/** Mã khu vực «Ngoài khu vực» (gieo sẵn ở 0164): đầu khách sạn gõ tay hoặc để trống. Địa điểm danh mục chưa xếp vùng thì view `v_loc_location_zone` tự quy về mã này. */
export const NGOAI_VUNG = "NGOAI_VUNG";

/**
 * Chặng của đơn → đầu vào tính phí. Vùng của chặng = vùng của ĐẦU KHÁCH SẠN: nơi đón ở chiều đi (`OUT`), nơi trả ở chiều về (`RETURN`) — ADR-0147 Đ1.
 * Đầu khách sạn là chữ gõ tay hoặc trống (id null), hoặc id không có trong bản đồ vùng ⇒ `NGOAI_VUNG`. Chặng đã đóng bị bỏ (chỉ chặng còn mở sinh dòng phí).
 * Số khách tính tiền = người lớn + trẻ em + người cao tuổi (`payingGuests` — em bé không tính; một công thức với dòng tiền).
 */
export function lamPhangChang(v: {
  services: readonly { ref: string; catalogCode: string | null; adult: number; child: number; senior: number }[];
  legs: readonly { legKey: string; serviceRef: string; direction: "OUT" | "RETURN"; pickupLocationId: string | null; dropoffLocationId: string | null; exclusive: boolean; paxOverride: number | null; closed: boolean }[];
  vung: ReadonlyMap<string, string>;
}): ChangDauVao[] {
  const theoRef = new Map(v.services.map((s) => [s.ref, s] as const));
  const out: ChangDauVao[] = [];
  for (const l of v.legs) {
    if (l.closed) continue;
    const s = theoRef.get(l.serviceRef);
    if (!s) continue;
    const dauKhachSan = l.direction === "OUT" ? l.pickupLocationId : l.dropoffLocationId;
    out.push({
      legKey: l.legKey,
      zoneCode: dauKhachSan === null ? NGOAI_VUNG : (v.vung.get(dauKhachSan) ?? NGOAI_VUNG),
      direction: l.direction,
      exclusive: l.exclusive,
      catalogCode: s.catalogCode,
      soKhachTinhTien: payingGuests(s),
      paxOverride: l.paxOverride,
    });
  }
  return out;
}

/**
 * Một dòng phí của `pricing` → nội dung dòng `order_item` loại phí. Mô tả «Phí đưa đón — chiều đi/về, <khu vực>». `chieu` là tham số thứ tư (dòng phí của
 * `pricing` không mang chiều — nơi gọi biết chiều của chặng).
 */
export function dongPhiThanhItem(d: DongPhiDon, legId: string, tenVung: string, chieu: "OUT" | "RETURN"): OrderItemRowPhiDon {
  return {
    legId, feeRuleId: d.ruleId, feeKind: d.kind, feeZoneCode: d.zoneCode, feeTierCode: d.tierCode, feeReturnPax: d.returnPax,
    description: `Phí đưa đón — ${chieu === "OUT" ? "chiều đi" : "chiều về"}, ${tenVung}`, quantity: d.soLuong, unitPrice: d.donGia, lineTotal: d.tien,
  };
}

/** Một chặng (theo khoá của lần tính) → dòng phí + tên khu vực + chiều — đủ để nơi sinh id chặng gọi `dongPhiThanhItem`. */
export type PhiTheoChang = ReadonlyMap<string, { dong: DongPhiDon; tenVung: string; chieu: "OUT" | "RETURN" }>;
export interface PhiNhap { ketQua: KetQuaPhiDonDon; tong: number; theoChang: PhiTheoChang; ten: ReadonlyMap<string, string> }
export const KHONG_PHI: PhiNhap = { ketQua: { apDung: false }, tong: 0, theoChang: new Map(), ten: new Map() };

/** Ghép kết quả của `pricing` với chiều của chặng và tên khu vực (THUẦN). */
export function ghepPhiNhap(ketQua: KetQuaPhiDonDon, chang: readonly ChangDauVao[], ten: ReadonlyMap<string, string>): PhiNhap {
  if (!ketQua.apDung) return { ...KHONG_PHI, ketQua, ten };
  const chieu = new Map(chang.map((c) => [c.legKey, c.direction] as const));
  const theoChang = new Map(ketQua.dong.map((d) => [d.legKey, { dong: d, tenVung: ten.get(d.zoneCode) ?? d.zoneCode, chieu: chieu.get(d.legKey) ?? "OUT" }] as const));
  return { ketQua, tong: ketQua.dong.reduce((t, d) => t + d.tien, 0), theoChang, ten };
}

/** Một dịch vụ (đầu vào của ValidService hoặc đang lưu) ở dạng đủ để làm phẳng chặng. */
export interface DichVuChoPhi {
  ref: string;
  catalogCode: string | null;
  pax: PaxCounts;
  legs: readonly { legKey: string; direction: "OUT" | "RETURN"; pickupLocationId: string | null; dropoffLocationId: string | null; exclusiveVehicle?: boolean; paxOverride?: number | null; closed?: boolean }[];
}
export function dauVaoLamPhang(dv: readonly DichVuChoPhi[], vung: ReadonlyMap<string, string>): ChangDauVao[] {
  return lamPhangChang({
    services: dv.map((s) => ({ ref: s.ref, catalogCode: s.catalogCode, adult: s.pax.adult, child: s.pax.child, senior: s.pax.senior })),
    legs: dv.flatMap((s) => s.legs.map((l) => ({
      legKey: l.legKey, serviceRef: s.ref, direction: l.direction, pickupLocationId: l.pickupLocationId, dropoffLocationId: l.dropoffLocationId,
      exclusive: l.exclusiveVehicle ?? false, paxOverride: l.paxOverride ?? null, closed: l.closed ?? false,
    }))),
    vung,
  });
}
export const diaDiemKhachSan = (dv: readonly DichVuChoPhi[]): string[] =>
  dv.flatMap((s) => s.legs.flatMap((l) => { const id = l.direction === "OUT" ? l.pickupLocationId : l.dropoffLocationId; return id === null ? [] : [id]; }));

/** Dòng phí đã lưu (kết quả `feeRowsStatement`) → DTO (THUẦN). */
export function phiDongDto(rows: readonly FeeRow[]): PhiDuaDonDto[] {
  return rows.map((r) => ({
    id: r.id, legId: r.transfer_leg_id, serviceId: r.order_service_id, direction: r.direction, zoneCode: r.fee_zone_code, zoneName: r.zone_name ?? r.fee_zone_code,
    tierCode: r.fee_tier_code, kind: r.fee_kind, quantity: r.quantity, unitPrice: r.unit_price, lineTotal: r.line_total, description: r.description,
  }));
}

/**
 * `OrderDto.phiDuaDon` (THUẦN): `dong` LUÔN là dòng phí đã lưu trên đơn (khớp tạm tính), không từ chặng đang mở. `thieu` chỉ có ở đơn NHÁP (kết quả tính lúc đọc,
 * khoá chặng = id chặng). null = không dòng phí nào và không chặng nào thiếu mức (phí chưa áp, hoặc đơn không có chặng mở). `duKien` = đơn còn nháp (chữ «dự kiến»).
 */
export function phiDuaDonDto(v: { nhap: boolean; dong: readonly PhiDuaDonDto[]; songNhap: PhiNhap | null }): PhiDuaDonCuaDonDto | null {
  const kq = v.nhap && v.songNhap !== null ? v.songNhap.ketQua : null;
  const ten = v.songNhap?.ten ?? new Map<string, string>();
  const thieu = kq && kq.apDung ? kq.thieu.map((t) => ({ legId: t.legKey, zoneName: ten.get(t.zoneCode) ?? t.zoneCode, lyDo: t.lyDo })) : [];
  if (v.dong.length === 0 && thieu.length === 0) return null;
  return { dong: [...v.dong], thieu, duKien: v.nhap };
}
