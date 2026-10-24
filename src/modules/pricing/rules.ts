// LUẬT THUẦN của sổ đại lý đợt 1 (ADR-0077, ADR-0078 B1; đặc tả docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md §4).
// Không I/O, không import module khác. MỘT hàm chọn mức (`chonMuc`), MỘT hàm chọn điều khoản (`chonDieuKhoan`), MỘT cách làm tròn (`lamTronNuaLen`).
// Tỷ lệ tính bằng phần vạn (1250 = 12,5%). Thành tiền / số khách là số HIỆN HÀNH của dòng; mức là mức ĐÃ CHỤP (A-2).
import { parseUnit, payingGuests, type PaxCounts } from "../../shared/order-lines.ts";
import { giaVonDong, hoaHongDong, lamTronNuaLen, tinhDongDoiTac, type BanChup, type DongPhanDoiTac, type KieuMuc, type LyDoThieu, type MucTheoLoai } from "../../shared/hoa-hong-dong.ts";
import { nhanMuc } from "../../shared/so-dai-ly-nhan.ts";
import { MOI_KHACH_TOI_DA } from "../../shared/so-dai-ly-nhap.ts"; // trần «Số tiền mỗi khách»: MỘT hằng cho giao diện và máy chủ (Task 14, nợ (a))
import { khoaTen } from "../../shared/khoa-ten.ts";

// Phép tính tiền MỘT dòng (làm tròn nửa lên, hoa hồng, giá vốn, `tinhDongDoiTac`) và kiểu bản chụp nằm ở src/shared/hoa-hong-dong.ts để `orders/thuong-mai.ts` (DTO) chạy được bằng node trực tiếp
// mà không nhập index.ts của module khác; ở đây chỉ tái xuất — vẫn MỘT định nghĩa (Task 5, Ruling ở sổ thi công).
export { giaVonDong, hoaHongDong, lamTronNuaLen, tinhDongDoiTac, type BanChup, type DongPhanDoiTac, type KieuMuc, type LyDoThieu, type MucTheoLoai };

export type PhamVi = "SERVICE" | "GROUP" | "ALL";

export interface DongMuc {
  id: string;
  targetPartyId: string | null;
  targetRoleCode: string | null;
  /** Đích thứ ba (ADR-0117 lần 2): mã mức TA. Đúng một trong ba đích có giá trị. Thiếu = null (nơi gọi cũ chưa đọc cột này). */
  targetTierCode?: string | null;
  scope: PhamVi;
  catalogCode: string | null;
  groupCode: string | null;
  kind: KieuMuc;
  rateBp: number | null;
  perPaxAmount: number | null;
  /** ADR-0133: ba số tiền theo loại khách của dòng đ/khách (người lớn = perPaxAmount). null/thiếu = không khai theo loại, tính như cũ. */
  theoLoai?: MucTheoLoai | null;
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
/** Người hưởng của đơn: HUONG = bên đặt mang vai được hưởng; KHONG_HUONG = bên đặt mang vai bên ngoài (hoặc loại đối tác ADR-0117) KHÔNG thuộc danh sách; NONE = khách lẻ / nội bộ / công ty / trống. */
export type NguoiHuong = { loai: "NONE" } | { loai: "HUONG"; partyId: string; vai: readonly string[] } | { loai: "KHONG_HUONG"; partyId: string };
/** Gắn loại↔mức TA theo ngày (ADR-0117 lần 2): loại `roleTypeCode` mang mức `tierCode` trong khoảng [validFrom, validTo]. */
export interface GanLoaiMuc { roleTypeCode: string; tierCode: string; validFrom: string; validTo: string | null }
/** Bậc thắng: 1–3 riêng đối tác, 4–6 riêng loại, 7–9 mức TA (mỗi nhóm ba: dịch vụ, nhóm, mọi dịch vụ). */
export type BacMuc = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type KetQuaMuc = { trangThai: "NONE" } | { trangThai: "SET"; dong: DongMuc; bac: BacMuc } | { trangThai: "MISSING"; lyDo: LyDoThieu };
export type KetQuaDieuKhoan = { trangThai: "SET"; dong: DongDieuKhoan } | { trangThai: "MISSING" };

export const hieuLuc = (d: { validFrom: string; validTo: string | null }, ngay: string): boolean => d.validFrom <= ngay && (d.validTo === null || d.validTo >= ngay);

export function nguoiHuongCua(v: {
  bookerPartyId: string | null;
  /** `nhanDoiTac` (ADR-0117): vai thuộc loại đối tác do người dùng thêm (nhóm OTHER, có nhãn) — thiếu = không nhãn. */
  vaiMo: readonly { roleTypeCode: string; roleGroup: string; nhanDoiTac?: boolean }[];
  vaiDuocHuong: ReadonlySet<string>;
  congTyChuId: string | null;
}): NguoiHuong {
  if (v.bookerPartyId === null || v.bookerPartyId === v.congTyChuId) return { loai: "NONE" };
  const vai = [...new Set(v.vaiMo.filter((r) => v.vaiDuocHuong.has(r.roleTypeCode)).map((r) => r.roleTypeCode))].sort();
  if (vai.length > 0) return { loai: "HUONG", partyId: v.bookerPartyId, vai };
  // Q1 = A (ADR-0117, chủ chọn 2026-10-14): vai bên ngoài HOẶC loại đối tác mà KHÔNG còn được hưởng (đã tắt) ⇒ KHONG_HUONG, đơn bị giữ — không bao giờ tự lấy 0.
  if (v.vaiMo.some((r) => r.roleGroup === "EXTERNAL" || r.nhanDoiTac === true)) return { loai: "KHONG_HUONG", partyId: v.bookerPartyId };
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
const cungTheoLoai = (a: MucTheoLoai | null | undefined, b: MucTheoLoai | null | undefined): boolean =>
  !a || !b ? !a && !b : a.adult === b.adult && a.child === b.child && a.senior === b.senior;
const cungMuc = (a: DongMuc, b: DongMuc): boolean => a.kind === b.kind && a.rateBp === b.rateBp && a.perPaxAmount === b.perPaxAmount && cungTheoLoai(a.theoLoai, b.theoLoai);
const theoThuTu = (a: DongMuc, b: DongMuc): number => (a.targetRoleCode ?? "").localeCompare(b.targetRoleCode ?? "") || a.id.localeCompare(b.id);

/**
 * Chọn mức (ADR-0077 điều 5, ADR-0117 lần 2): chín bậc, bậc cụ thể nhất thắng; chỉ dòng hiệu lực ở `ngay`. Không bao giờ tự lấy 0 khi không khớp.
 * Bậc 1–3: riêng đối tác. Bậc 4–6: riêng loại. Bậc 7–9: dòng của các mức TA mà loại hồ sơ đang mang được gắn (`gan`) ở `ngay`; dòng riêng của loại (4–6) luôn thắng dòng TA.
 * Hai mức khác số ở cùng bậc (qua hai loại) ⇒ RULE_CONFLICT; cùng số thì không xung đột, dòng `id` nhỏ nhất đứng ra (xác định).
 */
export function chonMuc(v: { nguoiHuong: NguoiHuong; catalogCode: string | null; groupCode: string | null; ngay: string; dong: readonly DongMuc[]; gan?: readonly GanLoaiMuc[] }): KetQuaMuc {
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
  const muc = new Set((v.gan ?? []).filter((g) => nh.vai.includes(g.roleTypeCode) && hieuLuc(g, v.ngay)).map((g) => g.tierCode));
  if (muc.size > 0) {
    for (const [i, pv] of THU_TU.entries()) {
      const ds = con.filter((x) => x.targetTierCode != null && muc.has(x.targetTierCode) && khop(x, pv, code, v.groupCode));
      if (ds.length === 0) continue;
      if (ds.some((x) => !cungMuc(x, ds[0]!))) return { trangThai: "MISSING", lyDo: "RULE_CONFLICT" };
      return { trangThai: "SET", dong: ds[0]!, bac: (i + 7) as 7 | 8 | 9 };
    }
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

/** Số khách tính hoa hồng (H7): người lớn + trẻ em + người cao tuổi (không em bé); dịch vụ theo nhóm đếm lượt (tổng quantity các dòng tiền). */
export function soKhachTinhHoaHong(v: { unit: string; pax: PaxCounts; items: readonly { quantity: number }[] }): number {
  return parseUnit(v.unit).kind === "group" ? v.items.reduce((s, i) => s + i.quantity, 0) : payingGuests(v.pax);
}

export interface DongDon { serviceId: string; catalogCode: string | null; groupCode: string | null }
/**
 * Tính bản chụp cho mọi dòng của đơn ở `ngay` (Xác nhận / đổi bên đặt / tính thử đơn nháp). `gan` = gắn loại↔mức TA hiệu lực (ADR-0117 lần 2) — BẮT BUỘC (không tuỳ chọn như ở
 * `chonMuc`): typecheck chỉ bắt nơi gọi QUÊN hẳn tham số; truyền nhầm `gan: []` vẫn biên dịch. Thứ canh thật là các bài ở src/modules/pricing/muc-ta.test.ts — mỗi đường gọi
 * (xác nhận, đổi bên đặt, bản tính thử đơn nháp) có một ca đỏ khi mất `gan`.
 */
export function chupDon(v: { nguoiHuong: NguoiHuong; ngay: string; dong: readonly DongDon[]; muc: readonly DongMuc[]; gan: readonly GanLoaiMuc[]; dieuKhoan: readonly DongDieuKhoan[] }): BanChup[] {
  const beneficiaryPartyId = v.nguoiHuong.loai === "NONE" ? null : v.nguoiHuong.partyId;
  return v.dong.map((d) => {
    const dk = chonDieuKhoan({ catalogCode: d.catalogCode, groupCode: d.groupCode, ngay: v.ngay, dong: v.dieuKhoan });
    const cungUng: BanChup["cungUng"] = dk.trangThai === "SET"
      ? { status: "SET", termId: dk.dong.id, sellerPartyId: dk.dong.sellerPartyId, supplierPartyId: dk.dong.supplierPartyId, costRateBp: dk.dong.costRateBp }
      : { status: "MISSING" };
    const laNhaCungCap = v.nguoiHuong.loai === "HUONG" && dk.trangThai === "SET" && dk.dong.supplierPartyId === beneficiaryPartyId;
    const m: KetQuaMuc = laNhaCungCap ? { trangThai: "MISSING", lyDo: "RULE_CONFLICT" } : chonMuc({ nguoiHuong: v.nguoiHuong, catalogCode: d.catalogCode, groupCode: d.groupCode, ngay: v.ngay, dong: v.muc, gan: v.gan });
    const hoaHong: BanChup["hoaHong"] = m.trangThai === "NONE" ? { status: "NONE" }
      : m.trangThai === "MISSING" ? { status: "MISSING", reason: m.lyDo }
      : { status: "SET", kind: m.dong.kind, rateBp: m.dong.rateBp, perPax: m.dong.perPaxAmount, ruleId: m.dong.id, theoLoai: m.dong.theoLoai ?? null };
    return { serviceId: d.serviceId, beneficiaryPartyId, hoaHong, cungUng };
  });
}

// ===== Kiểm thân route của bảng mức và điều khoản (Task 3; đặc tả §6). Chỉ thêm, không đổi hàm ở trên. =====
type Ket<T> = { ok: true; value: T } | { ok: false; message: string };
const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const PARTY_RE = /^[A-Za-z0-9-]{1,64}$/;
export const MA_RE = /^[A-Za-z0-9_]{1,40}$/;
export const laNgay = (s: unknown): s is string => typeof s === "string" && NGAY_RE.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const laPhanVan = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 10_000;
/** Ghi chú tuỳ chọn ≤ 200 ký tự, không dãy ≥ 8 chữ số (khuôn billing: không SĐT / số tài khoản). */
function docGhiChu(raw: unknown): Ket<string | null> {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string" || raw.length > 200) return { ok: false, message: "Ghi chú tối đa 200 ký tự." };
  if (/\d{8,}/.test(raw.replace(/[\s.-]/g, ""))) return { ok: false, message: "Ghi chú không được chứa số điện thoại / số tài khoản." };
  return { ok: true, value: raw.trim() || null };
}
function docPhamVi(b: Record<string, unknown>): Ket<{ scope: PhamVi; catalogCode: string | null; groupCode: string | null }> {
  if (b.phamVi === "ALL") return { ok: true, value: { scope: "ALL", catalogCode: null, groupCode: null } };
  if (b.phamVi === "SERVICE" && typeof b.catalogCode === "string" && MA_RE.test(b.catalogCode)) return { ok: true, value: { scope: "SERVICE", catalogCode: b.catalogCode, groupCode: null } };
  if (b.phamVi === "GROUP" && typeof b.groupCode === "string" && MA_RE.test(b.groupCode)) return { ok: true, value: { scope: "GROUP", catalogCode: null, groupCode: b.groupCode } };
  return { ok: false, message: "Chọn phạm vi: một dịch vụ, một nhóm dịch vụ, hoặc mọi dịch vụ." };
}
function docKhoangNgay(b: Record<string, unknown>): Ket<{ validFrom: string; validTo: string | null }> {
  if (!laNgay(b.tuNgay)) return { ok: false, message: "Ngày bắt đầu không hợp lệ." };
  if (b.denNgay === undefined || b.denNgay === null || b.denNgay === "") return { ok: true, value: { validFrom: b.tuNgay, validTo: null } };
  if (!laNgay(b.denNgay) || b.denNgay < b.tuNgay) return { ok: false, message: "Ngày kết thúc không hợp lệ hoặc trước ngày bắt đầu." };
  return { ok: true, value: { validFrom: b.tuNgay, validTo: b.denNgay } };
}

export type ThanMuc = Omit<DongMuc, "id" | "validFrom" | "validTo"> & { validFrom: string; validTo: string | null; note: string | null };
type PhanMuc = Pick<ThanMuc, "scope" | "catalogCode" | "groupCode" | "kind" | "rateBp" | "perPaxAmount" | "theoLoai" | "validFrom" | "validTo" | "note">;
/**
 * ADR-0133 (điều 2, sửa 2026-10-19): `theoLoai` = { treEm, nguoiCaoTuoi } chỉ đi với kiểu đ/khách; người lớn LUÔN là `moiKhach`. Cả hai ô BẮT BUỘC có số nguyên 0…trần «mỗi khách» —
 * KHÔNG tự lấy 0 khi thiếu / null / "" (trẻ em là khách trả tiền, bỏ trống lặng lẽ sẽ làm đại lý mất hoa hồng); không trả thì gõ 0. Em bé không có ô. Không khai (undefined / null) ⇒ null:
 * dòng tính như cũ.
 */
function docTheoLoai(raw: unknown, kind: KieuMuc, nguoiLon: number | null): Ket<MucTheoLoai | null> {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (kind !== "PER_PAX" || nguoiLon === null) return { ok: false, message: "Số tiền theo loại khách chỉ dùng cho mức tính theo số tiền mỗi khách." };
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Số tiền theo loại khách không hợp lệ." };
  const o = raw as Record<string, unknown>;
  const doc = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MOI_KHACH_TOI_DA ? v : null);
  const child = doc(o.treEm), senior = doc(o.nguoiCaoTuoi);
  if (child === null || senior === null) return { ok: false, message: "Nhập số tiền mỗi khách của trẻ em và của người cao tuổi (không để trống; không trả thì gõ 0). Mỗi số là số nguyên đồng, không âm, không quá mức tối đa." };
  return { ok: true, value: { adult: nguoiLon, child, senior } };
}
/** Phần chung của thân một dòng mức (phạm vi, mức, khoảng ngày, ghi chú) — dùng cho dòng theo loại / đối tác và dòng của mức TA. */
function docPhanMuc(b: Record<string, unknown>): Ket<PhanMuc> {
  const pv = docPhamVi(b);
  if (!pv.ok) return pv;
  let kind: KieuMuc;
  let rateBp: number | null = null;
  let perPaxAmount: number | null = null;
  if (b.kieu === "RATE" && laPhanVan(b.tyLeBp)) { kind = "RATE"; rateBp = b.tyLeBp; }
  else if (b.kieu === "PER_PAX" && typeof b.moiKhach === "number" && Number.isInteger(b.moiKhach) && b.moiKhach >= 0 && b.moiKhach <= MOI_KHACH_TOI_DA) { kind = "PER_PAX"; perPaxAmount = b.moiKhach; }
  else return { ok: false, message: "Mức phải là tỷ lệ từ 0% tới 100% (tối đa hai chữ số thập phân) hoặc số tiền mỗi khách không âm." };
  const tl = docTheoLoai(b.theoLoai, kind, perPaxAmount);
  if (!tl.ok) return tl;
  const kn = docKhoangNgay(b);
  if (!kn.ok) return kn;
  const gc = docGhiChu(b.ghiChu);
  if (!gc.ok) return gc;
  return { ok: true, value: { ...pv.value, kind, rateBp, perPaxAmount, theoLoai: tl.value, ...kn.value, note: gc.value } };
}
/** Thân `POST /api/pricing/hoa-hong`: { doiTuong: { loai: "VAI", code } | { loai: "DOI_TAC", partyId }, phamVi, catalogCode?, groupCode?, kieu, tyLeBp? | moiKhach?, tuNgay, denNgay?, ghiChu? }. */
export function kiemThanMuc(raw: unknown): Ket<ThanMuc> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Thiếu thông tin mức hoa hồng." };
  const b = raw as Record<string, unknown>;
  const dt = b.doiTuong as Record<string, unknown> | undefined;
  let targetPartyId: string | null = null;
  let targetRoleCode: string | null = null;
  if (dt?.loai === "VAI" && typeof dt.code === "string" && MA_RE.test(dt.code)) targetRoleCode = dt.code;
  else if (dt?.loai === "DOI_TAC" && typeof dt.partyId === "string" && PARTY_RE.test(dt.partyId)) targetPartyId = dt.partyId;
  else return { ok: false, message: "Chọn áp cho một loại đối tác hoặc một đối tác cụ thể." };
  const pm = docPhanMuc(b);
  if (!pm.ok) return pm;
  return { ok: true, value: { targetPartyId, targetRoleCode, ...pm.value } };
}

// ===== Mức TA dùng chung (ADR-0117 lần 2). =====
/** Thân `POST /api/pricing/muc-ta/:code/dong` (thêm dòng cho mức `tierCode`): như thân bảng mức nhưng không có `doiTuong` — đích là chính mức. */
export function kiemThanDongMucTa(raw: unknown, tierCode: string): Ket<ThanMuc> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Thiếu thông tin dòng của mức." };
  const pm = docPhanMuc(raw as Record<string, unknown>);
  if (!pm.ok) return pm;
  return { ok: true, value: { targetPartyId: null, targetRoleCode: null, targetTierCode: tierCode, ...pm.value } };
}
/**
 * Tên mức TA do người dùng nhập: gọn khoảng trắng, 2–60 ký tự (chặt hơn CHECK 1–60 của bảng để CHECK không bao giờ nổ thành 500), khoá so tên (`khoaTen`) không rỗng; tên đi vào
 * nhật ký nên không cho dãy ≥ 8 chữ số (SĐT / số tài khoản) hay `@` (email) — cùng khuôn tên loại đối tác. Trùng tên KHÔNG kiểm ở đây: cột `name_key` UNIQUE quyết (một nơi,
 * đúng cả khi hai lần thêm đồng thời).
 */
export function kiemTenMucTa(raw: unknown): Ket<{ ten: string; khoa: string }> {
  const ten = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (ten.length < 2 || ten.length > 60) return { ok: false, message: "Tên mức TA dài từ 2 đến 60 ký tự." };
  if (/\d{8,}/.test(ten.replace(/[\s.]/g, "")) || /\d{9,}/.test(ten.replace(/[\s.-]/g, "")) || ten.includes("@")) return { ok: false, message: "Tên mức TA không được chứa số điện thoại, số tài khoản hay địa chỉ email." };
  const khoa = khoaTen(ten);
  if (khoa.length < 2) return { ok: false, message: "Tên mức TA dài từ 2 đến 60 ký tự." };
  return { ok: true, value: { ten, khoa } };
}
/** Mã mức TA máy chủ sinh: `MT_` + 8 chữ hoa (không bao giờ trùng đoạn đường cố định như «gan»; khớp `MA_RE`). `bytes` lấy từ `crypto.getRandomValues` ở nơi gọi. */
export const maMucTa = (bytes: Uint8Array): string => "MT_" + Array.from(bytes.slice(0, 8), (b) => String.fromCharCode(65 + (b % 26))).join("");
export const MUC_TA_RE = /^MT_[A-Z]{8}$/;
/** Thân `POST /api/pricing/muc-ta/gan`: { loai, muc, tuNgay, denNgay? }. */
export function kiemThanGan(raw: unknown): Ket<{ roleTypeCode: string; tierCode: string; validFrom: string; validTo: string | null }> {
  const b = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  if (typeof b.loai !== "string" || !MA_RE.test(b.loai) || typeof b.muc !== "string" || !MA_RE.test(b.muc)) return { ok: false, message: "Chọn loại đối tác và mức TA." };
  const kn = docKhoangNgay(b);
  if (!kn.ok) return kn;
  return { ok: true, value: { roleTypeCode: b.loai, tierCode: b.muc, ...kn.value } };
}

export type ThanDieuKhoan = { scope: PhamVi; catalogCode: string | null; groupCode: string | null; sellerPartyId: string; costRateBp: number | null; validFrom: string; validTo: string | null; note: string | null };
/** Thân `POST /api/pricing/cung-ung`: { phamVi, catalogCode?, groupCode?, nguoiBanPartyId, tyLeMuaBp?, tuNgay, denNgay?, ghiChu? }. Nhà cung cấp = người bán (máy chủ suy). */
export function kiemThanDieuKhoan(raw: unknown): Ket<ThanDieuKhoan> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Thiếu thông tin điều khoản." };
  const b = raw as Record<string, unknown>;
  const pv = docPhamVi(b);
  if (!pv.ok) return pv;
  if (typeof b.nguoiBanPartyId !== "string" || !PARTY_RE.test(b.nguoiBanPartyId)) return { ok: false, message: "Chọn người bán." };
  let costRateBp: number | null = null;
  if (b.tyLeMuaBp !== undefined && b.tyLeMuaBp !== null) {
    if (!laPhanVan(b.tyLeMuaBp)) return { ok: false, message: "Tỷ lệ mua lại phải từ 0% tới 100%." };
    costRateBp = b.tyLeMuaBp;
  }
  const kn = docKhoangNgay(b);
  if (!kn.ok) return kn;
  const gc = docGhiChu(b.ghiChu);
  if (!gc.ok) return gc;
  return { ok: true, value: { ...pv.value, sellerPartyId: b.nguoiBanPartyId, costRateBp, ...kn.value, note: gc.value } };
}

export function kiemNgayDong(raw: unknown, tuNgay: string): Ket<string> {
  const d = (raw as { denNgay?: unknown } | null)?.denNgay;
  if (!laNgay(d) || d < tuNgay) return { ok: false, message: "Ngày kết thúc không hợp lệ hoặc trước ngày bắt đầu của dòng." };
  return { ok: true, value: d };
}

/** Mô tả một dòng mức cho nhật ký: "<đối tượng> · <phạm vi> · <mức>". Không SĐT, không tiền khách. Nhãn mức đi qua MỘT nguồn `nhanMuc` (src/shared/so-dai-ly-nhan.ts). */
export function moTaMuc(v: { doiTuong: string; scope: PhamVi; catalogCode: string | null; groupCode: string | null; kind: KieuMuc; rateBp: number | null; perPaxAmount: number | null; theoLoai?: MucTheoLoai | null }): string {
  const pv = v.scope === "ALL" ? "mọi dịch vụ" : v.scope === "GROUP" ? `nhóm ${v.groupCode}` : `dịch vụ ${v.catalogCode}`;
  return `${v.doiTuong} · ${pv} · ${nhanMuc({ kind: v.kind, rateBp: v.rateBp, perPax: v.perPaxAmount, theoLoai: v.theoLoai })}`;
}

// ===== Góp ý YC-0020: tóm tắt «Hoa hồng hiện hành» của MỘT hồ sơ (chỉ đọc; không đổi cách tính — cách tính vẫn là `chonMuc`). =====
export interface TomTatHoaHongHoSo {
  /** Hồ sơ đang mang ít nhất một loại đối tác được hưởng. */
  laNguoiHuong: boolean;
  /** Mỗi loại được hưởng hồ sơ đang mang: mức TA loại đó gắn ở `ngay` (null = chưa gắn). */
  vai: { loaiCode: string; mucCode: string | null; tuNgay: string | null }[];
  /** Hai loại gắn hai mức KHÁC MÃ. Chỉ là dấu hiệu: `chonMuc` mới quyết theo từng dịch vụ (so giá trị dòng khớp, theo bậc) nên có thể vẫn ra mức — chữ ở giao diện phải nói «có thể». */
  xungDot: boolean;
  /** Dòng riêng của các loại hồ sơ mang (bậc 4–6): thắng mức TA (bậc 7–9). */
  dongRiengLoai: number;
  /** Dòng riêng của chính hồ sơ (bậc 1–3): thắng tất cả. */
  dongRiengDoiTac: number;
}
export function tomTatHoaHongHoSo(v: { partyId: string; vaiMo: readonly string[]; vaiDuocHuong: ReadonlySet<string>; gan: readonly GanLoaiMuc[]; muc: readonly DongMuc[]; ngay: string }): TomTatHoaHongHoSo {
  const loai = [...new Set(v.vaiMo)].filter((c) => v.vaiDuocHuong.has(c)).sort();
  const vai = loai.map((loaiCode) => {
    const g = v.gan.find((x) => x.roleTypeCode === loaiCode && hieuLuc(x, v.ngay));
    return { loaiCode, mucCode: g?.tierCode ?? null, tuNgay: g?.validFrom ?? null };
  });
  const mucKhacNhau = new Set(vai.map((x) => x.mucCode).filter((c): c is string => c !== null));
  const dongCon = v.muc.filter((d) => hieuLuc(d, v.ngay));
  return {
    laNguoiHuong: loai.length > 0, vai, xungDot: mucKhacNhau.size > 1,
    dongRiengLoai: dongCon.filter((d) => d.targetRoleCode !== null && loai.includes(d.targetRoleCode)).length,
    dongRiengDoiTac: dongCon.filter((d) => d.targetPartyId === v.partyId).length,
  };
}
