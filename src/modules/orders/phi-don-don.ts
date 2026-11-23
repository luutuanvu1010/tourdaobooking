// Phí đưa đón trên đơn do MÁY TÍNH (ADR-0218; thay ADR-0214 «văn phòng chọn mức»). Phần THUẦN phía `orders`: dựng đầu vào cho hàm tính của pricing (`tinhPhiDonGiaGoc` — đường tính duy nhất),
// đổi kết quả mỗi lượt thành dòng `order_item` nguồn mới (0179), lượt thiếu giá ⇒ THIEU (không bao giờ 0 đồng — Hiến chương 5.7), số đổi của văn phòng giữ theo id lượt, câu nhật ký. Không I/O (bài chạy thẳng bằng node).
import { CHIEU_LABEL } from "../../shared/chang-dua-don.ts";
import type { PaxCounts } from "../../shared/order-lines.ts";
import { payingGuests } from "../../shared/order-lines.ts";
import { maskLongDigits } from "../../shared/text-guards.ts";
import { CHU_MIEN_PHI, soTien } from "../../shared/phi-don-hien-thi.ts";
import type { LyDoThieuPhiDonDto, PhiDuaDonCuaDonDto, PhiDuaDonDto } from "../../shared/contracts";
import type { FeeRow, OrderItemRowPhiDon } from "./chang-hanh-khach-repo.ts";
import type { DauVaoLuotDon, KetQuaLuot } from "../../shared/phi-don-gia-goc.ts";

export type { OrderItemRowPhiDon };

/** Nội dung một dòng phí, chưa gắn id chặng (nơi sinh id chặng gắn `legId`). */
export type NoiDungPhi = Omit<OrderItemRowPhiDon, "legId">;
/** Khoá chặng của lần tính (vị trí `"<dịch vụ>|<chặng>"` khi lập / lưu nháp, hoặc id chặng khi sửa chặng / đọc / xác nhận) → dòng phí. */
export type PhiTheoChang = ReadonlyMap<string, NoiDungPhi>;
/** Số đổi của văn phòng cho một lượt đón (đơn giá: mỗi khách với đi chung, cả chuyến với xe riêng) + lý do + người đổi (id nhân viên). */
export interface DoiTayLuu { donGia: number; lyDo: string; nguoi: string }
/** Lượt đón còn mở máy chưa tính được: chiều + tên dịch vụ + lý do (`O_TRONG` ô giá gốc trống / dịch vụ nhập tay; `HAI_CAP` đối tác hai cấp) cho câu `cauThieuPhiDon`. */
export interface ThieuPhiNhap { legKey: string; serviceRef: string; tenDichVu: string; direction: "OUT" | "RETURN"; lyDo: LyDoThieuPhiDonDto }
export type KetQuaCoPhi = Extract<KetQuaLuot, { ketQua: "CO_PHI" }>;
/** `apDung` = phí đang áp ở ngày tính (công tắc «ngày bắt đầu áp» của pricing). Chưa áp ⇒ không dòng, không thiếu. `chiTiet` = kết quả từng lượt có phí (cho nhật ký). */
export interface PhiNhap { apDung: boolean; tong: number; theoChang: PhiTheoChang; thieu: ThieuPhiNhap[]; chiTiet: ReadonlyMap<string, KetQuaCoPhi> }
export const KHONG_PHI: PhiNhap = { apDung: false, tong: 0, theoChang: new Map(), thieu: [], chiTiet: new Map() };

/** Một dịch vụ (thân lập / lưu nháp, hoặc đang lưu) ở dạng đủ để tính phí: mã danh mục (null = nhập tay), số khách + chặng (chiều, xe riêng, số người chiều về, ngày đón, đã đóng). */
export interface DichVuChoPhi {
  ref: string;
  /** Tên dịch vụ (câu báo lượt đón chưa có phí). */
  ten: string;
  /** Mã danh mục của dịch vụ; null = dịch vụ nhập tay — không có dòng giá gốc nào, máy giữ đơn (O_TRONG) cho tới khi văn phòng đổi số. */
  catalogCode: string | null;
  pax: PaxCounts;
  legs: readonly { legKey: string; direction: "OUT" | "RETURN"; exclusiveVehicle?: boolean; paxOverride?: number | null; closed?: boolean; pickupDate?: string | null }[];
}

/** Đầu vào của hàm tính theo từng lượt còn mở (THUẦN). Số khách tính tiền = người lớn + trẻ em + người cao tuổi (`payingGuests` — luôn đếm NGƯỜI, kể cả dịch vụ nhóm). */
export function luotDauVao(dv: readonly DichVuChoPhi[], doiTay: ReadonlyMap<string, DoiTayLuu>): (DauVaoLuotDon & { serviceRef: string; tenDichVu: string })[] {
  return dv.flatMap((s) => s.legs.filter((l) => !l.closed).map((l) => ({
    luotKey: l.legKey, catalogCode: s.catalogCode, direction: l.direction, xeRieng: l.exclusiveVehicle ?? false, pickupDate: l.pickupDate ?? null,
    soKhachTinhTien: payingGuests(s.pax), paxOverride: l.paxOverride ?? null, doiTay: doiTay.get(l.legKey) ?? null, serviceRef: s.ref, tenDichVu: s.ten,
  })));
}

/**
 * Một lượt có phí → nội dung dòng `order_item` nguồn mới (0179; trigger tạo lại ở 0179 là lưới thứ hai): fee_source, fee_choice, mã mức, vùng TRỐNG; kiểu = PER_TRIP khi xe riêng; `feeReturnPax` = số người
 * chiều về GỐC (`paxOverride`, không phải số đã kẹp — «Sửa số khách» tính lại min(số đó, khách mới)) của chặng về đi chung. Mọi số đã qua `thanhTienDong` trong hàm tính.
 */
export function dongPhiTuKetQua(k: KetQuaCoPhi, v: { direction: "OUT" | "RETURN"; xeRieng: boolean; paxOverride: number | null }): NoiDungPhi {
  return {
    feeSource: null, feeChoice: null, feeRuleId: null, feeKind: k.kind, feeZoneCode: null, feeTierCode: k.tierCode,
    feeReturnPax: v.direction === "RETURN" && !v.xeRieng ? v.paxOverride : null,
    description: `Phí đưa đón — ${CHIEU_LABEL[v.direction].toLowerCase()}`, quantity: k.soLuong, unitPrice: k.donGia, lineTotal: k.tien,
    feeCalcSource: k.nguon, feeBasePrice: k.nguon === "GIA_GOC" ? k.giaGoc : null, feeTierDiscount: k.nguon === "GIA_GOC" ? k.mucGiam : null,
    feeProgramId: k.chuongTrinh?.id ?? null, feeProgramName: k.chuongTrinh?.name ?? null,
    feeOverrideReason: k.nguon === "DOI_TAY" ? k.lyDo : null, feeOverrideBy: k.nguon === "DOI_TAY" ? k.nguoi : null,
  };
}

/**
 * Phí của đơn khi phí ĐANG ÁP (THUẦN), từ kết quả hàm tính của pricing theo khoá lượt (`ketQua`; lượt số lượng 0 không có khoá ⇒ không dòng, không thiếu): lượt có phí ⇒ một dòng;
 * lượt THIEU ⇒ `thieu` (đơn không xác nhận được, Gửi đơn đi nhánh A).
 */
export function phiNhapMay(dv: readonly DichVuChoPhi[], ketQua: ReadonlyMap<string, KetQuaLuot>): PhiNhap {
  const theoChang = new Map<string, NoiDungPhi>();
  const chiTiet = new Map<string, KetQuaCoPhi>();
  const thieu: ThieuPhiNhap[] = [];
  let tong = 0;
  for (const s of dv) {
    for (const l of s.legs) {
      if (l.closed) continue;
      const k = ketQua.get(l.legKey);
      if (!k) continue;
      if (k.ketQua === "THIEU") { thieu.push({ legKey: l.legKey, serviceRef: s.ref, tenDichVu: s.ten, direction: l.direction, lyDo: k.lyDo }); continue; }
      theoChang.set(l.legKey, dongPhiTuKetQua(k, { direction: l.direction, xeRieng: l.exclusiveVehicle ?? false, paxOverride: l.paxOverride ?? null }));
      chiTiet.set(l.legKey, k);
      tong += k.tien;
    }
  }
  return { apDung: true, tong, theoChang, thieu, chiTiet };
}

/** Số đổi đã lưu theo id chặng, từ các dòng phí đã đọc (`feeRowsStatement`): chỉ dòng nguồn DOI_TAY (THUẦN). */
export function doiTayTuDong(rows: readonly Pick<FeeRow, "transfer_leg_id" | "fee_calc_source" | "unit_price" | "fee_override_reason" | "fee_override_by">[]): Map<string, DoiTayLuu> {
  const out = new Map<string, DoiTayLuu>();
  for (const r of rows) {
    if (r.fee_calc_source !== "DOI_TAY" || r.fee_override_reason === null || r.fee_override_by === null) continue;
    out.set(r.transfer_leg_id, { donGia: r.unit_price, lyDo: r.fee_override_reason, nguoi: r.fee_override_by });
  }
  return out;
}

/** Số đổi của thân lập / lưu nháp, khoá theo vị trí `"<dịch vụ>|<chặng>"`: khoá `doiPhi` có ⇒ số thân (`null` = bỏ đổi); VẮNG ⇒ giữ số đã lưu của chặng cùng id (kể cả người đổi gốc). */
export function doiTayTheoThan(
  services: readonly { legs: readonly { id: string | null; doiPhi?: { donGia: number; lyDo: string } | null }[] }[], daLuu: ReadonlyMap<string, DoiTayLuu>, nguoi: string,
): Map<string, DoiTayLuu> {
  const out = new Map<string, DoiTayLuu>();
  services.forEach((s, i) => s.legs.forEach((l, j) => {
    const cu = l.id !== null ? daLuu.get(l.id) : undefined;
    if (l.doiPhi === undefined) { if (cu) out.set(`${i}|${j}`, cu); return; }
    if (l.doiPhi === null) return;
    // Cùng số + cùng lý do với số đang lưu ⇒ giữ người đổi gốc (lưu lại nháp không đổi chủ số).
    out.set(`${i}|${j}`, cu && cu.donGia === l.doiPhi.donGia && cu.lyDo === l.doiPhi.lyDo ? cu : { donGia: l.doiPhi.donGia, lyDo: l.doiPhi.lyDo, nguoi });
  }));
  return out;
}

const NHAN_NGUON = { DOI_TAY: "đổi số", CHUONG_TRINH: "chương trình", GIA_GOC: "giá gốc" } as const;
/** Tóm tắt một dòng phí cho nhật ký (không tên khách; lý do đổi qua `maskLongDigits` — không để lọt số điện thoại). */
export interface TomTatPhi { nguon: "DOI_TAY" | "CHUONG_TRINH" | "GIA_GOC" | "CU"; donGia: number; soLuong: number; tenChuongTrinh: string | null; lyDo: string | null }
export const tomTatTuKetQua = (k: KetQuaCoPhi): TomTatPhi => ({ nguon: k.nguon, donGia: k.donGia, soLuong: k.soLuong, tenChuongTrinh: k.chuongTrinh?.name ?? null, lyDo: k.lyDo });
export const tomTatTuDongDaLuu = (r: Pick<FeeRow, "fee_calc_source" | "unit_price" | "quantity" | "fee_program_name" | "fee_override_reason">): TomTatPhi => ({
  nguon: r.fee_calc_source ?? "CU", donGia: r.unit_price, soLuong: r.quantity, tenChuongTrinh: r.fee_program_name, lyDo: r.fee_override_reason,
});
/** Tóm tắt từ DTO dòng phí đã đọc cùng đơn (không tốn câu đọc thêm) — cùng kết quả với `tomTatTuDongDaLuu`. */
export const tomTatTuDto = (d: Pick<PhiDuaDonDto, "nguon" | "unitPrice" | "quantity" | "tenChuongTrinh" | "lyDoDoi">): TomTatPhi => ({
  nguon: d.nguon ?? "CU", donGia: d.unitPrice, soLuong: d.quantity, tenChuongTrinh: d.tenChuongTrinh, lyDo: d.lyDoDoi,
});
const chuPhi = (t: TomTatPhi | null): string => {
  if (t === null) return "chưa có";
  const tien = t.donGia === 0 ? CHU_MIEN_PHI : `${soTien(t.donGia)} ₫ × ${t.soLuong}`;
  if (t.nguon === "CU") return `${tien} (dòng cũ)`;
  const them = t.nguon === "CHUONG_TRINH" && t.tenChuongTrinh ? ` «${maskLongDigits(t.tenChuongTrinh)}»` : t.nguon === "DOI_TAY" && t.lyDo ? `: ${maskLongDigits(t.lyDo)}` : "";
  return `${tien} (${NHAN_NGUON[t.nguon]}${them})`;
};
const cungPhi = (a: TomTatPhi | null, b: TomTatPhi | null): boolean =>
  a === null || b === null ? a === b : a.nguon === b.nguon && a.donGia === b.donGia && a.tenChuongTrinh === b.tenChuongTrinh && a.lyDo === b.lyDo;

/** Câu nhật ký đơn (ADR-0218 Đ1.7): mỗi lượt đón có phí ĐỔI (số, nguồn, chương trình, lý do — đổi số khách thì số lượng đổi theo, không phải «phí đổi») một mẩu «phí đưa đón chiều đi · <dịch vụ>: <cũ> → <mới>» — chiều, tên dịch vụ, số, nguồn, tên chương trình, lý do đổi; không tên khách. Không đổi ⇒ null. */
export function moTaPhiDonNhatKy(dong: readonly { chieu: "OUT" | "RETURN"; tenDichVu: string; cu: TomTatPhi | null; moi: TomTatPhi | null }[]): string | null {
  const manh = dong.filter((d) => !cungPhi(d.cu, d.moi)).map((d) => `phí đưa đón ${CHIEU_LABEL[d.chieu].toLowerCase()} · ${d.tenDichVu}: ${chuPhi(d.cu)} → ${chuPhi(d.moi)}`);
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
    loaiChon: r.fee_choice, nguon: r.fee_calc_source, tenChuongTrinh: r.fee_program_name, lyDoDoi: r.fee_override_reason, kind: r.fee_kind, returnPax: r.fee_return_pax, quantity: r.quantity, unitPrice: r.unit_price, lineTotal: r.line_total, description: r.description,
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

/** Bỏ lý do đổi phí khỏi DTO phí (THUẦN; dựng đối tượng MỚI) — cho người không có ô xem đặt gấp (`datGapTheoVai`). */
export const anLyDoDoiPhi = (p: PhiDuaDonCuaDonDto | null): PhiDuaDonCuaDonDto | null => (p ? { ...p, dong: p.dong.map((d) => ({ ...d, lyDoDoi: null })) } : p);
