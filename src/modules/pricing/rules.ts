// LUẬT THUẦN của sổ đại lý đợt 1 (ADR-0077, ADR-0078 B1; đặc tả docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md §4).
// Không I/O, không import module khác. MỘT hàm chọn mức (`chonMuc`), MỘT hàm chọn điều khoản (`chonDieuKhoan`), MỘT cách làm tròn (`lamTronNuaLen`).
// Tỷ lệ tính bằng phần vạn (1250 = 12,5%). Thành tiền / số khách là số HIỆN HÀNH của dòng; mức là mức ĐÃ CHỤP (A-2).
import { parseUnit, payingGuests, type PaxCounts } from "../../shared/order-lines.ts";

export type KieuMuc = "RATE" | "PER_PAX";
export type PhamVi = "SERVICE" | "GROUP" | "ALL";
export type LyDoThieu = "NO_RULE" | "RULE_CONFLICT" | "MANUAL_LINE" | "BOOKER_NOT_BENEFICIARY" | "NOT_CAPTURED";

export interface DongMuc {
  id: string;
  targetPartyId: string | null;
  targetRoleCode: string | null;
  scope: PhamVi;
  catalogCode: string | null;
  groupCode: string | null;
  kind: KieuMuc;
  rateBp: number | null;
  perPaxAmount: number | null;
  validFrom: string;
  validTo: string | null;
}
export interface DongDieuKhoan {
  id: string;
  scope: PhamVi;
  catalogCode: string | null;
  groupCode: string | null;
  sellerPartyId: string;
  supplierPartyId: string | null;
  costRateBp: number | null;
  validFrom: string;
  validTo: string | null;
}
/** Người hưởng của đơn: HUONG = bên đặt mang vai được hưởng; KHONG_HUONG = bên đặt mang vai bên ngoài KHÔNG thuộc danh sách; NONE = khách lẻ / nội bộ / công ty / trống. */
export type NguoiHuong = { loai: "NONE" } | { loai: "HUONG"; partyId: string; vai: readonly string[] } | { loai: "KHONG_HUONG"; partyId: string };
export type KetQuaMuc = { trangThai: "NONE" } | { trangThai: "SET"; dong: DongMuc; bac: 1 | 2 | 3 | 4 | 5 | 6 } | { trangThai: "MISSING"; lyDo: LyDoThieu };
export type KetQuaDieuKhoan = { trangThai: "SET"; dong: DongDieuKhoan } | { trangThai: "MISSING" };

export const hieuLuc = (d: { validFrom: string; validTo: string | null }, ngay: string): boolean => d.validFrom <= ngay && (d.validTo === null || d.validTo >= ngay);

export function nguoiHuongCua(v: {
  bookerPartyId: string | null;
  vaiMo: readonly { roleTypeCode: string; roleGroup: string }[];
  vaiDuocHuong: ReadonlySet<string>;
  congTyChuId: string | null;
}): NguoiHuong {
  if (v.bookerPartyId === null || v.bookerPartyId === v.congTyChuId) return { loai: "NONE" };
  const vai = [...new Set(v.vaiMo.filter((r) => v.vaiDuocHuong.has(r.roleTypeCode)).map((r) => r.roleTypeCode))].sort();
  if (vai.length > 0) return { loai: "HUONG", partyId: v.bookerPartyId, vai };
  if (v.vaiMo.some((r) => r.roleGroup === "EXTERNAL")) return { loai: "KHONG_HUONG", partyId: v.bookerPartyId };
  return { loai: "NONE" };
}

const THU_TU: readonly PhamVi[] = ["SERVICE", "GROUP", "ALL"];
/** Dòng `d` có khớp mã `catalogCode` (nhóm hiện hành `groupCode`, null = Chưa phân loại) ở đúng phạm vi `pv` không. */
function khop(d: { scope: PhamVi; catalogCode: string | null; groupCode: string | null }, pv: PhamVi, catalogCode: string, groupCode: string | null): boolean {
  if (d.scope !== pv) return false;
  if (pv === "SERVICE") return d.catalogCode === catalogCode;
  if (pv === "GROUP") return groupCode !== null && d.groupCode === groupCode;
  return true;
}
const cungMuc = (a: DongMuc, b: DongMuc): boolean => a.kind === b.kind && a.rateBp === b.rateBp && a.perPaxAmount === b.perPaxAmount;
const theoThuTu = (a: DongMuc, b: DongMuc): number => (a.targetRoleCode ?? "").localeCompare(b.targetRoleCode ?? "") || a.id.localeCompare(b.id);

/** Chọn mức (ADR-0077 điều 5): sáu bậc, bậc cụ thể nhất thắng; chỉ dòng hiệu lực ở `ngay`. Không bao giờ tự lấy 0 khi không khớp. */
export function chonMuc(v: { nguoiHuong: NguoiHuong; catalogCode: string | null; groupCode: string | null; ngay: string; dong: readonly DongMuc[] }): KetQuaMuc {
  if (v.nguoiHuong.loai === "NONE") return { trangThai: "NONE" };
  if (v.nguoiHuong.loai === "KHONG_HUONG") return { trangThai: "MISSING", lyDo: "BOOKER_NOT_BENEFICIARY" };
  if (v.catalogCode === null) return { trangThai: "MISSING", lyDo: "MANUAL_LINE" };
  const nh = v.nguoiHuong;
  const code = v.catalogCode;
  const con = v.dong.filter((d) => hieuLuc(d, v.ngay)).sort(theoThuTu);
  for (const [i, pv] of THU_TU.entries()) {
    const d = con.find((x) => x.targetPartyId === nh.partyId && khop(x, pv, code, v.groupCode));
    if (d) return { trangThai: "SET", dong: d, bac: (i + 1) as 1 | 2 | 3 };
  }
  for (const [i, pv] of THU_TU.entries()) {
    const ds = con.filter((x) => x.targetRoleCode !== null && nh.vai.includes(x.targetRoleCode) && khop(x, pv, code, v.groupCode));
    if (ds.length === 0) continue;
    if (ds.some((x) => !cungMuc(x, ds[0]!))) return { trangThai: "MISSING", lyDo: "RULE_CONFLICT" };
    return { trangThai: "SET", dong: ds[0]!, bac: (i + 4) as 4 | 5 | 6 };
  }
  return { trangThai: "MISSING", lyDo: "NO_RULE" };
}

/** Chọn điều khoản người bán (ADR-0078 điều 3): SERVICE > GROUP > ALL, hiệu lực ở `ngay`; dòng nhập tay luôn MISSING (A-14). */
export function chonDieuKhoan(v: { catalogCode: string | null; groupCode: string | null; ngay: string; dong: readonly DongDieuKhoan[] }): KetQuaDieuKhoan {
  if (v.catalogCode === null) return { trangThai: "MISSING" };
  const code = v.catalogCode;
  const con = v.dong.filter((d) => hieuLuc(d, v.ngay));
  for (const pv of THU_TU) {
    const d = con.find((x) => khop(x, pv, code, v.groupCode));
    if (d) return { trangThai: "SET", dong: d };
  }
  return { trangThai: "MISSING" };
}

/** Làm tròn NỬA LÊN tới đồng của `tu / mau` (tu ≥ 0, mau > 0, số nguyên) — điều A1, chủ duyệt 2026-10-08. */
export const lamTronNuaLen = (tu: number, mau: number): number => Math.floor((2 * tu + mau) / (2 * mau));
export function hoaHongDong(v: { kind: KieuMuc; rateBp: number | null; perPaxAmount: number | null; thanhTien: number; soKhachTinh: number }): number {
  return v.kind === "RATE" ? lamTronNuaLen(v.rateBp! * v.thanhTien, 10_000) : v.perPaxAmount! * v.soKhachTinh;
}
/** Giá vốn trên thành tiền TRƯỚC giảm giá cấp đơn (H8 = A), cùng cách làm tròn. */
export const giaVonDong = (v: { costRateBp: number; thanhTien: number }): number => lamTronNuaLen(v.costRateBp * v.thanhTien, 10_000);
/** Số khách tính hoa hồng (H7): người lớn + trẻ em + người cao tuổi (không em bé); dịch vụ theo nhóm đếm lượt (tổng quantity các dòng tiền). */
export function soKhachTinhHoaHong(v: { unit: string; pax: PaxCounts; items: readonly { quantity: number }[] }): number {
  return parseUnit(v.unit).kind === "group" ? v.items.reduce((s, i) => s + i.quantity, 0) : payingGuests(v.pax);
}

export interface DongDon { serviceId: string; catalogCode: string | null; groupCode: string | null }
/** Bản chụp của một dòng — cùng dạng cho bản mới tính và bản đọc từ `ord_service_terms` (ruleId null = ghi tay). */
export interface BanChup {
  serviceId: string;
  beneficiaryPartyId: string | null;
  hoaHong:
    | { status: "NONE" }
    | { status: "SET"; kind: KieuMuc; rateBp: number | null; perPax: number | null; ruleId: string | null }
    | { status: "MISSING"; reason: LyDoThieu };
  cungUng: { status: "SET"; termId: string | null; sellerPartyId: string; supplierPartyId: string | null; costRateBp: number | null } | { status: "MISSING" };
}

/** Tính bản chụp cho mọi dòng của đơn ở `ngay` (Xác nhận / đổi bên đặt). */
export function chupDon(v: { nguoiHuong: NguoiHuong; ngay: string; dong: readonly DongDon[]; muc: readonly DongMuc[]; dieuKhoan: readonly DongDieuKhoan[] }): BanChup[] {
  const beneficiaryPartyId = v.nguoiHuong.loai === "NONE" ? null : v.nguoiHuong.partyId;
  return v.dong.map((d) => {
    const dk = chonDieuKhoan({ catalogCode: d.catalogCode, groupCode: d.groupCode, ngay: v.ngay, dong: v.dieuKhoan });
    const cungUng: BanChup["cungUng"] = dk.trangThai === "SET"
      ? { status: "SET", termId: dk.dong.id, sellerPartyId: dk.dong.sellerPartyId, supplierPartyId: dk.dong.supplierPartyId, costRateBp: dk.dong.costRateBp }
      : { status: "MISSING" };
    const laNhaCungCap = v.nguoiHuong.loai === "HUONG" && dk.trangThai === "SET" && dk.dong.supplierPartyId === beneficiaryPartyId;
    const m: KetQuaMuc = laNhaCungCap ? { trangThai: "MISSING", lyDo: "RULE_CONFLICT" } : chonMuc({ nguoiHuong: v.nguoiHuong, catalogCode: d.catalogCode, groupCode: d.groupCode, ngay: v.ngay, dong: v.muc });
    const hoaHong: BanChup["hoaHong"] = m.trangThai === "NONE" ? { status: "NONE" }
      : m.trangThai === "MISSING" ? { status: "MISSING", reason: m.lyDo }
      : { status: "SET", kind: m.dong.kind, rateBp: m.dong.rateBp, perPax: m.dong.perPaxAmount, ruleId: m.dong.id };
    return { serviceId: d.serviceId, beneficiaryPartyId, hoaHong, cungUng };
  });
}

export interface DongPhanDoiTac {
  serviceId: string;
  thanhTien: number;
  soKhachTinh: number;
  /** null = thiếu mức (không bao giờ tự lấy 0); 0 khi đơn không có người hưởng. */
  hoaHong: number | null;
  /** Thành tiền − hoa hồng; null khi thiếu mức. Chỉ hiển thị, không lưu. */
  giaDaiLy: number | null;
  /** Chỉ khi người bán là nhà cung cấp. */
  giaVon: number | null;
}
export function tinhDongDoiTac(c: BanChup, tien: { thanhTien: number; soKhachTinh: number }): DongPhanDoiTac {
  const h = c.hoaHong;
  const hoaHong = h.status === "NONE" ? 0 : h.status === "MISSING" ? null
    : hoaHongDong({ kind: h.kind, rateBp: h.rateBp, perPaxAmount: h.perPax, thanhTien: tien.thanhTien, soKhachTinh: tien.soKhachTinh });
  const cu = c.cungUng;
  const giaVon = cu.status === "SET" && cu.supplierPartyId !== null && cu.costRateBp !== null ? giaVonDong({ costRateBp: cu.costRateBp, thanhTien: tien.thanhTien }) : null;
  return { serviceId: c.serviceId, thanhTien: tien.thanhTien, soKhachTinh: tien.soKhachTinh, hoaHong, giaDaiLy: hoaHong === null ? null : tien.thanhTien - hoaHong, giaVon };
}
