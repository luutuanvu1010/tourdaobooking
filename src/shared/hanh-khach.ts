// Luật THUẦN của danh sách hành khách (ADR-0047 A2) — một nguồn cho máy chủ (orders) và giao diện Phần B. Không I/O, không import module.
// Import kèm đuôi .ts. Test cạnh tệp: hanh-khach.test.ts.
//
// Hành khách = dòng NHẸ của đơn (họ tên + năm sinh), KHÔNG phải hồ sơ Bên. Đơn nháp: danh sách xoá–chèn lại khi lưu nháp. Sau xác nhận CHỈ-THÊM: thêm =
// dòng mới (`person_key` = id); sửa = dòng mới trỏ dòng HIỆN HÀNH, cùng `person_key`; huỷ người = đặt `voided_at` cho MỌI dòng chưa huỷ của người đó,
// MỚI trước CŨ sau (Ruling R8 — huỷ riêng dòng cuối sẽ làm tên cũ "sống lại"). Dữ liệu cá nhân: nhật ký chỉ ghi SỐ LƯỢNG (`moTaThayDoiKhach`).
import type { PaxCode, PaxCounts } from "./contracts.ts";
import { UUID_RE } from "./http.ts";
import { PAX_ORDER, paxTotal } from "./order-lines.ts";
import { cleanText } from "./text-guards.ts";

/** Trần số người mỗi đơn (giả định G5). */
export const MAX_HANH_KHACH_MOI_DON = 200;
/** Năm sinh trong 120 năm gần nhất, không quá năm nay (giờ VN) — G5. CSDL giữ lưới rộng 1900–2100. */
export const TUOI_TOI_DA = 120;
const MAX_TEN = 100;

export interface HanhKhachHopLe {
  /** Lưu nháp: id dòng đã lưu (giữ id); null = mới. */
  id: string | null;
  fullName: string;
  birthYear: number;
  paxCode: PaxCode | null;
}

export type KetQua<T> = { ok: true; value: T } | { ok: false; message: string };

/** Kiểm MỘT hành khách. `today` = ngày dân sự VN (`vnToday`) — năm nay lấy từ đó. Tên: bỏ ký tự điều khiển, gộp khoảng trắng, không đổi hoa thường (G6). */
export function kiemHanhKhach(raw: unknown, ctx: { at: string; today: string }): KetQua<HanhKhachHopLe> {
  const at = ctx.at;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: `${at}: dữ liệu không hợp lệ.` };
  const r = raw as Record<string, unknown>;
  let id: string | null = null;
  if (r.id !== undefined && r.id !== null && r.id !== "") {
    if (typeof r.id !== "string" || !UUID_RE.test(r.id)) return { ok: false, message: `${at}: mã hành khách không hợp lệ.` };
    id = r.id;
  }
  const name = cleanText(r.fullName, `${at}: họ tên`, MAX_TEN, false);
  if (name.error) return { ok: false, message: name.error.startsWith(at) ? name.error : `${at}: ${name.error}` };
  if (name.value === null) return { ok: false, message: `${at}: họ tên là bắt buộc.` };
  const nam = Number(ctx.today.slice(0, 4));
  const y = r.birthYear;
  if (typeof y !== "number" || !Number.isSafeInteger(y)) return { ok: false, message: `${at}: năm sinh phải là số nguyên (vd 1990).` };
  if (y < nam - TUOI_TOI_DA || y > nam) return { ok: false, message: `${at}: năm sinh phải từ ${nam - TUOI_TOI_DA} đến ${nam}.` };
  let paxCode: PaxCode | null = null;
  if (r.paxCode !== undefined && r.paxCode !== null && r.paxCode !== "") {
    if (!(PAX_ORDER as readonly unknown[]).includes(r.paxCode)) return { ok: false, message: `${at}: loại khách không hợp lệ.` };
    paxCode = r.paxCode as PaxCode;
  }
  return { ok: true, value: { id, fullName: name.value, birthYear: y, paxCode } };
}

/** Kiểm cả danh sách (thân `passengers` của lập/sửa nháp, hoặc `them` của route hành khách). Trùng `id` → lỗi. */
export function kiemDanhSachHanhKhach(raw: unknown, today: string, nhan = "Hành khách"): KetQua<HanhKhachHopLe[]> {
  if (!Array.isArray(raw)) return { ok: false, message: "Danh sách hành khách không hợp lệ." };
  if (raw.length > MAX_HANH_KHACH_MOI_DON) return { ok: false, message: `Đơn tối đa ${MAX_HANH_KHACH_MOI_DON} hành khách.` };
  const out: HanhKhachHopLe[] = [];
  const ids = new Set<string>();
  for (const [i, x] of raw.entries()) {
    const r = kiemHanhKhach(x, { at: `${nhan} ${i + 1}`, today });
    if (!r.ok) return r;
    if (r.value.id !== null) {
      if (ids.has(r.value.id)) return { ok: false, message: `${nhan} ${i + 1}: trùng một hành khách khác trong danh sách.` };
      ids.add(r.value.id);
    }
    out.push(r.value);
  }
  return { ok: true, value: out };
}

/** Một dòng `ord_passenger` đã lưu (dạng luật cần). */
export interface DongHanhKhach {
  id: string;
  personKey: string;
  previousId: string | null;
  voided: boolean;
  fullName: string;
  birthYear: number;
  paxCode: PaxCode | null;
  updatedAt: string;
}

/**
 * Dòng HIỆN HÀNH của từng người (chưa huỷ, không có dòng thay thế chưa huỷ), theo thứ tự xuất hiện của người trong `rows` (nơi gọi sắp `rows` theo
 * `created_at`, `id`). Người đã huỷ hết không có mặt.
 */
export function dongHienHanh(rows: readonly DongHanhKhach[]): DongHanhKhach[] {
  const superseded = new Set(rows.filter((r) => !r.voided && r.previousId !== null).map((r) => r.previousId!));
  const out: DongHanhKhach[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.personKey)) continue;
    const cur = rows.find((x) => x.personKey === r.personKey && !x.voided && !superseded.has(x.id));
    seen.add(r.personKey);
    if (cur) out.push(cur);
  }
  return out;
}

/** Mọi dòng CHƯA HUỶ của một người, MỚI trước CŨ sau (đi ngược `previous_id` từ dòng hiện hành). */
function dongChuaHuyMoiTruoc(rows: readonly DongHanhKhach[], cur: DongHanhKhach): string[] {
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  const out: string[] = [];
  for (let r: DongHanhKhach | undefined = cur; r && !r.voided && !out.includes(r.id); r = r.previousId ? byId.get(r.previousId) : undefined) out.push(r.id);
  return out;
}

export interface ThayDoiHanhKhach {
  them: HanhKhachHopLe[];
  sua: (Omit<HanhKhachHopLe, "id"> & { personKey: string })[];
  huy: string[];
}
export interface DongChen {
  id: string;
  personKey: string;
  previousId: string | null;
  fullName: string;
  birthYear: number;
  paxCode: PaxCode | null;
}
export interface KeHoach {
  /** Dòng cần chèn, theo thứ tự (thêm trước, sửa sau). */
  chen: DongChen[];
  /** id dòng cần đặt `voided_at`, theo ĐÚNG thứ tự (từng người: mới trước cũ sau). */
  huy: string[];
  /** Số lượng THẬT SỰ ghi (sửa y nguyên không tính) — cho nhật ký. */
  dem: { them: number; sua: number; huy: number };
}

/**
 * Kế hoạch ghi cho `POST /api/orders/:id/passengers` (đơn ĐÃ XÁC NHẬN — Ruling R1, R8). `rows` = mọi dòng của đơn. `newId` sinh id dòng mới (máy chủ:
 * `crypto.randomUUID`). Lỗi: sửa/huỷ người không có hoặc đã huỷ hết; một người vừa sửa vừa huỷ, hoặc lặp trong cùng lệnh; vượt trần người mỗi đơn.
 * Sửa y nguyên (tên, năm, loại không đổi) → không ghi dòng.
 */
export function keHoachHanhKhach(rows: readonly DongHanhKhach[], thayDoi: ThayDoiHanhKhach, newId: () => string): KetQua<KeHoach> {
  const current = new Map(dongHienHanh(rows).map((r) => [r.personKey, r] as const));
  const touched = new Set<string>();
  for (const k of [...thayDoi.sua.map((s) => s.personKey), ...thayDoi.huy]) {
    if (!current.has(k)) return { ok: false, message: "Có hành khách cần sửa/huỷ không còn trong danh sách — hãy tải lại danh sách." };
    if (touched.has(k)) return { ok: false, message: "Một hành khách chỉ được sửa HOẶC huỷ một lần trong mỗi lần lưu." };
    touched.add(k);
  }
  const conLai = current.size - thayDoi.huy.length + thayDoi.them.length;
  if (conLai > MAX_HANH_KHACH_MOI_DON) return { ok: false, message: `Đơn tối đa ${MAX_HANH_KHACH_MOI_DON} hành khách.` };
  const chen: DongChen[] = [];
  for (const t of thayDoi.them) {
    const id = newId();
    chen.push({ id, personKey: id, previousId: null, fullName: t.fullName, birthYear: t.birthYear, paxCode: t.paxCode });
  }
  let sua = 0;
  for (const s of thayDoi.sua) {
    const cur = current.get(s.personKey)!;
    if (cur.fullName === s.fullName && cur.birthYear === s.birthYear && cur.paxCode === s.paxCode) continue;
    chen.push({ id: newId(), personKey: s.personKey, previousId: cur.id, fullName: s.fullName, birthYear: s.birthYear, paxCode: s.paxCode });
    sua++;
  }
  const huy = thayDoi.huy.flatMap((k) => dongChuaHuyMoiTruoc(rows, current.get(k)!));
  return { ok: true, value: { chen, huy, dem: { them: thayDoi.them.length, sua, huy: thayDoi.huy.length } } };
}

/** Số khách của cả ĐOÀN = số khách hiệu lực của dịch vụ ĐÔNG NHẤT trong đơn (Ruling R9 — đơn thường là một đoàn đi nhiều dịch vụ). */
export function soKhachDoan(paxByService: readonly PaxCounts[]): number {
  return paxByService.reduce((m, p) => Math.max(m, paxTotal(p)), 0);
}
/** Cờ cho văn phòng (không tự tăng số khách — N7): danh sách có tên nhiều hơn số khách của đoàn. */
export const vuotSoKhach = (soNguoiCoTen: number, soKhach: number): boolean => soNguoiCoTen > soKhach;

/** Câu nhật ký của `order_passenger_changed` — ĐÚNG khuôn, CHỈ số lượng (không tên, không năm sinh — Hiến chương 5.12; kiểm định kỳ R-ORD-10). */
export const moTaThayDoiKhach = (d: { them: number; sua: number; huy: number }): string => `thêm ${d.them}, sửa ${d.sua}, huỷ ${d.huy} khách`;
/** Mẩu đếm thêm vào nhật ký lập/sửa nháp khi thân có khoá `passengers`. */
export const moTaDanhSachNhap = (n: number): string => `danh sách khách: ${n} người`;
