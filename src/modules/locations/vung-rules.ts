// Luật thuần của khu vực đón (ADR-0147 Đ1): kiểm đầu vào thêm / sửa khu vực. Không I/O.
import type { Result } from "./rules.ts";

/** Mã khu vực: chữ HOA, số, gạch dưới; 2–30 ký tự; bắt đầu bằng chữ (khớp CHECK của migration 0164). */
export const MA_VUNG_RE = /^[A-Z][A-Z0-9_]{1,29}$/;
/** Khu vực gieo sẵn, luôn bật: địa điểm chưa xếp vùng được quy về đây. */
export const MA_NGOAI_VUNG = "NGOAI_VUNG";

export interface VungTao { code: string; name: string; sortOrder: number }
export interface VungSua { name: string; sortOrder: number; active: boolean; expectedUpdatedAt: string }

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

function tenVaThuTu(b: Record<string, unknown>): Result<{ name: string; sortOrder: number }> {
  if (typeof b.name !== "string") return fail("Tên khu vực là bắt buộc.");
  const name = b.name.trim().replace(/\s+/g, " ");
  if (name.length < 1) return fail("Tên khu vực là bắt buộc.");
  if (name.length > 60) return fail("Tên khu vực tối đa 60 ký tự.");
  const sortOrder = b.sortOrder === undefined ? 0 : b.sortOrder;
  if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) return fail("Thứ tự phải là số nguyên từ 0 đến 9999.");
  return { ok: true, value: { name, sortOrder } };
}

export function kiemThanVungTao(body: unknown): Result<VungTao> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fail("Dữ liệu không hợp lệ.");
  const b = body as Record<string, unknown>;
  if (typeof b.code !== "string" || !MA_VUNG_RE.test(b.code)) return fail("Mã khu vực gồm chữ HOA, số, gạch dưới (2–30 ký tự, bắt đầu bằng chữ), ví dụ BAC_NHA_TRANG.");
  const c = tenVaThuTu(b);
  return c.ok ? { ok: true, value: { code: b.code, ...c.value } } : c;
}

export function kiemThanVungSua(body: unknown): Result<VungSua> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return fail("Dữ liệu không hợp lệ.");
  const b = body as Record<string, unknown>;
  if (typeof b.expectedUpdatedAt !== "string" || !b.expectedUpdatedAt) return fail("Thiếu mốc cập nhật (expectedUpdatedAt) — hãy tải lại trang.");
  if (typeof b.active !== "boolean") return fail("Trạng thái hoạt động phải là true/false.");
  const c = tenVaThuTu(b);
  return c.ok ? { ok: true, value: { ...c.value, active: b.active, expectedUpdatedAt: b.expectedUpdatedAt } } : c;
}
