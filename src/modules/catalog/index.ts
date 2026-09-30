// Module catalog — danh mục dịch vụ & giá, đồng bộ từ Google Sheet về D1 (spec §2.4-6). Route: /api/catalog*.
// Sheet là nguồn chính; Admin có thể ghi đè giá/ẩn dịch vụ (ghi đè không bị lần đồng bộ sau đè mất). App KHÔNG BAO GIỜ ghi ngược vào Sheet.
import { auditStatement, type AuditAction } from "../audit";
import { error, json, readJson } from "../../shared/http";
import { can, isOffice } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import type {
  CatalogAdminGroupDto, CatalogAdminItemDto, CatalogAdminResponse, CatalogGroupAssignResponse, CatalogGroupHistoryResponse, CatalogGroupResponse,
  CatalogGroupsResponse, CatalogItemResponse, CatalogPublicResponse, CatalogServiceDto, CatalogSyncResponse,
} from "../../shared/contracts";
import { CATALOG_CODE_RE as CODE_RE, MAX_AMOUNT_VND as MAX_PRICE, PAX_LABEL, PAX_ORDER, parseUnit, type EffectiveService, type PaxCode } from "../../shared/order-lines";
import { getSyncState, loadAll, loadOne, saveOverride, type StoredItem } from "./repository";
import { acknowledge, applyOverride, money, patchOverride, toEffective, type OverridePatch } from "./rules";
import { bootstrapIfNeverSynced, syncCatalog } from "./service";
import { danhSachNhom, demDichVuCuaNhom, ganNhomStatements, lichSuNhom, maNhomMoi, nhomHienHanhTheoMa, nhomTheoMa, suaNhom, themNhom, type NhomRow } from "./nhom-repo";
import { kiemLoGan, kiemTenNhom, moTaDoiNhom, nhomChoForm } from "./nhom-rules";

export type { EffectiveService };

/**
 * API công khai của module (module khác CHỈ import từ file này): dịch vụ theo mã (bỏ `codes` = tất cả), giá đã áp ghi đè,
 * kèm cờ `visible`. Đơn hàng dùng để biết giá hiệu lực và dịch vụ nào đang bán được — không tự tính lại.
 */
export async function getEffectiveServices(db: D1Database, codes?: readonly string[]): Promise<Map<string, EffectiveService>> {
  const want = codes ? new Set(codes) : null;
  const all = await loadAll(db);
  return new Map(all.filter((s) => !want || want.has(s.code)).map((s) => [s.code, toEffective(s)]));
}

/** Dịch vụ như nhân viên bán hàng thấy: giá hiệu lực (đã áp ghi đè), không lộ thông tin ghi đè hay Sheet. */
function publicItem(e: EffectiveService, groupCode: string | null): CatalogServiceDto {
  return { code: e.code, name: e.name, unit: e.unit, prices: e.prices, notes: e.notes, supported: parseUnit(e.unit).kind !== "unknown", groupCode };
}

/** `groupCode`: nhóm hiện hành THẬT (ADR-0058 Đ5, kể cả nhóm đang tắt) — trộn ở đây từ nhom-repo, không sửa câu SELECT cũ của repository.ts. */
function adminItem(s: StoredItem, groupCode: string | null): CatalogAdminItemDto {
  const eff = applyOverride(s.prices, s.override);
  return {
    code: s.code,
    name: s.name,
    unit: s.unit,
    supported: parseUnit(s.unit).kind !== "unknown",
    inSheet: s.inSheet,
    notes: s.notes,
    sheetPrices: s.prices,
    prices: eff.prices,
    hidden: eff.hidden,
    overridden: eff.overridden,
    conflicts: eff.conflicts,
    overrideUpdatedAt: s.overrideUpdatedAt,
    updatedAt: s.updatedAt,
    groupCode,
  };
}

/** Một dịch vụ cho phản hồi của route quản trị một dịch vụ (PATCH/ack/bỏ ghi đè): kèm nhóm hiện hành để khớp `GET /api/catalog/admin`. */
async function adminItemKemNhom(db: D1Database, s: StoredItem): Promise<CatalogAdminItemDto> {
  return adminItem(s, (await nhomHienHanhTheoMa(db)).get(s.code) ?? null);
}

// ---- Nhóm dịch vụ (ADR-0058) ------------------------------------------------------------------------------------------------------------
function nhomDto(g: NhomRow, soDichVu: number): CatalogAdminGroupDto {
  return { code: g.code, name: g.name, sortOrder: g.sort_order, active: g.active === 1, soDichVu, updatedAt: g.updated_at };
}
const THU_TU_TOI_DA = 9999;
const laThuTu = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= THU_TU_TOI_DA;
const LOI_THU_TU = `Thứ tự phải là số nguyên từ 0 đến ${THU_TU_TOI_DA}.`;
const TRUNG_TEN = (ten: string) => error(409, "group_name_taken", `Tên "${ten}" trùng — đã có nhóm đang dùng tên này.`);
const KHONG_CO_NHOM = () => error(404, "not_found", "Không tìm thấy nhóm dịch vụ.");
const NHOM_VUA_DOI = () => error(409, "stale", "Nhóm vừa được người khác sửa. Tải lại rồi thử lại.");

function parsePatch(body: Record<string, unknown> | null): { patch?: OverridePatch; error?: string } {
  if (!body) return { error: "Dữ liệu không hợp lệ." };
  const patch: OverridePatch = {};
  if (body.hidden !== undefined) {
    if (typeof body.hidden !== "boolean") return { error: "hidden phải là true/false." };
    patch.hidden = body.hidden;
  }
  if (body.prices !== undefined) {
    if (!body.prices || typeof body.prices !== "object" || Array.isArray(body.prices)) return { error: "prices không hợp lệ." };
    patch.prices = {};
    for (const [k, v] of Object.entries(body.prices as Record<string, unknown>)) {
      if (!PAX_ORDER.includes(k as PaxCode)) return { error: `Loại khách "${k}" không hợp lệ.` };
      if (v !== null && (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0 || v > MAX_PRICE)) return { error: `Giá ${PAX_LABEL[k as PaxCode].toLowerCase()} phải là số nguyên VNĐ không âm.` };
      patch.prices[k as PaxCode] = v as number | null;
    }
  }
  return Object.keys(patch).length ? { patch } : { error: "Không có gì để thay đổi." };
}

/** Tải dịch vụ theo `:code`; mã sai dạng hoặc không có → null (route trả 404). */
async function loadByParam(db: D1Database, code: string | undefined): Promise<StoredItem | null> {
  return code && CODE_RE.test(code) ? loadOne(db, code) : null;
}
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy dịch vụ.");
const FORBIDDEN_PRICES = () => error(403, "forbidden", "Tài khoản này không được xem bảng giá.");

/**
 * Danh mục cho form lập đơn — MỘT nguồn cho cả `GET /api/catalog` (văn phòng) và `GET /api/catalog/for-order` (người lập đơn, ADR-0033):
 * giá bán lẻ hiệu lực (đã áp ghi đè), ghi chú cho khách, chỉ dịch vụ đang hiện; không giá gốc Sheet/thông tin ghi đè/cột nội bộ.
 * Lần gọi đầu khi CHƯA TỪNG đồng bộ tự kéo Sheet (`bootstrapIfNeverSynced`) — nên người gọi phải kiểm quyền TRƯỚC khi gọi hàm này.
 * `showSyncError`: chữ lỗi đồng bộ Sheet là chuyện vận hành nội bộ — chỉ trả cho người qua cổng office; người khác nhận `null`.
 */
async function catalogForOrderForm(env: Env, { showSyncError }: { showSyncError: boolean }): Promise<CatalogPublicResponse> {
  try {
    await bootstrapIfNeverSynced(env);
  } catch {
    /* Sheet lỗi ở lần đầu: vẫn trả danh mục rỗng + cảnh báo bên dưới */
  }
  const [items, state, nhomTheoDichVu, nhoms] = await Promise.all([loadAll(env.DB), getSyncState(env.DB), nhomHienHanhTheoMa(env.DB), danhSachNhom(env.DB)]);
  const visible = items
    .map(toEffective)
    .filter((e) => e.visible)
    .map((e) => publicItem(e, nhomTheoDichVu.get(e.code) ?? null));
  // ADR-0058 Đ5: dịch vụ của nhóm đang tắt → groupCode null; `groups` chỉ nhóm đang dùng có ≥ 1 dịch vụ đang hiện, xếp sort_order.
  const form = nhomChoForm(
    nhoms.map((g) => ({ code: g.code, name: g.name, sortOrder: g.sort_order, active: g.active === 1 })),
    visible,
  );
  return { items: form.items, sync: { lastSuccessAt: state.lastSuccessAt, error: showSyncError ? state.lastError : null }, groups: form.groups };
}

export const catalogModule: AppModule = {
  name: "catalog",
  routes: [
    // ---- Văn phòng: danh mục dịch vụ đang bán ------------------------------------------
    // Cổng "office" (ADR-0019 điều 1; ADR-0033 đưa về từ cổng "orders" của bản 1.15 — ADR-0028 điều 1 bị thay). Đối tác/Thực tập KHÔNG gọi route
    // này nữa: form lập đơn dùng `GET /api/catalog/for-order` bên dưới. ADR-0019 điều 2: danh mục trả GIÁ → hỏi `money.view` (mọi mã của OFFICE_GATE
    // đang `any` nên trung tính hôm nay; ngữ cảnh "của mình" giữ như bản trước cho khớp route người lập đơn).
    route("GET", "/api/catalog", "office", async ({ env, staff }) => {
      if (!can(staff, "money.view", { ownerId: staff.id })) return FORBIDDEN_PRICES();
      return json((await catalogForOrderForm(env, { showSyncError: true })) satisfies CatalogPublicResponse);
    }),

    // ---- Người lập đơn: danh mục để chọn nhanh trong form tạo/sửa đơn (ADR-0033, chủ dự án 2026-09-27) ----------
    // Cổng "orders" (văn phòng + Đối tác + Thực tập; sau Phần C thêm Hướng dẫn viên) chỉ lọc thô — CHỐT CHẶN THẬT là `order.create`, hỏi TRƯỚC mọi
    // truy vấn (kể cả bootstrapIfNeverSynced): Kế toán, Hướng dẫn viên (kể cả khi đã vào cổng orders và `money.view = any` theo ADR-0017) → 403,
    // đúng ADR-0019 điều 3 "hướng dẫn viên không đọc danh mục giá cho form lập đơn". Rồi mới hỏi `money.view` phạm vi "của mình" (người lập đơn
    // thấy giá của đơn mình lập; Đối tác/Thực tập `own` qua — bài khoá "order.create ⇒ money.view" ở src/shared/permissions.test.ts).
    // CHỈ ĐỌC, cùng nội dung văn phòng thấy (ADR-0028 điều 2 giữ); chữ lỗi đồng bộ Sheet chỉ cho người văn phòng.
    route("GET", "/api/catalog/for-order", "orders", async ({ env, staff }) => {
      if (!can(staff, "order.create")) return error(403, "forbidden", "Tài khoản này không lập đơn nên không xem được danh mục dịch vụ.");
      if (!can(staff, "money.view", { ownerId: staff.id })) return FORBIDDEN_PRICES();
      return json((await catalogForOrderForm(env, { showSyncError: isOffice(staff) })) satisfies CatalogPublicResponse);
    }),

    // ---- Admin -----------------------------------------------------------------------------
    route("GET", "/api/catalog/admin", "admin", async ({ env, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      const [items, state, nhomTheoDichVu, nhoms] = await Promise.all([loadAll(env.DB), getSyncState(env.DB), nhomHienHanhTheoMa(env.DB), danhSachNhom(env.DB)]);
      return json({
        items: items.map((s) => adminItem(s, nhomTheoDichVu.get(s.code) ?? null)),
        sync: state,
        groups: nhoms.map((g) => nhomDto(g, g.service_count)),
      } satisfies CatalogAdminResponse);
    }),

    // ---- Nhóm dịch vụ (ADR-0058 Đ3, Đ4) — cổng admin + can(admin.manage) DÒNG ĐẦU thân, trước mọi đọc thân/truy vấn. Khai TRƯỚC route `/api/catalog/:code…`.
    // Máy chủ KIỂM TRƯỚC khi ghi (nhóm có không, đang bật không, mã dịch vụ có trong danh mục không) — không phân loại lỗi bằng chữ lỗi của CSDL
    // (trigger `ctl_group_inactive` nổ cả khi mã nhóm không tồn tại). Lỗi CSDL còn lại (đua `seq`, đua tên) → 409. Dữ liệu + nhật ký MỘT `db.batch`.
    route("GET", "/api/catalog/groups", "admin", async ({ env, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      const [nhoms, nhomTheoDichVu, items] = await Promise.all([danhSachNhom(env.DB), nhomHienHanhTheoMa(env.DB), loadAll(env.DB)]);
      // "Chưa phân loại" cùng gốc với cột Nhóm của màn Danh mục: mọi dịch vụ của danh mục (kể cả ẩn / đã rời Sheet) không có nhóm hiện hành.
      const chuaPhanLoai = items.filter((s) => (nhomTheoDichVu.get(s.code) ?? null) === null).length;
      return json({ groups: nhoms.map((g) => nhomDto(g, g.service_count)), chuaPhanLoai } satisfies CatalogGroupsResponse);
    }),

    route("POST", "/api/catalog/groups", "admin", async ({ env, request, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      const body = await readJson(request);
      const ten = kiemTenNhom(body?.name);
      if (!ten.ok) return error(400, "invalid_input", ten.message);
      if (body?.sortOrder !== undefined && !laThuTu(body.sortOrder)) return error(400, "invalid_input", LOI_THU_TU);
      const nhoms = await danhSachNhom(env.DB);
      if (nhoms.some((g) => g.active === 1 && g.name === ten.value)) return TRUNG_TEN(ten.value);
      const sortOrder = laThuTu(body?.sortOrder) ? body.sortOrder : nhoms.reduce((m, g) => Math.max(m, g.sort_order), 0) + 1;
      const code = maNhomMoi();
      const now = new Date().toISOString();
      try {
        await env.DB.batch([
          themNhom(env.DB, { code, name: ten.value, sortOrder, staffId: staff.id, now }),
          auditStatement(env.DB, { staffId: staff.id, action: "catalog_group_created", at: now, targetType: "catalog", detail: ten.value }),
        ]);
      } catch {
        return error(409, "conflict", "Chưa thêm được nhóm — có thể vừa có người thêm nhóm cùng tên. Tải lại rồi thử lại.");
      }
      const moi = await nhomTheoMa(env.DB, code);
      if (!moi) return error(500, "internal", "Đã thêm nhóm nhưng chưa đọc lại được. Tải lại trang.");
      return json({ group: nhomDto(moi, 0) } satisfies CatalogGroupResponse, 201);
    }),

    route("PATCH", "/api/catalog/groups/:code", "admin", async ({ env, request, params, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      const body = await readJson(request);
      if (!body) return error(400, "invalid_input", "Dữ liệu không hợp lệ.");
      const expected = body.expectedUpdatedAt;
      if (typeof expected !== "string" || expected.length === 0) return error(400, "invalid_input", "Thiếu mốc sửa gần nhất của nhóm — tải lại rồi thử lại.");
      let name: string | undefined;
      if (body.name !== undefined) {
        const t = kiemTenNhom(body.name);
        if (!t.ok) return error(400, "invalid_input", t.message);
        name = t.value;
      }
      if (body.sortOrder !== undefined && !laThuTu(body.sortOrder)) return error(400, "invalid_input", LOI_THU_TU);
      if (body.active !== undefined && typeof body.active !== "boolean") return error(400, "invalid_input", "Trạng thái dùng / tắt không hợp lệ.");
      if (name === undefined && body.sortOrder === undefined && body.active === undefined) return error(400, "invalid_input", "Không có gì để thay đổi.");
      const cu = params.code ? await nhomTheoMa(env.DB, params.code) : null;
      if (!cu) return KHONG_CO_NHOM();
      if (cu.updated_at !== expected) return NHOM_VUA_DOI();
      const dangBat = cu.active === 1;
      const moi = { name: name ?? cu.name, sortOrder: laThuTu(body.sortOrder) ? body.sortOrder : cu.sort_order, active: typeof body.active === "boolean" ? body.active : dangBat };
      const doi: string[] = [];
      if (moi.name !== cu.name) doi.push(`tên ${cu.name} → ${moi.name}`);
      if (moi.sortOrder !== cu.sort_order) doi.push(`thứ tự ${cu.sort_order} → ${moi.sortOrder}`);
      if (moi.active !== dangBat) doi.push(moi.active ? "đã tắt → đang dùng" : "đang dùng → đã tắt");
      if (doi.length === 0) return json({ group: nhomDto(cu, await demDichVuCuaNhom(env.DB, cu.code)) } satisfies CatalogGroupResponse); // không đổi gì
      if (moi.active && (moi.name !== cu.name || !dangBat)) {
        // Tên chỉ cấm trùng giữa các nhóm ĐANG DÙNG (chỉ mục duy nhất một phần WHERE active = 1): đổi tên, hoặc BẬT LẠI nhóm tắt, đều phải kiểm.
        const trung = (await danhSachNhom(env.DB)).some((g) => g.code !== cu.code && g.active === 1 && g.name === moi.name);
        if (trung && !dangBat) return error(409, "group_name_taken", `Không bật lại được: đã có nhóm đang dùng tên "${moi.name}". Đổi tên một trong hai nhóm trước.`);
        if (trung) return TRUNG_TEN(moi.name);
      }
      if (dangBat && !moi.active) {
        const n = await demDichVuCuaNhom(env.DB, cu.code);
        if (n > 0) return error(409, "group_not_empty", `Nhóm còn ${n} dịch vụ, chuyển chúng sang nhóm khác trước.`);
      }
      const now = new Date().toISOString();
      let changes = 0;
      try {
        const res = await env.DB.batch([
          suaNhom(env.DB, { code: cu.code, name: moi.name, sortOrder: moi.sortOrder, active: moi.active, staffId: staff.id, now, updatedAtCu: expected }),
          auditStatement(env.DB, { staffId: staff.id, action: "catalog_group_updated", at: now, targetType: "catalog", detail: `${cu.name}: ${doi.join("; ")}` }, "changes() > 0"),
        ]);
        changes = res[0]?.meta.changes ?? 0;
      } catch {
        return error(409, "conflict", "Chưa lưu được nhóm — có thể vừa có người đặt cùng tên cho nhóm khác. Tải lại rồi thử lại.");
      }
      if (changes === 0) return NHOM_VUA_DOI();
      const sau = await nhomTheoMa(env.DB, cu.code);
      if (!sau) return KHONG_CO_NHOM();
      return json({ group: nhomDto(sau, await demDichVuCuaNhom(env.DB, cu.code)) } satisfies CatalogGroupResponse);
    }),

    route("PUT", "/api/catalog/group-assignments", "admin", async ({ env, request, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      const lo = kiemLoGan(await readJson(request));
      if (!lo.ok) return error(400, "invalid_input", lo.message);
      const { codes, groupCode } = lo.value;
      if (groupCode !== null) {
        const dich = await nhomTheoMa(env.DB, groupCode);
        if (!dich) return KHONG_CO_NHOM();
        if (dich.active !== 1) return error(409, "group_inactive", "Nhóm này đang tắt — bật lại nhóm trước khi chuyển dịch vụ vào.");
      }
      const [items, nhoms] = await Promise.all([loadAll(env.DB), danhSachNhom(env.DB)]);
      const coTrongDanhMuc = new Set(items.map((s) => s.code));
      const thieu = codes.filter((c) => !coTrongDanhMuc.has(c));
      if (thieu.length) return error(404, "not_found", `Không tìm thấy dịch vụ: ${thieu.join(", ")}.`);
      const now = new Date().toISOString();
      const gan = await ganNhomStatements(env.DB, { codes, groupCode, staffId: staff.id, now });
      if (gan.statements.length === 0) return json({ doi: 0, boQua: gan.boQua.length } satisfies CatalogGroupAssignResponse);
      const tenNhom = new Map(nhoms.map((g) => [g.code, g.name]));
      const ten = (code: string | null) => (code === null ? null : (tenNhom.get(code) ?? null));
      // ADR-0058 Đ3: mỗi dịch vụ đổi một dòng nhật ký, cùng lô với dòng gán — detail chỉ TÊN nhóm cũ → mới (không SĐT, email, MST).
      const nhatKy = gan.doi.map((d) =>
        auditStatement(env.DB, { staffId: staff.id, action: "catalog_group_assigned", at: now, targetType: "catalog", targetId: d.serviceCode, detail: moTaDoiNhom(ten(d.tuNhom), ten(d.denNhom)) }),
      );
      try {
        await env.DB.batch([...gan.statements, ...nhatKy]);
      } catch {
        return error(409, "conflict", "Có người vừa đổi nhóm của một trong các dịch vụ này — chưa lưu gì. Tải lại rồi thử lại.");
      }
      return json({ doi: gan.doi.length, boQua: gan.boQua.length } satisfies CatalogGroupAssignResponse);
    }),

    route("GET", "/api/catalog/:code/group-history", "admin", async ({ env, params, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      const item = await loadByParam(env.DB, params.code);
      if (!item) return NOT_FOUND();
      // `createdBy` là id tài khoản (null = Hệ thống gieo); tên người do màn Quản trị ghép từ GET /api/staff — `catalog` không phụ thuộc `staff`.
      const rows = await lichSuNhom(env.DB, item.code);
      return json({ items: rows.map((r) => ({ luc: r.valid_from_at, createdBy: r.created_by, nhom: r.group_code === null ? null : r.group_name })) } satisfies CatalogGroupHistoryResponse);
    }),

    route("POST", "/api/catalog/sync", "admin", async ({ env, request, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      const body = await readJson(request);
      const result = await syncCatalog(env, staff.id, { force: body?.force === true });
      if (result.ok) return json(result satisfies CatalogSyncResponse);
      return error(result.code === "sheet_unreachable" ? 502 : result.code === "sync_guard" ? 409 : 424, result.code, result.message);
    }),

    // Ghi đè giá / ẩn / hiện
    route("PATCH", "/api/catalog/:code", "admin", async ({ env, request, params, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      const item = await loadByParam(env.DB, params.code);
      if (!item) return NOT_FOUND();
      const parsed = parsePatch(await readJson(request));
      if (!parsed.patch) return error(400, "invalid_input", parsed.error!);
      const before = applyOverride(item.prices, item.override);
      const next = patchOverride(item.prices, item.override, parsed.patch);
      const after = applyOverride(item.prices, next);

      const audits: { action: AuditAction; detail?: string }[] = [];
      const priceNotes: string[] = [];
      let cleared = false;
      for (const c of PAX_ORDER) {
        const v = parsed.patch.prices?.[c];
        if (v === undefined) continue;
        if (v === null) cleared = true;
        else if (before.prices[c] !== after.prices[c]) priceNotes.push(`giá ${PAX_LABEL[c].toLowerCase()} ${money(before.prices[c])} → ${money(after.prices[c])} (Sheet: ${money(item.prices[c])})`);
      }
      if (priceNotes.length) audits.push({ action: "catalog_overridden", detail: priceNotes.join("; ") });
      if (cleared) audits.push({ action: "catalog_override_cleared", detail: "bỏ ghi đè giá một số loại khách" });
      if (parsed.patch.hidden !== undefined && parsed.patch.hidden !== before.hidden) audits.push({ action: parsed.patch.hidden ? "catalog_hidden" : "catalog_unhidden" });
      if (audits.length === 0 && !cleared) return json({ item: await adminItemKemNhom(env.DB, item) } satisfies CatalogItemResponse); // không đổi gì
      await saveOverride(env.DB, item.code, next, staff.id, new Date().toISOString(), audits);
      return json({ item: await adminItemKemNhom(env.DB, (await loadOne(env.DB, item.code))!) } satisfies CatalogItemResponse);
    }),

    // "Giữ ghi đè": đã xem Sheet đổi giá, xác nhận giữ giá ghi đè
    route("POST", "/api/catalog/:code/ack", "admin", async ({ env, params, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      const item = await loadByParam(env.DB, params.code);
      if (!item) return NOT_FOUND();
      if (!item.override) return error(409, "no_override", "Dịch vụ này không có ghi đè.");
      const eff = applyOverride(item.prices, item.override);
      if (eff.conflicts.length === 0) return json({ item: await adminItemKemNhom(env.DB, item) } satisfies CatalogItemResponse);
      await saveOverride(env.DB, item.code, acknowledge(item.prices, item.override), staff.id, new Date().toISOString(), [
        { action: "catalog_overridden", detail: `giữ giá ghi đè sau khi Sheet đổi giá (${eff.conflicts.map((c) => `${PAX_LABEL[c.code].toLowerCase()}: Sheet ${money(c.base)} → ${money(c.current)}`).join("; ")})` },
      ]);
      return json({ item: await adminItemKemNhom(env.DB, (await loadOne(env.DB, item.code))!) } satisfies CatalogItemResponse);
    }),

    // Bỏ toàn bộ ghi đè (giá + ẩn), quay về theo Sheet
    route("DELETE", "/api/catalog/:code/override", "admin", async ({ env, params, staff }) => {
      if (!can(staff, "admin.manage")) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      const item = await loadByParam(env.DB, params.code);
      if (!item) return NOT_FOUND();
      if (!item.override) return json({ item: await adminItemKemNhom(env.DB, item) } satisfies CatalogItemResponse);
      await saveOverride(env.DB, item.code, null, staff.id, new Date().toISOString(), [{ action: "catalog_override_cleared", detail: "quay về giá theo Sheet" }]);
      return json({ item: await adminItemKemNhom(env.DB, (await loadOne(env.DB, item.code))!) } satisfies CatalogItemResponse);
    }),
  ],
};

/** Cron Trigger: đồng bộ Sheet định kỳ, không có người thao tác (nhật ký ghi là "Hệ thống"). Lỗi chỉ ghi vào trạng thái, không ném ra. */
export async function runScheduledSync(env: Env): Promise<void> {
  await syncCatalog(env, null);
}
