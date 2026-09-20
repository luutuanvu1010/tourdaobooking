// Module parties — hồ sơ (cá nhân/tổ chức), liên hệ, vai trò theo nơi, quan hệ (ADR-0001, ADR-0008). Route: /api/parties*.
// Phụ thuộc: locations (khoá ngoại + nhãn nơi qua view công bố) và audit (dấu vết). Module khác CHỈ import từ file này.
// Ghi dữ liệu trả CÂU LỆNH chưa chạy (newPersonStatements…) để module gọi gộp vào một db.batch() — `staff` tạo tài khoản kèm hồ sơ như vậy.
import { auditStatement } from "../audit";
import type {
  ContactPointDto, PartyDto, PartyListItemDto, PartyListResponse, PartyLookupResponse, PartyMetaResponse, PartyRelationshipDto, PartyResponse, PartyRoleDto,
} from "../../shared/contracts";
import { UUID_RE, error, escapeLike, intParam, json, readJson } from "../../shared/http";
import { normalizePhone } from "../../shared/phone";
import { route, type AppModule } from "../../shared/router";
import { vnToday } from "../../shared/vn-date";
import {
  addContactStatements, addRelationshipStatement, addRoleStatement, endContactStatement, endRelationshipStatement, endRoleStatement, findParty, findPartiesByPhone,
  getPartyDetail, listParties, listRelationshipTypes, listRoleTypes, newOrganizationStatements, newPersonStatements, updatePartyStatements,
  type PartyListRow, type PartyRow, type ContactRow, type RelationshipRow, type RoleRow,
} from "./repository";
import {
  PARTY_ID_RE, ROW_ID_RE, composePersonName, splitPersonName, validateContact, validateEndDate, validatePartyCreate, validatePartyUpdate, validateRelationship, validateRole,
} from "./rules";

export { composePersonName, newOrganizationStatements, newPersonStatements, findPartiesByPhone, splitPersonName };
export type { ContactInput, OrgFields, PersonName, RoleInput } from "./rules";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy hồ sơ.");
const STALE = () => error(409, "stale", "Hồ sơ vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
const NOT_OPEN = () => error(409, "not_open", "Dòng này không còn đang hiệu lực (đã đóng hoặc không tồn tại), hoặc ngày kết thúc trước ngày bắt đầu.");

/** Lỗi ràng buộc của CSDL → phản hồi rõ nghĩa; lỗi lạ trả null để ném lên (500 có requestId). */
function constraintProblem(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : "";
  if (/party_role_overlap|pty_party_role_open_uq/.test(m)) return error(409, "role_overlap", "Hồ sơ này đã giữ vai trò đó ở nơi đó trong khoảng thời gian trùng.");
  if (/party_relationship_overlap|UNIQUE constraint failed: pty_party_relationship/.test(m)) return error(409, "relationship_overlap", "Quan hệ này đã có trong khoảng thời gian trùng.");
  if (/FOREIGN KEY constraint failed/.test(m)) return error(400, "invalid_input", "Loại vai trò/quan hệ, địa điểm hoặc hồ sơ liên quan không tồn tại.");
  return null;
}

const toListItem = (r: PartyListRow): PartyListItemDto => ({
  id: r.id,
  kind: r.party_kind,
  displayName: r.display_name,
  active: r.active === 1,
  primaryPhone: r.primary_phone,
  roleCodes: r.role_codes ? [...new Set(r.role_codes.split(","))] : [],
});

const toContact = (c: ContactRow): ContactPointDto => ({
  id: c.id,
  kind: c.contact_kind_code as ContactPointDto["kind"],
  value: c.value,
  label: c.label,
  isPrimary: c.is_primary === 1,
  validFrom: c.valid_from_date,
  validTo: c.valid_to_date,
});
const toRole = (r: RoleRow): PartyRoleDto => ({
  id: r.id,
  roleTypeCode: r.role_type_code,
  roleName: r.role_name,
  locationId: r.location_id,
  locationName: r.location_name,
  validFrom: r.valid_from_date,
  validTo: r.valid_to_date,
});
const toRelationship = (r: RelationshipRow): PartyRelationshipDto => ({
  id: r.id,
  typeCode: r.relationship_type_code,
  typeName: r.type_name,
  fromPartyId: r.from_party_id,
  fromPartyName: r.from_name,
  toPartyId: r.to_party_id,
  toPartyName: r.to_name,
  validFrom: r.valid_from_date,
  validTo: r.valid_to_date,
});

function toDetail(d: { party: PartyRow; contacts: ContactRow[]; roles: RoleRow[]; relationships: RelationshipRow[] }, today: string): PartyDto {
  const p = d.party;
  const roles = d.roles.map(toRole);
  const openRoleCodes = roles.filter((r) => r.validFrom <= today && (r.validTo === null || r.validTo >= today)).map((r) => r.roleTypeCode);
  return {
    id: p.id,
    kind: p.party_kind,
    displayName: p.display_name,
    active: p.active === 1,
    primaryPhone: d.contacts.find((c) => c.contact_kind_code === "PHONE" && c.is_primary === 1 && c.valid_to_date === null)?.value ?? null,
    roleCodes: [...new Set(openRoleCodes)],
    familyName: p.family_name,
    middleName: p.middle_name,
    givenName: p.given_name,
    legalName: p.legal_name,
    taxCode: p.tax_code,
    address: p.address,
    invoiceEmail: p.invoice_email,
    contacts: d.contacts.map(toContact),
    roles,
    relationships: d.relationships.map(toRelationship),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

const KIND_LABEL = { PERSON: "cá nhân", ORGANIZATION: "tổ chức" } as const;
const idParam = (params: Record<string, string>, name: string, re: RegExp): string | null => (re.test(params[name] ?? "") ? params[name]! : null);

async function respondParty(db: D1Database, id: string, status = 200): Promise<Response> {
  const detail = await getPartyDetail(db, id);
  return detail ? json({ party: toDetail(detail, vnToday(new Date())) } satisfies PartyResponse, status) : NOT_FOUND();
}

export const partiesModule: AppModule = {
  name: "parties",
  routes: [
    // ---- Tra cứu (khai TRƯỚC :id để "meta"/"lookup" không bị hiểu là id) ------------------------------------------------
    route("GET", "/api/parties/meta", "staff", async ({ env }) => {
      const [roleTypes, relationshipTypes] = await Promise.all([listRoleTypes(env.DB), listRelationshipTypes(env.DB)]);
      return json({ roleTypes, relationshipTypes } satisfies PartyMetaResponse);
    }),

    route("GET", "/api/parties/lookup", "staff", async ({ env, url }) => {
      const phone = normalizePhone(url.searchParams.get("phone") ?? "");
      if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
      const rows = await findPartiesByPhone(env.DB, phone, vnToday(new Date()));
      return json({ matches: rows.map(toListItem) } satisfies PartyLookupResponse);
    }),

    route("GET", "/api/parties", "staff", async ({ env, url }) => {
      const kindRaw = url.searchParams.get("kind");
      if (kindRaw && kindRaw !== "PERSON" && kindRaw !== "ORGANIZATION") return error(400, "invalid_input", "Loại hồ sơ lọc không hợp lệ.");
      const role = url.searchParams.get("role") || null;
      if (role && !/^[A-Z][A-Z_]{1,29}$/.test(role)) return error(400, "invalid_input", "Mã vai trò lọc không hợp lệ.");
      const location = url.searchParams.get("location") || null;
      if (location && !UUID_RE.test(location)) return error(400, "invalid_input", "Địa điểm lọc không hợp lệ.");
      const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
      const digits = q.replace(/\D/g, "");
      const limit = intParam(url.searchParams.get("limit"), 30, 1, 100);
      const { rows, hasMore } = await listParties(env.DB, {
        today: vnToday(new Date()),
        kind: (kindRaw as "PERSON" | "ORGANIZATION" | null) || null,
        q: q ? `%${escapeLike(q)}%` : null,
        phoneLike: q && digits.length >= 3 ? `%${digits}%` : null,
        roleCode: role,
        locationId: location,
        includeInactive: url.searchParams.get("includeInactive") === "1",
        limit,
        offset: intParam(url.searchParams.get("offset"), 0, 0, 100000),
      });
      return json({ parties: rows.map(toListItem), hasMore } satisfies PartyListResponse);
    }),

    // ---- Tạo / xem / sửa -----------------------------------------------------------------------------------------------
    route("POST", "/api/parties", "staff", async ({ request, env, staff }) => {
      const parsed = validatePartyCreate(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const now = new Date();
      const at = now.toISOString();
      const today = vnToday(now);
      const made =
        v.kind === "PERSON"
          ? newPersonStatements(env.DB, { name: v.name, contacts: v.contacts, contactsFrom: today }, staff.id, at)
          : newOrganizationStatements(env.DB, { org: v.org, contacts: v.contacts, contactsFrom: today }, staff.id, at);
      const name = v.kind === "PERSON" ? composePersonName(v.name) : v.org.displayName;
      // Không ghi SĐT/email/MST vào nhật ký (chỉ tên và loại) — đặc tả N1 §5.
      await env.DB.batch([...made.statements, auditStatement(env.DB, { staffId: staff.id, action: "party_created", at, targetType: "party", targetId: made.partyId, detail: `${KIND_LABEL[v.kind]} "${name}"` })]);
      return respondParty(env.DB, made.partyId, 201);
    }),

    route("GET", "/api/parties/:id", "staff", async ({ env, params }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      return id ? respondParty(env.DB, id) : NOT_FOUND();
    }),

    route("PUT", "/api/parties/:id", "staff", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      const current = id ? await findParty(env.DB, id) : null;
      if (!id || !current) return NOT_FOUND();
      const parsed = validatePartyUpdate(await readJson(request), current.party_kind);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const at = new Date().toISOString();
      const stmts = updatePartyStatements(env.DB, id, parsed.value, staff.id, at);
      const results = await env.DB.batch([...stmts, auditStatement(env.DB, { staffId: staff.id, action: "party_updated", at, targetType: "party", targetId: id, detail: `${KIND_LABEL[current.party_kind]}` }, "changes() > 0")]);
      if ((results[stmts.length - 1]!.meta.changes ?? 0) === 0) return STALE();
      return respondParty(env.DB, id);
    }),

    // ---- Liên hệ (SALES/ACCOUNTING/ADMIN: như sửa hồ sơ) ------------------------------------------------------------------
    route("POST", "/api/parties/:id/contacts", "staff", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      const detail = id ? await getPartyDetail(env.DB, id) : null;
      if (!id || !detail) return NOT_FOUND();
      const parsed = validateContact(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const c = parsed.value;
      // Chưa có liên hệ đang mở cùng loại thì liên hệ này tự thành liên hệ chính.
      const hasOpen = detail.contacts.some((x) => x.contact_kind_code === c.kind && x.valid_to_date === null);
      if (!hasOpen) c.isPrimary = true;
      const now = new Date();
      const at = now.toISOString();
      await env.DB.batch([
        ...addContactStatements(env.DB, id, c, vnToday(now), staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_contact_changed", at, targetType: "party", targetId: id, detail: c.kind === "PHONE" ? "thêm số điện thoại" : "thêm email" }),
      ]);
      return respondParty(env.DB, id, 201);
    }),

    route("POST", "/api/parties/:id/contacts/:cid/end", "staff", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      const cid = idParam(params, "cid", ROW_ID_RE);
      if (!id || !cid || !(await findParty(env.DB, id))) return NOT_FOUND();
      const now = new Date();
      const to = validateEndDate(await readJson(request), vnToday(now));
      if (!to.ok) return error(400, "invalid_input", to.message);
      const at = now.toISOString();
      const results = await env.DB.batch([
        endContactStatement(env.DB, id, cid, to.value, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_contact_changed", at, targetType: "party", targetId: id, detail: "đóng một liên hệ" }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return NOT_OPEN();
      return respondParty(env.DB, id);
    }),

    // ---- Vai trò theo nơi (chỉ quản trị viên: ADR-0007 "vai trò hồ sơ") ----------------------------------------------------------
    route("POST", "/api/parties/:id/roles", "admin", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id || !(await findParty(env.DB, id))) return NOT_FOUND();
      const now = new Date();
      const parsed = validateRole(await readJson(request), vnToday(now));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const at = now.toISOString();
      try {
        await env.DB.batch([
          addRoleStatement(env.DB, id, parsed.value, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "party_role_added", at, targetType: "party", targetId: id, detail: parsed.value.roleTypeCode }),
        ]);
      } catch (e) {
        const problem = constraintProblem(e);
        if (problem) return problem;
        throw e;
      }
      return respondParty(env.DB, id, 201);
    }),

    route("POST", "/api/parties/:id/roles/:rid/end", "admin", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      const rid = idParam(params, "rid", ROW_ID_RE);
      if (!id || !rid || !(await findParty(env.DB, id))) return NOT_FOUND();
      const now = new Date();
      const to = validateEndDate(await readJson(request), vnToday(now));
      if (!to.ok) return error(400, "invalid_input", to.message);
      const at = now.toISOString();
      const results = await env.DB.batch([
        endRoleStatement(env.DB, id, rid, to.value, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_role_ended", at, targetType: "party", targetId: id }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return NOT_OPEN();
      return respondParty(env.DB, id);
    }),

    // ---- Quan hệ giữa hai hồ sơ (chỉ quản trị viên — đề xuất của đặc tả N1 §7.2, đã duyệt) ------------------------------------------
    route("POST", "/api/parties/:id/relationships", "admin", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id || !(await findParty(env.DB, id))) return NOT_FOUND();
      const now = new Date();
      const parsed = validateRelationship(await readJson(request), id, vnToday(now));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const at = now.toISOString();
      try {
        await env.DB.batch([
          addRelationshipStatement(env.DB, parsed.value, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "party_relationship_changed", at, targetType: "party", targetId: id, detail: `thêm quan hệ ${parsed.value.typeCode}` }),
        ]);
      } catch (e) {
        const problem = constraintProblem(e);
        if (problem) return problem;
        throw e;
      }
      return respondParty(env.DB, id, 201);
    }),

    route("POST", "/api/parties/:id/relationships/:rid/end", "admin", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      const rid = idParam(params, "rid", ROW_ID_RE);
      if (!id || !rid || !(await findParty(env.DB, id))) return NOT_FOUND();
      const now = new Date();
      const to = validateEndDate(await readJson(request), vnToday(now));
      if (!to.ok) return error(400, "invalid_input", to.message);
      const at = now.toISOString();
      const results = await env.DB.batch([
        endRelationshipStatement(env.DB, id, rid, to.value, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_relationship_changed", at, targetType: "party", targetId: id, detail: "kết thúc một quan hệ" }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return NOT_OPEN();
      return respondParty(env.DB, id);
    }),
  ],
};
