// LUẬT TIỀN XE THUÊ (ADR-0057 T1 B2, T2 C6) — MỘT nguồn tính (Hiến chương 5.4). Thuần, không I/O, không import module khác. Mọi đường (lô chuyến, route
// chi phí, bảng kê, sổ vàng) đi qua các hàm ở đây; hàng rào src/tien-xe-mot-nguon.test.ts đỏ khi cộng tiền chi phí ở chỗ khác.
export interface CoXe { code: string; min: number; max: number; active: boolean }
export interface DongGiaThue { id: string; carrierPartyId: string; routeCode: string | null; sizeCode: string | null; amount: number; validFrom: string; validTo: string | null }

const HET = "9999-12-31";
const conHieuLuc = (d: { validFrom: string; validTo: string | null }, ngay: string) => d.validFrom <= ngay && ngay <= (d.validTo ?? HET);

/** Cỡ xe suy từ số khách (không kể tài xế — `vc_vehicle.passenger_capacity`), chỉ cỡ đang dùng. Khoảng không chồng (CSDL giữ) ⇒ nhiều nhất một. */
export function coXeCua(soKhach: number, coXe: readonly CoXe[]): string | null {
  return coXe.find((c) => c.active && c.min <= soKhach && soKhach <= c.max)?.code ?? null;
}

/**
 * Dòng đang hiệu lực vào ngày chạy, đúng nhà xe, khớp ĐỦ tuyến VÀ cỡ xe — ADR-0095 Q3 (vòng sửa 2, B; thay thứ bậc "tuyến > cỡ" của ADR-0057 B2 / Q3 a:
 * bỏ bậc "chỉ tuyến", "chỉ cỡ"). Chưa chọn tuyến, xe ngoài mọi cỡ, hay không dòng khớp → null (chưa có giá ⇒ giá thoả thuận).
 */
export function chonDongGiaThue(v: { carrierPartyId: string; routeCode: string | null; sizeCode: string | null; ngayChay: string }, dong: readonly DongGiaThue[]): DongGiaThue | null {
  if (v.routeCode === null || v.sizeCode === null) return null;
  return dong.find((d) => d.carrierPartyId === v.carrierPartyId && conHieuLuc(d, v.ngayChay) && d.routeCode === v.routeCode && d.sizeCode === v.sizeCode) ?? null;
}

/** Dòng (khác `boQuaId`) cùng khoá (nhà xe, tuyến, cỡ — trống so với trống) có khoảng ngày giao với dòng mới (hai đầu tính cả). Lớp máy chủ của trigger chồng giá. */
export function dongChongGia(moi: Omit<DongGiaThue, "id" | "amount">, dong: readonly DongGiaThue[], boQuaId?: string): DongGiaThue | null {
  return dong.find((d) => d.id !== boQuaId && d.carrierPartyId === moi.carrierPartyId && d.routeCode === moi.routeCode && d.sizeCode === moi.sizeCode
    && d.validFrom <= (moi.validTo ?? HET) && moi.validFrom <= (d.validTo ?? HET)) ?? null;
}

/** Số tiền dạng chữ cho nhật ký / lời báo: 1200000 → "1.200.000", −150000 → "−150.000" (tất định, không phụ thuộc Intl). */
export const chuTien = (n: number): string => `${n < 0 ? "−" : ""}${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

// ---- T2: chi phí chuyến (ADR-0057 C3, C4, C6, C8) ----------------------------------------------------------------------------------------------------------
export type LoaiDongChiPhi = "SNAPSHOT" | "AGREED" | "ADJUSTMENT" | "REVERSAL";
export interface DongChiPhi { id: string; kind: LoaiDongChiPhi; amount: number; reversesId: string | null; reasonCode: string | null; createdAt: string }
export type TrangThaiChuyenTien = "PLANNED" | "RUNNING" | "ENDED" | "ENDED_INTERRUPTED" | "CANCELLED";

/** MỘT nguồn tính tổng chi phí chuyến (ADR-0057 C6). Dòng đảo là số có dấu ngược ⇒ tổng = cộng mọi dòng. */
export function tongChiPhiChuyen(dong: readonly DongChiPhi[]): number {
  let t = 0;
  for (const d of dong) t += d.amount;
  return t;
}
const daBiDao = (dong: readonly DongChiPhi[]) => new Set(dong.filter((d) => d.kind === "REVERSAL").map((d) => d.reversesId));
/** Dòng còn hiệu lực: không phải dòng đảo, chưa bị đảo. */
export function dongConHieuLuc(dong: readonly DongChiPhi[]): DongChiPhi[] {
  const dao = daBiDao(dong);
  return dong.filter((d) => d.kind !== "REVERSAL" && !dao.has(d.id));
}
/** Nguồn giá còn hiệu lực (SNAPSHOT | AGREED chưa đảo) — nhiều nhất một (trigger một nguồn giá). */
export function nguonGiaConHieuLuc(dong: readonly DongChiPhi[]): DongChiPhi | null {
  return dongConHieuLuc(dong).find((d) => d.kind === "SNAPSHOT" || d.kind === "AGREED") ?? null;
}
/** Mới nhất trước: createdAt giảm dần; cùng mốc giờ ⇒ ghi SAU (vị trí sau trong danh sách theo thứ tự ghi) đứng trước — "gỡ ngược" trong mỗi nhóm dấu. */
const moiNhatTruoc = (ds: readonly DongChiPhi[]): DongChiPhi[] =>
  ds.map((d, i) => ({ d, i })).sort((a, b) => (a.d.createdAt === b.d.createdAt ? b.i - a.i : a.d.createdAt < b.d.createdAt ? 1 : -1)).map((x) => x.d);
/**
 * ADR-0057 C8 "thứ tự đảo": các dòng ÂM trước (đảo ⇒ tổng tăng), rồi DƯƠNG (tổng giảm dần về 0) ⇒ trigger "tổng ≥ 0" canh được từng dòng. Trong mỗi nhóm:
 * mới nhất trước (khớp ví dụ vàng V7: đảo phụ thu rồi mới đảo giá bảng). `dong` theo THỨ TỰ GHI (như `costLinesOfTrip` đọc).
 */
export function thuTuDaoTatCa(dong: readonly DongChiPhi[]): DongChiPhi[] {
  const con = dongConHieuLuc(dong);
  return [...moiNhatTruoc(con.filter((d) => d.amount < 0)), ...moiNhatTruoc(con.filter((d) => d.amount > 0))];
}
/**
 * DÒNG NÀO BỊ ĐẢO khi lô chuyến tính lại (đổi xe / nhà xe / tuyến / ngày chạy — "DOI_CHUYEN") hoặc huỷ chuyến ("HUY_CHUYEN") — MỘT chỗ quyết (vòng sửa 3, H1).
 * Hiện: MỌI dòng còn hiệu lực theo `thuTuDaoTatCa` (ADR-0057 C4), KỂ CẢ "Phí huỷ muộn" đã ghi cho nhà xe cũ trên chuyến đã đổi sang xe công ty — ADR-0095
 * Q5 chưa nói ⇒ CHỜ CHỦ (H1). Chủ chọn giữ phí đó thì đổi Ở ĐÂY (+ R-VC-COST-4); bài ghim: tien-xe.test.ts "dongBiDaoKhi", tien-xe-route.test.ts "H1".
 */
export function dongBiDaoKhi(dong: readonly DongChiPhi[], _khi: "DOI_CHUYEN" | "HUY_CHUYEN"): DongChiPhi[] {
  return thuTuDaoTatCa(dong);
}
/** Cờ xe thuê (ADR C2a): chủ là công ty chủ ⇒ 0; chủ đang mở vai nhà xe ⇒ 1; còn lại (đã thôi vai) ⇒ giữ cờ cũ khi đổi xe (cấm hạ), 0 khi tạo mới. */
export function phanLoaiThue(v: { chuXePartyId: string; congTyChuId: string | null; nhaXeDangMo: ReadonlySet<string>; cuRented: 0 | 1 | null }): 0 | 1 {
  if (v.chuXePartyId === v.congTyChuId) return 0;
  if (v.nhaXeDangMo.has(v.chuXePartyId)) return 1;
  return v.cuRented === 1 ? 1 : 0;
}
/** Tổng tiền các ĐIỀU CHỈNH chưa đảo (cột "Điều chỉnh" của bảng kê — đánh giá bản vẽ Đợt 4 Q2). */
export function tongDieuChinh(dong: readonly DongChiPhi[]): number {
  return tongChiPhiChuyen(dongConHieuLuc(dong).filter((d) => d.kind === "ADJUSTMENT"));
}
/** Tổng bảng kê (nhóm nhà xe / toàn bảng) = cộng các tổng chuyến ĐÃ qua `tongChiPhiChuyen`. */
export const tongBangKe = (chuyen: readonly { tong: number }[]): number => chuyen.reduce((t, c) => t + c.tong, 0);
/**
 * Dòng `d` có ĐƯỢC đảo không (luật cấu trúc — nút "Đảo dòng" của màn; máy chủ kiểm lại ở route): không đảo dòng đảo, không đảo dòng đã bị đảo; nguồn giá
 * (SNAPSHOT / AGREED) chỉ đảo khi chuyến còn lập kế hoạch (ADR C4 — trigger `vc_cost_planned_only`). Tổng sau đảo ≥ 0 KHÔNG xét ở đây (lỗi `tong_am` lúc ghi).
 */
export function daoDuoc(dong: readonly DongChiPhi[], d: DongChiPhi, trangThai: TrangThaiChuyenTien): boolean {
  if (d.kind === "REVERSAL" || daBiDao(dong).has(d.id)) return false;
  if (d.kind === "SNAPSHOT" || d.kind === "AGREED") return trangThai === "PLANNED";
  return true;
}

/**
 * NGÀY GHI của dòng đảo (ADR-0095 Q2, vòng sửa 2 SV-1): MỘT hàm cho mọi đảo (tự động khi đổi xe / nhà xe / tuyến / ngày, khi huỷ; đảo tay). Mang ngày phát
 * sinh của DÒNG GỐC (kỳ cũ về 0 — vd chuyến 31/10 dời sang 01/11: đảo −1.000.000 ngày 31/10, chụp mới ngày 01/11). Kỳ của dòng gốc ĐÃ KHOÁ ⇒ ngày hiện tại.
 * CHỖ NỐI khoá kỳ (ADR-0080, module `ky-so` — CHƯA có trên main): khi có, truyền `kyDaKhoa` đọc `v_ky_closed_period`; hôm nay không truyền ⇒ luôn ngày gốc.
 */
export function ngayGhiDao(goc: { occurredDate: string }, v: { homNay: string; kyDaKhoa?: (ngay: string) => boolean }): string {
  return v.kyDaKhoa?.(goc.occurredDate) ? v.homNay : goc.occurredDate;
}

/**
 * NGÀY PHÁT SINH MẶC ĐỊNH của dòng điều chỉnh (ADR-0095 Q4): chuyến ĐÃ HUỶ ⇒ NGÀY HUỶ (phí huỷ muộn là ràng buộc hợp đồng, ghi theo ngày huỷ — vòng sửa 2
 * C1); chuyến CHƯA huỷ ⇒ NGÀY CHẠY (`service_date` — phụ thu chờ, cầu đường… phát sinh trong chuyến; vòng sửa 3 M1). KHÔNG dùng "hôm nay". Người ghi chọn
 * ngày khác thì dùng ngày đó (không qua hàm này).
 */
export function ngayDieuChinhMacDinh(v: { trangThai: TrangThaiChuyenTien; ngayHuy: string | null; ngayChay: string }): string {
  return v.trangThai === "CANCELLED" && v.ngayHuy !== null ? v.ngayHuy : v.ngayChay;
}

/**
 * Đặt giá được không (ADR-0057 C5 — "lấy lại giá bảng" / "giá thoả thuận"): chuyến chưa xuất bến, xe thuê, chưa có nguồn giá còn hiệu lực, nhà xe đang hợp tác.
 * MỘT luật cho cờ `coTheNhapThoaThuan` / `coTheChupLai` của DTO và cho việc tra `giaBangCoThe` (Task 13).
 */
export function datGiaDuoc(v: { trangThai: TrangThaiChuyenTien; rented: number; dong: readonly DongChiPhi[]; nhaXeDangHopTac: boolean }): boolean {
  return v.trangThai === "PLANNED" && v.rented === 1 && nguonGiaConHieuLuc(v.dong) === null && v.nhaXeDangHopTac;
}

/** Lý do "Phí huỷ muộn" — ràng buộc hợp đồng với nhà xe (ADR-0095 Q4, Q5). */
export const LY_DO_PHI_HUY_MUON = "CPX_HUY_MUON";
/**
 * Điều chỉnh tay được với lý do này không (ADR-0095 Q5, vòng sửa 2 mục 4.7): chuyến xe thuê, hoặc chuyến đã huỷ ⇒ mọi lý do người ghi; chuyến KHÔNG còn là
 * xe thuê (đã đổi sang xe công ty) mà chưa huỷ ⇒ CHỈ "Phí huỷ muộn" cho nhà xe cũ (dòng mang nhà xe chịu chi phí — `nhaXeChiuChiPhi`).
 */
export function dieuChinhDuoc(v: { rented: number; trangThai: TrangThaiChuyenTien; lyDo: string }): boolean {
  return v.rented === 1 || v.trangThai === "CANCELLED" || v.lyDo === LY_DO_PHI_HUY_MUON;
}

/** Mã lý do đảo tự động khi đổi chuyến (xe, nhà xe, tuyến, ngày chạy) — mã hệ thống, `MA_LY_DO_HE_THONG`. */
export const LY_DO_DAO_DOI_CHUYEN = "CPX_DOI_CHUYEN";
/** Loại nguồn giá còn hiệu lực: giá bảng (SNAPSHOT) / giá thoả thuận (AGREED) / chưa có. */
export function loaiNguonGia(dong: readonly DongChiPhi[]): "BANG" | "THOA_THUAN" | null {
  const n = nguonGiaConHieuLuc(dong);
  return n === null ? null : n.kind === "SNAPSHOT" ? "BANG" : "THOA_THUAN";
}
/** Đếm điều chỉnh (bảng kê): số điều chỉnh còn hiệu lực; số điều chỉnh bị đảo DO ĐỔI CHUYẾN (dòng đảo mang `CPX_DOI_CHUYEN`). Không tiền. */
export function demDieuChinh(dong: readonly DongChiPhi[]): { soDieuChinh: number; soDieuChinhBiDao: number } {
  const daoDoDoi = new Set(dong.filter((d) => d.kind === "REVERSAL" && d.reasonCode === LY_DO_DAO_DOI_CHUYEN).map((d) => d.reversesId));
  return {
    soDieuChinh: dongConHieuLuc(dong).filter((d) => d.kind === "ADJUSTMENT").length,
    soDieuChinhBiDao: dong.filter((d) => d.kind === "ADJUSTMENT" && daoDoDoi.has(d.id)).length,
  };
}
/**
 * Nhà xe CHỊU chi phí của chuyến (bảng kê "trả nhà xe nào", nhà xe của dòng điều chỉnh): nhà xe của nguồn giá GHI GẦN NHẤT (kể cả đã đảo — vd chuyến đã đổi sang
 * xe công ty rồi huỷ, phí huỷ muộn vẫn thuộc nhà xe cũ); chưa từng có nguồn giá ⇒ chủ xe chụp của chuyến. `dong` theo THỨ TỰ GHI.
 */
export function nhaXeChiuChiPhi(dong: readonly { kind: LoaiDongChiPhi; carrierPartyId: string }[], chuXeChuyen: string): string {
  for (let i = dong.length - 1; i >= 0; i--) if (dong[i]!.kind === "SNAPSHOT" || dong[i]!.kind === "AGREED") return dong[i]!.carrierPartyId;
  return chuXeChuyen;
}
export type NhomBangKe ="DA_PHAT_SINH" | "CHUA_CHAY" | "DANG_CHAY" | "DA_HUY" | "THIEU_GIA";
/** Nhóm trạng thái của một dòng bảng kê (ADR-0057 C4 "đã phát sinh" = kết thúc / kết thúc gián đoạn; chưa chạy mà là xe thuê thiếu nguồn giá = "chưa có giá"). */
export function nhomBangKe(trangThai: TrangThaiChuyenTien, thue: boolean, coNguonGia: boolean): NhomBangKe {
  if (trangThai === "CANCELLED") return "DA_HUY";
  if (trangThai === "ENDED" || trangThai === "ENDED_INTERRUPTED") return "DA_PHAT_SINH";
  if (trangThai === "RUNNING") return "DANG_CHAY";
  return thue && !coNguonGia ? "THIEU_GIA" : "CHUA_CHAY";
}
