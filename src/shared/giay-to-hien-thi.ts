// Luật thuần HIỂN THỊ của giao diện Vận chuyển lượt 1a (ADR-0040 D1, D2; bản vẽ Claude Design docs/design/van-chuyen-1a/, chủ vẽ 28/9) — chỉ giao diện
// (web/) dùng; máy chủ không đọc tệp này. Không I/O. Không có số giấy tờ đầy đủ nào đi qua đây: số của NGƯỜI đến từ máy chủ đã che (`maskedNumber`), số đủ chỉ
// có trong phản hồi "Xem đủ số" và chỉ nằm ở DOM tạm thời (web/giay-to-ui.ts). Luật NGHIỆP VỤ (lý do sửa sai, trạng thái xe) lấy từ src/shared/giay-to.ts —
// không chép tay.
import type { ExpiringItemDto, VehicleDto, VehicleStatus } from "./contracts.ts";
import { LOAI_CO_DINH, LY_DO_SUA_SAI, type LyDoSuaSai, type TruongSua } from "./giay-to.ts";

export type Tone = "danger" | "warn" | "ok" | "muted";
export interface Chip {
  tone: Tone;
  text: string;
  /** Có biểu tượng tam giác cảnh báo (bản vẽ: "cảnh báo giấy tờ luôn có biểu tượng + chữ, không chỉ màu"). */
  icon: boolean;
}

/**
 * Ngưỡng "sắp hết hạn" dùng khi API KHÔNG đưa ngưỡng: danh sách giấy tờ của NGƯỜI (`GET /api/parties/documents/mine`, `GET /api/parties/:id/documents`) chưa
 * trả `warnDays`, và nhân viên thường không gọi được `/api/van-chuyen/meta` (ô vehicle.manage). Bằng dòng gieo của `vc_expiry_policy` (migration 0033).
 * Đã báo điều phối là trường còn thiếu (nhật ký thi công Phần B) — khi API có `warnDays` thì thay hằng này bằng giá trị của API.
 */
export const NGUONG_MAC_DINH = 30;

/** "2026-09-30" → "30/09/2026" — thao tác chuỗi, không `new Date()` (không lệch múi giờ máy). null → "". */
export function ngayVN(iso: string | null): string {
  if (!iso) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/**
 * Chip hạn của một giấy tờ (màn 03, 04, 05, 06, 07). `daysLeft` do máy chủ tính theo giờ VN (null = không hạn; âm = đã quá hạn). Hôm nay (0) vẫn còn hạn trong
 * ngày — cùng nghĩa máy chủ (`mucHan` → "sap-het", `gopSapHetHan` → "soon") nên tông CÁT như bản vẽ màn 06 (màn 03/04 vẽ đỏ — thống nhất theo máy chủ, ghi ở
 * nhật ký thi công). Trên một năm: "Còn hạn" (bản vẽ).
 */
export function chipHan(daysLeft: number | null, warnDays: number): Chip {
  if (daysLeft === null) return { tone: "muted", text: "Không hạn", icon: false };
  if (daysLeft < 0) return { tone: "danger", text: `Đã hết hạn ${-daysLeft} ngày`, icon: true };
  if (daysLeft === 0) return { tone: "warn", text: "Hết hạn hôm nay", icon: true };
  if (daysLeft <= warnDays) return { tone: "warn", text: `Còn ${daysLeft} ngày`, icon: true };
  return { tone: "ok", text: daysLeft > 365 ? "Còn hạn" : `Còn ${daysLeft} ngày`, icon: false };
}

/** Tên hiện của một giấy tờ: giấy phép lái xe ghép hạng ("Giấy phép lái xe hạng D2" — tên hạng trong danh mục là "Hạng D2"). */
export function tenGiayTo(d: { typeName: string; className: string | null }): string {
  return d.className ? `${d.typeName} ${d.className.replace(/^Hạng\b/, "hạng")}` : d.typeName;
}

const xepTen = new Intl.Collator("vi");
/** Thứ tự giấy tờ (quyết định thiết kế 3): đã hết hạn → sắp hết → còn hạn → không hạn (= theo số ngày còn lại, không hạn cuối); cùng số ngày thì theo tên. */
export function xepTheoHan<T extends { daysLeft: number | null; typeName: string }>(docs: readonly T[]): T[] {
  const hang = (d: T): number => (d.daysLeft === null ? Number.POSITIVE_INFINITY : d.daysLeft);
  return [...docs].sort((a, b) => (hang(a) === hang(b) ? xepTen.compare(a.typeName, b.typeName) : hang(a) - hang(b)));
}

/** Khối tóm tắt ở trang đầu tài xế: hai giấy gần hạn nhất (điều phối chốt theo bản vẽ màn 07; README bản vẽ, điểm đoán 5). */
export function haiGiayGanHan<T extends { daysLeft: number | null; typeName: string }>(docs: readonly T[]): T[] {
  return xepTheoHan(docs).slice(0, 2);
}

/**
 * Lịch sử gia hạn của một dòng (màn 03, 04: "Lịch sử (N)" mở ngay dưới dòng): các dòng TRƯỚC nó theo chuỗi `previousId`, mới trước cũ. Dòng đã huỷ (nhập nhầm)
 * không hiện là "Đã thay" nhưng chuỗi vẫn đi qua nó; dữ liệu vòng (không thể có — trigger chặn) cũng không làm treo trang.
 */
export function lichSuCua<T extends { id: string; previousId: string | null; voided: boolean }>(doc: T, all: readonly T[]): T[] {
  const theoId = new Map(all.map((d) => [d.id, d]));
  const out: T[] = [];
  const daQua = new Set<string>([doc.id]);
  for (let id = doc.previousId; id !== null && !daQua.has(id); ) {
    daQua.add(id);
    const d = theoId.get(id);
    if (!d) break;
    if (!d.voided) out.push(d);
    id = d.previousId;
  }
  return out;
}

// ---- Xe ------------------------------------------------------------------------------------------------------------------------------------------------
/** Nhãn trạng thái xe như bản vẽ ("Ngừng" — bản vẽ màn 01, 02; chữ "Ngừng dùng" của TRANG_THAI_XE dùng cho nhật ký máy chủ). */
export const NHAN_TRANG_THAI_XE: Readonly<Record<VehicleStatus, string>> = { active: "Đang dùng", maintenance: "Bảo dưỡng", retired: "Ngừng" };
export const TONE_TRANG_THAI_XE: Readonly<Record<VehicleStatus, Tone>> = { active: "ok", maintenance: "warn", retired: "muted" };

export type LocXe = "all" | VehicleStatus;
export const LOC_XE: readonly { key: LocXe; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: NHAN_TRANG_THAI_XE.active },
  { key: "maintenance", label: NHAN_TRANG_THAI_XE.maintenance },
  { key: "retired", label: NHAN_TRANG_THAI_XE.retired },
];
export const hopLoc = (v: { status: VehicleStatus }, key: LocXe): boolean => key === "all" || v.status === key;
export const demLocXe = (vs: readonly { status: VehicleStatus }[], key: LocXe): number => vs.filter((v) => hopLoc(v, key)).length;

/**
 * "Tên / đời xe": bản vẽ màn 02 có MỘT ô ("Ví dụ: Ford Transit 2019"); hợp đồng API có `name` + `modelYear` riêng. Phần B gắn ô đó với `name` (không tự tách
 * năm ra khỏi chữ — là câu hỏi dữ liệu, đã gửi điều phối); `modelYear` đã lưu (xe tạo bằng API khác) nối sau tên khi hiện.
 */
export function tenXe(v: { name: string; modelYear: number | null }): string {
  return v.modelYear === null ? v.name : `${v.name} ${v.modelYear}`;
}

export interface XeForm {
  plateNumber: string;
  chassisNumber: string;
  /** Ô "Tên / đời xe". */
  name: string;
  passengerCapacity: number;
  status: VehicleStatus;
}
/** Thân POST /api/van-chuyen/xe — ô Tên/đời xe → name; modelYear null (xem tenXe). Trạng thái xe mới: Đang dùng / Bảo dưỡng (máy chủ chặn "retired"). */
export function thanXeMoi(f: XeForm): { plateNumber: string; chassisNumber: string; name: string; modelYear: null; passengerCapacity: number; status: VehicleStatus } {
  return { plateNumber: f.plateNumber.trim(), chassisNumber: f.chassisNumber.trim(), name: f.name.trim(), modelYear: null, passengerCapacity: f.passengerCapacity, status: f.status };
}
type XeDaLuu = Pick<VehicleDto, "plateNumber" | "chassisNumber" | "name" | "modelYear" | "passengerCapacity" | "status" | "updatedAt">;
/** Thân PUT /api/van-chuyen/xe/:id khi bấm "Lưu" (kể cả sau "Dùng lại xe"): giá trị trong form + modelYear ĐÃ LƯU (form không có ô năm) + khoá lạc quan. */
export function thanDungLaiHoacSuaXe(f: XeForm, daLuu: XeDaLuu) {
  return { ...thanXeMoi(f), modelYear: daLuu.modelYear, expectedUpdatedAt: daLuu.updatedAt };
}
/** Thân PUT khi xác nhận "Ngừng dùng": giá trị ĐÃ LƯU + trạng thái Ngừng (chỗ đang sửa dở trong form không lẫn vào — người dùng tự bấm Lưu nếu cần). */
export function thanNgungXe(daLuu: XeDaLuu) {
  return {
    plateNumber: daLuu.plateNumber, chassisNumber: daLuu.chassisNumber ?? "", name: daLuu.name, modelYear: daLuu.modelYear, passengerCapacity: daLuu.passengerCapacity,
    status: "retired" as const, expectedUpdatedAt: daLuu.updatedAt,
  };
}

/**
 * Dòng cảnh báo trên thẻ/hàng xe (màn 01): giấy gần hạn nhất + số giấy khác trong mốc ("Phù hiệu đã hết hạn 8 ngày · 2 giấy sắp hết hạn"). "Sắp hết hạn" theo
 * nghĩa của phân hệ (danh sách "Giấy tờ sắp hết hạn" gồm cả giấy đã hết). Không có giấy nào tới mốc → null (bản vẽ: không có hộp cảnh báo).
 */
export function canhBaoXe(v: Pick<VehicleDto, "alert" | "alertTypeName" | "alertDaysLeft" | "alertCount">): { tone: Tone; text: string } | null {
  if (v.alert === "none" || v.alertTypeName === null || v.alertDaysLeft === null) return null;
  const d = v.alertDaysLeft;
  const dau = d < 0 ? `${v.alertTypeName} đã hết hạn ${-d} ngày` : d === 0 ? `${v.alertTypeName} hết hạn hôm nay` : `${v.alertTypeName} còn ${d} ngày`;
  const khac = v.alertCount - 1;
  return { tone: v.alert === "expired" ? "danger" : "warn", text: khac > 0 ? `${dau} · ${khac} giấy sắp hết hạn` : dau };
}

/** Khối tóm tắt giấy tờ ở chi tiết xe (màn 03) — trên các dòng HIỆN HÀNH. Chưa có giấy nào: nói đúng như vậy (bản vẽ không có trạng thái này). */
export function tomTatGiayToXe(docs: readonly { daysLeft: number | null }[], warnDays: number): { tone: Tone; text: string } {
  if (docs.length === 0) return { tone: "muted", text: "Chưa có giấy tờ nào." };
  const het = docs.filter((d) => d.daysLeft !== null && d.daysLeft < 0).length;
  const sap = docs.filter((d) => d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= warnDays).length;
  const sapChu = `${sap} giấy sắp hết hạn trong ${warnDays} ngày`;
  if (het > 0) return { tone: "danger", text: sap > 0 ? `${het} giấy đã hết hạn · ${sapChu}` : `${het} giấy đã hết hạn` };
  if (sap > 0) return { tone: "warn", text: sapChu };
  return { tone: "ok", text: "Giấy tờ còn hạn" };
}

// ---- Sửa sai --------------------------------------------------------------------------------------------------------------------------------------------
/**
 * Lý do sửa sai hiện trong bảng "Sửa sai" — danh sách ĐÓNG của máy chủ (`LY_DO_SUA_SAI`, mỗi lý do sửa đúng một trường). Giấy tờ xe: chỉ lý do `choXe`.
 * Giấy tờ người: "Nhập sai hạng" chỉ với giấy phép lái xe (máy chủ: "Giấy tờ này không có hạng").
 */
export function lyDoSuaSai(cho: "xe" | { typeCode: string }): { code: LyDoSuaSai; nhan: string; truong: TruongSua | null }[] {
  return (Object.keys(LY_DO_SUA_SAI) as LyDoSuaSai[])
    .filter((code) => (cho === "xe" ? LY_DO_SUA_SAI[code].choXe : code !== "SAI_HANG" || cho.typeCode === LOAI_CO_DINH.GPLX))
    .map((code) => ({ code, nhan: LY_DO_SUA_SAI[code].nhan, truong: LY_DO_SUA_SAI[code].truong }));
}

/** Thân POST …/correct (người) và …/sua-sai (xe). "Nhập nhầm cả dòng" KHÔNG có khoá `value` (máy chủ trả 400 nếu có, kể cả null); ô rỗng → null. */
export function thanSuaSai(reason: LyDoSuaSai, value: string | null, expectedUpdatedAt: string): { reason: LyDoSuaSai; value?: string | null; expectedUpdatedAt: string } {
  if (LY_DO_SUA_SAI[reason].truong === null) return { reason, expectedUpdatedAt };
  const v = value === null || value.trim() === "" ? null : value.trim();
  return { reason, value: v, expectedUpdatedAt };
}

// ---- Khác -----------------------------------------------------------------------------------------------------------------------------------------------
/** Đọc token thời gian (vd `--t-reveal: 10s`) → mili-giây; rỗng/hỏng/âm → `macDinh`. Để chữ "10 giây" và đồng hồ tự che dùng MỘT nguồn (token ở app.css). */
export function thoiGianTuToken(v: string, macDinh = 10_000): number {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(ms|s)\s*$/.exec(v);
  if (!m) return macDinh;
  const n = Number(m[1]) * (m[2] === "s" ? 1000 : 1);
  return Number.isFinite(n) && n > 0 ? n : macDinh;
}

/** Bấm một dòng "Giấy tờ sắp hết hạn" (màn 06): xe → chi tiết xe (màn 03); người → hồ sơ ở Danh bạ, mở thẳng theo id (màn 04). */
export function duongDanDong(item: Pick<ExpiringItemDto, "kind" | "targetId">): string {
  return item.kind === "vehicle" ? `/xe-chi-tiet?id=${encodeURIComponent(item.targetId)}` : `/parties?id=${encodeURIComponent(item.targetId)}`;
}

/** Lời chào ở trang đầu tài xế — cùng cách Trang chủ (web/home.ts): "Chào" + từ cuối của họ tên. */
export function loiChao(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  return `Chào ${words[words.length - 1] ?? fullName.trim()}`;
}
