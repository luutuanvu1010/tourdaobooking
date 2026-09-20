// Luật thuần của module locations: kiểm đầu vào địa điểm. Không I/O; import kiểu/hằng bằng đuôi .ts (node --test chạy trực tiếp).
export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export interface LocationCreate {
  code: string;
  name: string;
  locationTypeCode: string;
  address: string | null;
  sortOrder: number;
}

export interface LocationUpdate {
  name: string;
  locationTypeCode: string;
  address: string | null;
  sortOrder: number;
  active: boolean;
  expectedUpdatedAt: string;
}

/** Mã địa điểm: chữ HOA, số, gạch dưới; 2–40 ký tự; bắt đầu bằng chữ (khớp CHECK của migration 0010). */
export const LOCATION_CODE_RE = /^[A-Z][A-Z0-9_]{1,39}$/;
const TYPE_CODE_RE = /^[A-Z][A-Z_]{1,29}$/;

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

function cleanText(v: unknown, label: string, min: number, max: number): Result<string> {
  if (typeof v !== "string") return fail(`${label} là bắt buộc.`);
  const s = v.trim().replace(/\s+/g, " ");
  if (s.length < min) return fail(`${label} là bắt buộc.`);
  if (s.length > max) return fail(`${label} tối đa ${max} ký tự.`);
  return { ok: true, value: s };
}

function common(b: Record<string, unknown>): Result<Omit<LocationCreate, "code">> {
  const name = cleanText(b.name, "Tên địa điểm", 1, 100);
  if (!name.ok) return name;
  if (typeof b.locationTypeCode !== "string" || !TYPE_CODE_RE.test(b.locationTypeCode)) return fail("Loại địa điểm không hợp lệ.");
  let address: string | null = null;
  if (b.address !== undefined && b.address !== null && b.address !== "") {
    const a = cleanText(b.address, "Địa chỉ", 1, 300);
    if (!a.ok) return a;
    address = a.value;
  }
  const sortOrder = b.sortOrder === undefined ? 0 : b.sortOrder;
  if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) return fail("Thứ tự phải là số nguyên từ 0 đến 9999.");
  return { ok: true, value: { name: name.value, locationTypeCode: b.locationTypeCode, address, sortOrder } };
}

export function validateLocationCreate(body: Record<string, unknown> | null): Result<LocationCreate> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (typeof body.code !== "string" || !LOCATION_CODE_RE.test(body.code)) return fail("Mã địa điểm gồm chữ HOA, số, gạch dưới (2–40 ký tự, bắt đầu bằng chữ), ví dụ QUAY_VE_05.");
  const c = common(body);
  return c.ok ? { ok: true, value: { code: body.code, ...c.value } } : c;
}

export function validateLocationUpdate(body: Record<string, unknown> | null): Result<LocationUpdate> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (typeof body.expectedUpdatedAt !== "string" || !body.expectedUpdatedAt) return fail("Thiếu mốc cập nhật (expectedUpdatedAt) — hãy tải lại trang.");
  if (typeof body.active !== "boolean") return fail("Trạng thái hoạt động phải là true/false.");
  const c = common(body);
  return c.ok ? { ok: true, value: { ...c.value, active: body.active, expectedUpdatedAt: body.expectedUpdatedAt } } : c;
}
