// Luật thuần của module parties: tách/ghép tên người, kiểm liên hệ, thời hạn, đầu vào hồ sơ/vai trò/quan hệ. Không I/O.
// Import bằng đuôi .ts (node --test chạy trực tiếp). Giới hạn độ dài khớp CHECK của migration 0011.
import { normalizePhone } from "../../shared/phone.ts";
import { isISODate } from "../../shared/vn-date.ts";
import { PARTY_ID_RE } from "../../shared/party-id.ts";

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

/** id hồ sơ: UUID, hoặc 'pty-<uuid staff>' của hồ sơ nhân sự do migration 0012 tạo. Nguồn ở src/shared/party-id.ts (dùng chung với `orders` và giao diện). */
export { PARTY_ID_RE };
/** id dòng con (liên hệ, vai trò, quan hệ): UUID, hoặc 'ptr-<uuid staff>' của vai STAFF do migration 0012 tạo. */
export const ROW_ID_RE = /^(?:ptr-)?[0-9a-f-]{36}$/;
const UUID_RE = /^[0-9a-f-]{36}$/;
const CODE_RE = /^[A-Z][A-Z_]{1,29}$/;

// ---------------------------------------------------------------------------------------------------------------------
// Tên người
// ---------------------------------------------------------------------------------------------------------------------
export interface PersonName {
  family: string | null;
  middle: string | null;
  given: string;
}

const squash = (s: string): string => s.trim().replace(/\s+/g, " ");

/** Tách một chuỗi họ tên: tên = từ cuối; họ = từ đầu (nếu ≥ 2 từ); tên đệm = phần giữa. Cùng quy tắc với backfill của migration 0012. */
export function splitPersonName(full: string): PersonName | null {
  const tokens = squash(full).split(" ").filter(Boolean);
  if (tokens.length === 0) return null;
  const given = tokens[tokens.length - 1]!;
  if (tokens.length === 1) return { family: null, middle: null, given };
  const middle = tokens.slice(1, -1).join(" ");
  return { family: tokens[0]!, middle: middle || null, given };
}

/** Tên hiển thị của cá nhân: họ + tên đệm + tên (bỏ phần trống). Một nguồn cho mọi đường ghi (R-N1-3). */
export function composePersonName(n: { family?: string | null; middle?: string | null; given: string }): string {
  return [n.family, n.middle, n.given].filter((p): p is string => typeof p === "string" && p.length > 0).join(" ");
}

/**
 * NGUỒN DUY NHẤT của các giới hạn độ dài tên (khớp CHECK của `pty_person` ở migration 0011: họ 1–60, đệm 1–100, tên 1–60)
 * và của trần tên hiển thị `pty_party.display_name` (200). Module khác KHÔNG chép các con số này — dùng `validatePersonFullName`.
 */
function checkNameLimits(name: PersonName): Result<PersonName> {
  if (name.given.length > 60 || (name.family?.length ?? 0) > 60 || (name.middle?.length ?? 0) > 100) return fail("Họ tối đa 60, tên đệm tối đa 100, tên tối đa 60 ký tự.");
  if (composePersonName(name).length > 200) return fail("Họ tên tối đa 200 ký tự.");
  return { ok: true, value: name };
}

/**
 * Tách một chuỗi họ tên hiển thị rồi kiểm theo đúng giới hạn sẽ ghi vào `pty_person`. Trả tên đã tách, hoặc thông báo lỗi tiếng Việt.
 * Dùng cho mọi đường tạo/đổi tên tài khoản (module staff) để tên quá dài bị chặn ở tầng nhận đầu vào (400) thay vì làm vỡ `db.batch()` (500).
 */
export function validatePersonFullName(full: string): Result<PersonName> {
  const name = splitPersonName(full);
  if (!name) return fail("Họ tên là bắt buộc.");
  return checkNameLimits(name);
}

function personName(b: Record<string, unknown>): Result<PersonName> {
  let name: PersonName | null;
  if (typeof b.fullName === "string") name = splitPersonName(b.fullName);
  else {
    const part = (v: unknown): string | null => (typeof v === "string" && squash(v) ? squash(v) : null);
    const given = part(b.givenName);
    name = given ? { family: part(b.familyName), middle: part(b.middleName), given } : null;
  }
  if (!name) return fail("Họ tên là bắt buộc.");
  return checkNameLimits(name);
}

// ---------------------------------------------------------------------------------------------------------------------
// Thời hạn (ngày dân sự giờ Việt Nam)
// ---------------------------------------------------------------------------------------------------------------------
/** `from` mặc định = hôm nay; `to` rỗng = còn hiệu lực. Ngày phải đúng lịch; to ≥ from. */
export function validatePeriod(fromRaw: unknown, toRaw: unknown, today: string): Result<{ from: string; to: string | null }> {
  const from = fromRaw === undefined || fromRaw === null || fromRaw === "" ? today : fromRaw;
  if (typeof from !== "string" || !isISODate(from)) return fail("Ngày bắt đầu không hợp lệ (YYYY-MM-DD).");
  if (toRaw === undefined || toRaw === null || toRaw === "") return { ok: true, value: { from, to: null } };
  if (typeof toRaw !== "string" || !isISODate(toRaw)) return fail("Ngày kết thúc không hợp lệ (YYYY-MM-DD).");
  if (toRaw < from) return fail("Ngày kết thúc không được trước ngày bắt đầu.");
  return { ok: true, value: { from, to: toRaw } };
}

/**
 * Ngày kết thúc khi đóng một dòng. Vắng — `undefined`, `null` hoặc `""` (ô ngày trống của giao diện) — = hôm nay, hiểu giống
 * `validatePeriod`. Việc "không trước ngày bắt đầu" do câu UPDATE kiểm (changes() = 0).
 */
export function validateEndDate(body: Record<string, unknown> | null, today: string): Result<string> {
  const raw = body?.validTo;
  const to = raw === undefined || raw === null || raw === "" ? today : raw;
  return typeof to === "string" && isISODate(to) ? { ok: true, value: to } : fail("Ngày kết thúc không hợp lệ (YYYY-MM-DD).");
}

// ---------------------------------------------------------------------------------------------------------------------
// Liên hệ
// ---------------------------------------------------------------------------------------------------------------------
export type ContactKind = "PHONE" | "EMAIL";
export interface ContactInput {
  kind: ContactKind;
  value: string;
  valueNormalized: string;
  label: string | null;
  isPrimary: boolean;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(v: unknown): Result<ContactInput> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return fail("Liên hệ không hợp lệ.");
  const b = v as Record<string, unknown>;
  if (b.kind !== "PHONE" && b.kind !== "EMAIL") return fail("Loại liên hệ phải là PHONE hoặc EMAIL.");
  if (typeof b.value !== "string" || !b.value.trim()) return fail("Thiếu giá trị liên hệ.");
  const value = b.value.trim();
  let valueNormalized: string;
  if (b.kind === "PHONE") {
    const p = normalizePhone(value);
    if (!p) return fail("Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
    valueNormalized = p;
  } else {
    if (value.length > 200 || !EMAIL_RE.test(value)) return fail("Email không hợp lệ.");
    valueNormalized = value.toLowerCase();
  }
  if (value.length > 200) return fail("Liên hệ tối đa 200 ký tự.");
  let label: string | null = null;
  if (b.label !== undefined && b.label !== null && b.label !== "") {
    if (typeof b.label !== "string" || squash(b.label).length > 50) return fail("Ghi chú liên hệ tối đa 50 ký tự.");
    label = squash(b.label) || null;
  }
  if (b.isPrimary !== undefined && typeof b.isPrimary !== "boolean") return fail("isPrimary phải là true/false.");
  return { ok: true, value: { kind: b.kind, value, valueNormalized, label, isPrimary: b.isPrimary === true } };
}

/**
 * Danh sách liên hệ khi tạo hồ sơ (≤ 5). Chốt cờ chính CUỐI CÙNG cho từng loại: có đúng một dòng chính đánh dấu thì giữ, nhiều hơn một → lỗi,
 * không có → dòng đầu của loại đó là chính. Nhờ vậy câu INSERT dùng thẳng cờ, không phụ thuộc thứ tự chèn.
 */
export function validateContactList(v: unknown): Result<ContactInput[]> {
  if (v === undefined || v === null) return { ok: true, value: [] };
  if (!Array.isArray(v) || v.length > 5) return fail("Tối đa 5 liên hệ khi tạo hồ sơ.");
  const list: ContactInput[] = [];
  for (const item of v) {
    const c = validateContact(item);
    if (!c.ok) return c;
    list.push(c.value);
  }
  for (const kind of ["PHONE", "EMAIL"] as const) {
    const of = list.filter((c) => c.kind === kind);
    if (of.filter((c) => c.isPrimary).length > 1) return fail("Mỗi loại liên hệ chỉ có một liên hệ chính.");
    if (of.length > 0 && !of.some((c) => c.isPrimary)) of[0]!.isPrimary = true;
  }
  return { ok: true, value: list };
}

// ---------------------------------------------------------------------------------------------------------------------
// Hồ sơ
// ---------------------------------------------------------------------------------------------------------------------
export interface OrgFields {
  displayName: string;
  legalName: string | null;
  taxCode: string | null;
  address: string | null;
  invoiceEmail: string | null;
}
export type PartyCreate =
  | { kind: "PERSON"; name: PersonName; contacts: ContactInput[] }
  | { kind: "ORGANIZATION"; org: OrgFields; contacts: ContactInput[] };
export type PartyUpdate =
  | { kind: "PERSON"; name: PersonName; active: boolean; expectedUpdatedAt: string }
  | { kind: "ORGANIZATION"; org: OrgFields; active: boolean; expectedUpdatedAt: string };

const optText = (v: unknown, label: string, max: number): Result<string | null> => {
  if (v === undefined || v === null || v === "") return { ok: true, value: null };
  if (typeof v !== "string" || squash(v).length > max) return fail(`${label} tối đa ${max} ký tự.`);
  return { ok: true, value: squash(v) || null };
};

function orgFields(b: Record<string, unknown>): Result<OrgFields> {
  if (typeof b.displayName !== "string" || !squash(b.displayName)) return fail("Tên gọi của tổ chức là bắt buộc.");
  if (squash(b.displayName).length > 200) return fail("Tên gọi tối đa 200 ký tự.");
  const legalName = optText(b.legalName, "Tên pháp lý", 300);
  if (!legalName.ok) return legalName;
  const address = optText(b.address, "Địa chỉ", 300);
  if (!address.ok) return address;
  let taxCode: string | null = null;
  if (b.taxCode !== undefined && b.taxCode !== null && b.taxCode !== "") {
    const t = typeof b.taxCode === "string" ? b.taxCode.replace(/\s+/g, "") : "";
    if (!/^\d{10}(\d{3}|-\d{3})?$/.test(t)) return fail("Mã số thuế gồm 10 hoặc 13 chữ số (có thể ghi dạng 10 số-3 số).");
    taxCode = t;
  }
  let invoiceEmail: string | null = null;
  if (b.invoiceEmail !== undefined && b.invoiceEmail !== null && b.invoiceEmail !== "") {
    if (typeof b.invoiceEmail !== "string" || b.invoiceEmail.trim().length > 200 || !EMAIL_RE.test(b.invoiceEmail.trim())) return fail("Email nhận hoá đơn không hợp lệ.");
    invoiceEmail = b.invoiceEmail.trim().toLowerCase();
  }
  return { ok: true, value: { displayName: squash(b.displayName), legalName: legalName.value, taxCode, address: address.value, invoiceEmail } };
}

export function validatePartyCreate(body: Record<string, unknown> | null): Result<PartyCreate> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const contacts = validateContactList(body.contacts);
  if (!contacts.ok) return contacts;
  if (body.kind === "PERSON") {
    const name = personName(body);
    return name.ok ? { ok: true, value: { kind: "PERSON", name: name.value, contacts: contacts.value } } : name;
  }
  if (body.kind === "ORGANIZATION") {
    const org = orgFields(body);
    return org.ok ? { ok: true, value: { kind: "ORGANIZATION", org: org.value, contacts: contacts.value } } : org;
  }
  return fail("Loại hồ sơ phải là PERSON hoặc ORGANIZATION.");
}

/** Loại hồ sơ KHÔNG đổi được: `kind` lấy từ hồ sơ hiện có. */
export function validatePartyUpdate(body: Record<string, unknown> | null, kind: "PERSON" | "ORGANIZATION"): Result<PartyUpdate> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (typeof body.expectedUpdatedAt !== "string" || !body.expectedUpdatedAt) return fail("Thiếu mốc cập nhật (expectedUpdatedAt) — hãy tải lại trang.");
  if (typeof body.active !== "boolean") return fail("Trạng thái hoạt động phải là true/false.");
  if (kind === "PERSON") {
    const name = personName(body);
    return name.ok ? { ok: true, value: { kind, name: name.value, active: body.active, expectedUpdatedAt: body.expectedUpdatedAt } } : name;
  }
  const org = orgFields(body);
  return org.ok ? { ok: true, value: { kind, org: org.value, active: body.active, expectedUpdatedAt: body.expectedUpdatedAt } } : org;
}

// ---------------------------------------------------------------------------------------------------------------------
// Vai trò theo nơi và quan hệ
// ---------------------------------------------------------------------------------------------------------------------
export interface RoleInput {
  roleTypeCode: string;
  locationId: string | null;
  from: string;
  to: string | null;
}

export function validateRole(body: Record<string, unknown> | null, today: string): Result<RoleInput> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (typeof body.roleTypeCode !== "string" || !CODE_RE.test(body.roleTypeCode)) return fail("Loại công việc không hợp lệ.");
  let locationId: string | null = null;
  if (body.locationId !== undefined && body.locationId !== null && body.locationId !== "") {
    if (typeof body.locationId !== "string" || !UUID_RE.test(body.locationId)) return fail("Địa điểm không hợp lệ.");
    locationId = body.locationId;
  }
  const period = validatePeriod(body.validFrom, body.validTo, today);
  return period.ok ? { ok: true, value: { roleTypeCode: body.roleTypeCode, locationId, from: period.value.from, to: period.value.to } } : period;
}

/**
 * Điều kiện DỮ LIỆU của việc gán vai "Công ty chủ" (= ĐỔI công ty chủ — chủ trả lời 2026-09-28 "cho Super Admin đổi"; ADR-0024 6.5): chỉ hồ sơ tổ chức;
 * không gắn nơi; không ngày kết thúc (vai không bao giờ trống — đổi thì gán cho hồ sơ khác); có hiệu lực từ hôm nay (đúng như hàm ownerCompany đọc dòng
 * đang mở). null = hợp lệ. Quyền (ô company.legal.write) route hỏi TRƯỚC, riêng.
 */
export function ownerCompanyAssignProblem(kind: "PERSON" | "ORGANIZATION", r: RoleInput, today: string): string | null {
  if (kind !== "ORGANIZATION") return "Chỉ hồ sơ tổ chức mới làm công ty chủ được.";
  if (r.locationId !== null) return "Công ty chủ không gắn với một nơi làm cụ thể — để trống ô “Nơi làm”.";
  if (r.to !== null) return "Công ty chủ không có ngày kết thúc. Muốn đổi thì gán “Công ty chủ” cho hồ sơ tổ chức khác.";
  if (r.from !== today) return "Đổi công ty chủ có hiệu lực từ hôm nay — để trống ô ngày bắt đầu."; // lớp CSDL: trigger *_start_today (ADR-0043 điều 2)
  return null;
}

export interface RelationshipInput {
  fromPartyId: string;
  toPartyId: string;
  typeCode: string;
  from: string;
  to: string | null;
}

/** `partyId` (từ đường dẫn) phải là một trong hai đầu của quan hệ. */
export function validateRelationship(body: Record<string, unknown> | null, partyId: string, today: string): Result<RelationshipInput> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const { fromPartyId, toPartyId, relationshipTypeCode } = body;
  if (typeof fromPartyId !== "string" || typeof toPartyId !== "string" || !PARTY_ID_RE.test(fromPartyId) || !PARTY_ID_RE.test(toPartyId)) return fail("Hồ sơ người liên hệ không hợp lệ.");
  if (fromPartyId === toPartyId) return fail("Một hồ sơ không thể là người liên hệ của chính nó.");
  if (fromPartyId !== partyId && toPartyId !== partyId) return fail("Người liên hệ phải gắn với hồ sơ đang xem.");
  if (typeof relationshipTypeCode !== "string" || !CODE_RE.test(relationshipTypeCode)) return fail("Loại liên hệ không hợp lệ.");
  const period = validatePeriod(body.validFrom, body.validTo, today);
  return period.ok ? { ok: true, value: { fromPartyId, toPartyId, typeCode: relationshipTypeCode, from: period.value.from, to: period.value.to } } : period;
}
