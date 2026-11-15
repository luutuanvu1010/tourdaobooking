// Luật thuần của phí đưa đón (ADR-0147 Đ2, ADR-0203 ĐB1–ĐB2; kế hoạch Đợt B, Task 6). Không I/O. Thiếu mức KHÔNG BAO GIỜ là 0 đồng (Hiến chương 5.7):
// miễn phí là một dòng amount = 0 được đặt rõ. Thứ tự chọn mức cố định, KHÔNG đếm số điều kiện: dịch vụ > cấp > nhóm > chiều (bậc 8, 4, 2, 1 cộng lại).
// MỘT danh sách đăng ký `BO_TINH`: mỗi khoá điều kiện một bộ tính; bài kiểm ép nó khớp bảng `prc_transfer_fee_key`. Thêm khoá = thêm một dòng ở bảng + một ở đây.
import { hieuLuc, laNgay, docGhiChu, type GanLoaiMuc, type GanRieng } from "./rules.ts";
import { thanhTienDong } from "../../shared/order-lines.ts";

export const KHOA_PHI_DON = ["ZONE", "DIRECTION", "SERVICE_GROUP", "EXCLUSIVE", "TIER", "SERVICE"] as const;
export type KhoaPhiDon = (typeof KHOA_PHI_DON)[number];
export type KieuPhiDon = "PER_PAX" | "PER_TRIP";
export type DieuKienPhiDon = Partial<Record<KhoaPhiDon, string>>;
export interface MucPhiDon { id: string; kind: KieuPhiDon; amount: number; validFrom: string; validTo: string | null; dieuKien: DieuKienPhiDon }
export interface ChangTinhPhi {
  zoneCode: string; direction: "OUT" | "RETURN"; exclusive: boolean;
  catalogCode: string | null; groupCode: string | null; tierCode: string | null;
}
type BoTinh = { khop: (giaTri: string, c: ChangTinhPhi) => boolean; bac: number | null };

/** bac: SERVICE=8, TIER=4, SERVICE_GROUP=2, DIRECTION=1; ZONE và EXCLUSIVE = null (bắt buộc khớp, không tính bậc). */
export const BO_TINH: Record<KhoaPhiDon, BoTinh> = {
  ZONE: { khop: (g, c) => c.zoneCode === g, bac: null },
  EXCLUSIVE: { khop: (g, c) => g === "1" && c.exclusive, bac: null },
  SERVICE: { khop: (g, c) => c.catalogCode !== null && c.catalogCode === g, bac: 8 },
  TIER: { khop: (g, c) => c.tierCode !== null && c.tierCode === g, bac: 4 },
  SERVICE_GROUP: { khop: (g, c) => c.groupCode !== null && c.groupCode === g, bac: 2 },
  DIRECTION: { khop: (g, c) => c.direction === g, bac: 1 },
};

export type KetQuaPhiDon =
  | { trangThai: "CO_MUC"; muc: MucPhiDon; thua: { muc: MucPhiDon; viSao: string }[] }
  | { trangThai: "THIEU_MUC"; lyDo: "KHONG_CO_MUC" | "XUNG_DOT" };

const TEN_KHOA: Record<string, string> = { SERVICE: "đích danh dịch vụ", TIER: "cấp độ đại lý", SERVICE_GROUP: "nhóm dịch vụ", DIRECTION: "chiều đón" };

const rows = (d: DieuKienPhiDon): [string, string][] => Object.entries(d).filter((e): e is [string, string] => typeof e[1] === "string");

/** Dòng khớp chặng: hiệu lực ngày `ngay`, đúng nửa (xe riêng ⇔ theo chuyến), mọi khoá có mặt đều khớp; khoá không có bộ tính thì KHÔNG khớp (không bao giờ áp điều kiện không hiểu). */
function bacCuaDong(m: MucPhiDon, c: ChangTinhPhi, ngay: string, boTinh: Readonly<Record<string, BoTinh>>): number | null {
  if (!hieuLuc(m, ngay)) return null;
  if (m.kind !== (c.exclusive ? "PER_TRIP" : "PER_PAX")) return null;
  let bac = 0;
  for (const [khoa, giaTri] of rows(m.dieuKien)) {
    const bo = boTinh[khoa];
    if (!bo || !bo.khop(giaTri, c)) return null;
    bac += bo.bac ?? 0;
  }
  return bac;
}

function viSaoThua(thang: MucPhiDon, thua: MucPhiDon, bacThang: number, bacThua: number, boTinh: Readonly<Record<string, BoTinh>>): string {
  if (bacThang === bacThua) return "thua vì cùng bậc và cùng số tiền, lấy dòng có mã nhỏ hơn";
  const coThangKhongCoThua = rows(thang.dieuKien).filter(([k]) => thua.dieuKien[k as KhoaPhiDon] === undefined && (boTinh[k]?.bac ?? 0) > 0).sort((a, b) => (boTinh[b[0]]!.bac ?? 0) - (boTinh[a[0]]!.bac ?? 0));
  const k = coThangKhongCoThua[0]?.[0];
  return k ? `thua vì dòng thắng nêu ${TEN_KHOA[k] ?? `điều kiện ${k}`}` : "thua vì dòng thắng nêu nhiều điều kiện cụ thể hơn";
}

export function chonMucPhiDon(v: { chang: ChangTinhPhi; ngay: string; muc: readonly MucPhiDon[]; boTinh?: Readonly<Record<string, BoTinh>> }): KetQuaPhiDon {
  const boTinh = v.boTinh ?? BO_TINH;
  const khop: { muc: MucPhiDon; bac: number }[] = [];
  for (const m of v.muc) {
    const bac = bacCuaDong(m, v.chang, v.ngay, boTinh);
    if (bac !== null) khop.push({ muc: m, bac });
  }
  if (khop.length === 0) return { trangThai: "THIEU_MUC", lyDo: "KHONG_CO_MUC" };
  const cao = Math.max(...khop.map((x) => x.bac));
  const dau = khop.filter((x) => x.bac === cao).sort((a, b) => (a.muc.id < b.muc.id ? -1 : a.muc.id > b.muc.id ? 1 : 0));
  if (dau.some((x) => x.muc.amount !== dau[0]!.muc.amount)) return { trangThai: "THIEU_MUC", lyDo: "XUNG_DOT" };
  const thang = dau[0]!;
  const thua = khop.filter((x) => x !== thang).map((x) => ({ muc: x.muc, viSao: viSaoThua(thang.muc, x.muc, thang.bac, x.bac, boTinh) }));
  return { trangThai: "CO_MUC", muc: thang.muc, thua };
}

export type CapCuaHoSo = { loai: "CO_CAP"; tierCode: string } | { loai: "KHONG_CAP" } | { loai: "HAI_CAP" };

/** Cấp của hồ sơ bên đặt tại ngày `ngay`: cấp gắn riêng hiệu lực thắng; không thì gom cấp của các vai qua bảng gắn loại ↔ mức (0 ⇒ không cấp, 1 mã ⇒ có cấp, ≥ 2 mã khác nhau ⇒ hai cấp). */
export function capCuaHoSoNgay(v: { partyId: string | null; vai: readonly string[]; ngay: string; gan: readonly GanLoaiMuc[]; ganRieng: readonly GanRieng[] }): CapCuaHoSo {
  if (v.partyId === null) return { loai: "KHONG_CAP" };
  const rieng = v.ganRieng.filter((g) => g.partyId === v.partyId && hieuLuc(g, v.ngay)).sort((a, b) => (a.validFrom < b.validFrom ? 1 : a.validFrom > b.validFrom ? -1 : 0));
  if (rieng.length > 0) return { loai: "CO_CAP", tierCode: rieng[0]!.tierCode };
  const cap = new Set(v.gan.filter((g) => v.vai.includes(g.roleTypeCode) && hieuLuc(g, v.ngay)).map((g) => g.tierCode));
  if (cap.size === 0) return { loai: "KHONG_CAP" };
  if (cap.size === 1) return { loai: "CO_CAP", tierCode: [...cap][0]! };
  return { loai: "HAI_CAP" };
}

/** Tiền MỘT chặng. Số lượng 0 ⇒ null (không sinh dòng; KHÔNG phải thiếu mức). */
export function tinhPhiChang(v: { muc: MucPhiDon; direction: "OUT" | "RETURN"; soKhachTinhTien: number; paxOverride: number | null }): { donGia: number; soLuong: number; tien: number } | null {
  const soLuong = v.muc.kind === "PER_TRIP" ? 1 : v.direction === "RETURN" && v.paxOverride !== null ? Math.min(v.paxOverride, v.soKhachTinhTien) : v.soKhachTinhTien;
  if (soLuong <= 0) return null;
  return { donGia: v.muc.amount, soLuong, tien: thanhTienDong({ quantity: soLuong, unitPrice: v.muc.amount }) }; // một công thức thành tiền dòng (bài src/thanh-tien-mot-ham.test.ts)
}

/** Chữ ký bộ điều kiện: khoá sắp theo chữ cái, «KEY=value» nối bằng «|». Cùng công thức với bất biến R-PRC-PD-1. */
export function chuKyDieuKien(d: DieuKienPhiDon): string {
  return rows(d).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([k, val]) => `${k}=${val}`).join("|");
}

// ---- Phí đưa đón của MỘT đơn (Đợt C, Task 2): hàm thuần mà `orders` và «Thử tra» cùng dùng; không có luật chọn thứ hai ----
export interface ChangDauVao { legKey: string; zoneCode: string; direction: "OUT" | "RETURN"; exclusive: boolean; catalogCode: string | null; soKhachTinhTien: number; paxOverride: number | null }
/** `returnPax` = số người chiều về GỐC (`pax_override`) của chặng về theo khách, chụp vào `order_item.fee_return_pax`; KHÔNG phải số đã kẹp (`soLuong` = min(số đó, khách tính tiền)).
 *  «Sửa số khách» tính lại min(`returnPax`, khách mới) — lưu số đã kẹp thì tăng khách sẽ thu thiếu (kiểm độc lập Đợt C, Nên sửa 1). */
export interface DongPhiDon { legKey: string; ruleId: string; kind: KieuPhiDon; zoneCode: string; tierCode: string | null; donGia: number; soLuong: number; tien: number; returnPax: number | null }
export type LyDoThieuPhiDon = "KHONG_CO_MUC" | "XUNG_DOT" | "DAI_LY_HAI_CAP"; // trùng chữ `ly_do` của sổ vàng
export interface ThieuPhiDon { legKey: string; zoneCode: string; lyDo: LyDoThieuPhiDon }
export type KetQuaPhiDonDon = { apDung: false } | { apDung: true; dong: DongPhiDon[]; thieu: ThieuPhiDon[] };
export interface BangPhiDon { batDauAp: string | null; muc: readonly MucPhiDon[]; cap: CapCuaHoSo }

/**
 * Phí đưa đón cho cả đơn tại ngày `ngay`. Chưa bật (`batDauAp` trống) hoặc `ngay` trước ngày áp ⇒ `{ apDung: false }`. Hồ sơ HAI cấp ⇒ mọi chặng thiếu `DAI_LY_HAI_CAP` (không lùi về mức chung, SV-PD-14).
 * Số lượng 0 ⇒ không dòng, không thiếu. Tích đơn giá × số lượng không phải số nguyên an toàn ⇒ ném lỗi (người gọi phải chặn số khách khổng lồ từ trước; không bao giờ cắt hay làm tròn).
 */
export function tinhPhiDonThuan(v: { bang: BangPhiDon; nhom: ReadonlyMap<string, string | null>; ngay: string; chang: readonly ChangDauVao[] }): KetQuaPhiDonDon {
  if (v.bang.batDauAp === null || v.ngay < v.bang.batDauAp) return { apDung: false };
  const cap = v.bang.cap;
  const tierCode = cap.loai === "CO_CAP" ? cap.tierCode : null;
  const dong: DongPhiDon[] = [];
  const thieu: ThieuPhiDon[] = [];
  for (const c of v.chang) {
    if (cap.loai === "HAI_CAP") { thieu.push({ legKey: c.legKey, zoneCode: c.zoneCode, lyDo: "DAI_LY_HAI_CAP" }); continue; }
    const r = chonMucPhiDon({
      chang: { zoneCode: c.zoneCode, direction: c.direction, exclusive: c.exclusive, catalogCode: c.catalogCode, groupCode: c.catalogCode === null ? null : (v.nhom.get(c.catalogCode) ?? null), tierCode },
      ngay: v.ngay, muc: v.bang.muc,
    });
    if (r.trangThai === "THIEU_MUC") { thieu.push({ legKey: c.legKey, zoneCode: c.zoneCode, lyDo: r.lyDo }); continue; }
    const t = tinhPhiChang({ muc: r.muc, direction: c.direction, soKhachTinhTien: c.soKhachTinhTien, paxOverride: c.paxOverride });
    if (!t) continue;
    if (!Number.isSafeInteger(t.tien)) throw new RangeError("Số khách hoặc số tiền quá lớn để tính phí đưa đón.");
    dong.push({ legKey: c.legKey, ruleId: r.muc.id, kind: r.muc.kind, zoneCode: c.zoneCode, tierCode, donGia: t.donGia, soLuong: t.soLuong, tien: t.tien, returnPax: r.muc.kind === "PER_PAX" && c.direction === "RETURN" && c.paxOverride !== null ? c.paxOverride : null });
  }
  return { apDung: true, dong, thieu };
}

/** Trần MỘT mức phí đưa đón: 5.000.000 đ (chủ chốt 15/11). */
export const TRAN_MUC_PHI_DON = 5_000_000;

export interface ThanMucPhiDon { kind: KieuPhiDon; amount: number; validFrom: string; validTo: string | null; note: string | null; dieuKien: DieuKienPhiDon }
type Result<T> = { ok: true; value: T } | { ok: false; message: string };
const loi = (message: string): { ok: false; message: string } => ({ ok: false, message });

/**
 * Kiểm thân `POST /api/pricing/phi-don`: { kind, amount, validFrom, validTo?, note?, dieuKien }. `dieuKien` là đối tượng { KHOÁ: "giá trị" } hoặc danh sách [{ khoa, giaTri }]
 * (dạng danh sách cho phép bắt khoá lặp hai lần). `biet` = tập mã đang có thật (do route đọc từ nguồn của từng module).
 */
export function kiemThanMucPhiDon(body: unknown, biet: { vung: ReadonlySet<string>; cap: ReadonlySet<string>; nhom: ReadonlySet<string>; dichVu: ReadonlySet<string> }): Result<ThanMucPhiDon> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return loi("Thiếu thông tin mức phí đưa đón.");
  const b = body as Record<string, unknown>;
  if (b.kind !== "PER_PAX" && b.kind !== "PER_TRIP") return loi("Chọn cách tính: theo khách hoặc theo chuyến.");
  if (typeof b.amount !== "number" || !Number.isSafeInteger(b.amount) || b.amount < 0) return loi("Số tiền phải là số nguyên đồng, từ 0 trở lên.");
  if (b.amount > TRAN_MUC_PHI_DON) return loi("Một mức phí đưa đón tối đa 5.000.000 đồng.");
  if (!laNgay(b.validFrom)) return loi("Ngày bắt đầu không hợp lệ.");
  let validTo: string | null = null;
  if (b.validTo !== undefined && b.validTo !== null && b.validTo !== "") {
    if (!laNgay(b.validTo) || b.validTo < b.validFrom) return loi("Ngày kết thúc không hợp lệ hoặc trước ngày bắt đầu.");
    validTo = b.validTo;
  }
  const note = docGhiChu(b.note);
  if (!note.ok) return note;
  const cap: [unknown, unknown][] = [];
  if (Array.isArray(b.dieuKien)) {
    for (const e of b.dieuKien) {
      if (!e || typeof e !== "object" || Array.isArray(e)) return loi("Điều kiện không hợp lệ.");
      cap.push([(e as Record<string, unknown>).khoa, (e as Record<string, unknown>).giaTri]);
    }
  } else if (b.dieuKien && typeof b.dieuKien === "object") cap.push(...Object.entries(b.dieuKien as Record<string, unknown>));
  else return loi("Thiếu điều kiện của mức phí.");
  const dk: DieuKienPhiDon = {};
  for (const [khoa, giaTri] of cap) {
    if (typeof khoa !== "string" || !(KHOA_PHI_DON as readonly string[]).includes(khoa)) return loi("Có điều kiện không được hỗ trợ.");
    if (typeof giaTri !== "string" || giaTri === "") return loi("Giá trị điều kiện không hợp lệ.");
    if (dk[khoa as KhoaPhiDon] !== undefined) return loi("Mỗi điều kiện chỉ nêu một lần.");
    dk[khoa as KhoaPhiDon] = giaTri;
  }
  if (dk.ZONE === undefined) return loi("Chọn khu vực đón.");
  if (!biet.vung.has(dk.ZONE)) return loi("Khu vực đón không có.");
  if (dk.EXCLUSIVE !== undefined && dk.EXCLUSIVE !== "1") return loi("Điều kiện xe riêng không hợp lệ.");
  if ((b.kind === "PER_TRIP") !== (dk.EXCLUSIVE !== undefined)) return loi("Mức theo chuyến chỉ dành cho xe riêng, và xe riêng chỉ có mức theo chuyến.");
  if (dk.SERVICE !== undefined && dk.SERVICE_GROUP !== undefined) return loi("Chỉ nêu dịch vụ hoặc nhóm dịch vụ, không nêu cả hai.");
  if (dk.DIRECTION !== undefined && dk.DIRECTION !== "OUT" && dk.DIRECTION !== "RETURN") return loi("Chiều đón không hợp lệ.");
  if (dk.TIER !== undefined && !biet.cap.has(dk.TIER)) return loi("Cấp độ đại lý không có hoặc đã khoá.");
  if (dk.SERVICE_GROUP !== undefined && !biet.nhom.has(dk.SERVICE_GROUP)) return loi("Nhóm dịch vụ không có.");
  if (dk.SERVICE !== undefined && !biet.dichVu.has(dk.SERVICE)) return loi("Dịch vụ không có.");
  return { ok: true, value: { kind: b.kind, amount: b.amount, validFrom: b.validFrom, validTo, note: note.value, dieuKien: dk } };
}

const chiChungKhuVuc = (m: MucPhiDon): boolean => m.kind === "PER_PAX" && rows(m.dieuKien).length === 1 && m.dieuKien.ZONE !== undefined;

/** Vùng không có dòng chung đi chung (chỉ mang khoá ZONE) còn hiệu lực ngày `ngay` — «đủ mức trước khi bật» (ADR-0203 ĐB1). */
export function vungThieuDongChung(v: { vung: readonly string[]; muc: readonly MucPhiDon[]; ngay: string }): string[] {
  return v.vung.filter((z) => !v.muc.some((m) => chiChungKhuVuc(m) && m.dieuKien.ZONE === z && hieuLuc(m, v.ngay)));
}

export interface CanhBaoCapCaoHon { tierCode: string; zoneCode: string; direction: "OUT" | "RETURN"; exclusive: boolean; catalogCode: string | null; groupCode: string | null; tienCap: number; tienKhongCap: number }

/**
 * Cấp được trả CAO HƠN mức không có cấp ở cùng chặng — cảnh báo cho Quản trị, không chặn. KHÔNG có luật so sánh riêng: duyệt mọi tổ hợp rồi gọi `chonMucPhiDon` hai lần
 * (có cấp, không cấp). Tổ hợp dịch vụ: mỗi dịch vụ được nêu đích danh; mỗi nhóm được nêu (một dịch vụ giả thuộc nhóm đó); và một dịch vụ giả không nhóm.
 */
export function canhBaoCapCaoHon(v: { muc: readonly MucPhiDon[]; ngay: string; nhomCuaDichVu: ReadonlyMap<string, string | null> }): CanhBaoCapCaoHon[] {
  const dang = v.muc.filter((m) => hieuLuc(m, v.ngay));
  const tap = (khoa: KhoaPhiDon): string[] => [...new Set(dang.map((m) => m.dieuKien[khoa]).filter((x): x is string => x !== undefined))].sort();
  const vung = tap("ZONE");
  const cap = tap("TIER");
  const dichVu: { catalogCode: string | null; groupCode: string | null; ma: string }[] = [
    ...tap("SERVICE").map((s) => ({ catalogCode: s, groupCode: v.nhomCuaDichVu.get(s) ?? null, ma: s })),
    ...tap("SERVICE_GROUP").map((g) => ({ catalogCode: null, groupCode: g, ma: `\u0000gia-nhom:${g}` })),
    { catalogCode: null, groupCode: null, ma: "\u0000gia-khong-nhom" },
  ];
  const ra: CanhBaoCapCaoHon[] = [];
  for (const zoneCode of vung) for (const direction of ["OUT", "RETURN"] as const) for (const exclusive of [false, true]) for (const d of dichVu) for (const tierCode of cap) {
    // `catalogCode` của chặng là mã thật hoặc mã giả không trùng bộ tính nào; tổ hợp nhóm/không nhóm dùng mã giả để dòng nêu dịch vụ không khớp nhầm.
    const nen: ChangTinhPhi = { zoneCode, direction, exclusive, catalogCode: d.ma, groupCode: d.groupCode, tierCode: null };
    const khongCap = chonMucPhiDon({ chang: nen, ngay: v.ngay, muc: dang });
    const coCap = chonMucPhiDon({ chang: { ...nen, tierCode }, ngay: v.ngay, muc: dang });
    if (khongCap.trangThai === "CO_MUC" && coCap.trangThai === "CO_MUC" && coCap.muc.amount > khongCap.muc.amount) {
      ra.push({ tierCode, zoneCode, direction, exclusive, catalogCode: d.catalogCode, groupCode: d.groupCode, tienCap: coCap.muc.amount, tienKhongCap: khongCap.muc.amount });
    }
  }
  return ra;
}
