// Module catalog — danh mục dịch vụ & giá, đồng bộ từ Google Sheet về D1 (spec §2.4-6). Route: /api/catalog*.
// Sheet là nguồn chính; Admin có thể ghi đè giá/ẩn dịch vụ (ghi đè không bị lần đồng bộ sau đè mất). App KHÔNG BAO GIỜ ghi ngược vào Sheet.
import type { AuditAction } from "../audit";
import { error, json, readJson } from "../../shared/http";
import { route, type AppModule } from "../../shared/router";
import type { CatalogAdminItemDto, CatalogAdminResponse, CatalogItemResponse, CatalogPublicResponse, CatalogServiceDto, CatalogSyncResponse } from "../../shared/contracts";
import { CATALOG_CODE_RE as CODE_RE, MAX_AMOUNT_VND as MAX_PRICE, PAX_LABEL, PAX_ORDER, parseUnit, type EffectiveService, type PaxCode } from "../../shared/order-lines";
import { getSyncState, loadAll, loadOne, saveOverride, type StoredItem } from "./repository";
import { acknowledge, applyOverride, money, patchOverride, toEffective, type OverridePatch } from "./rules";
import { bootstrapIfNeverSynced, syncCatalog } from "./service";

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
function publicItem(e: EffectiveService): CatalogServiceDto {
  return { code: e.code, name: e.name, unit: e.unit, prices: e.prices, notes: e.notes, supported: parseUnit(e.unit).kind !== "unknown" };
}

function adminItem(s: StoredItem): CatalogAdminItemDto {
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
  };
}

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

export const catalogModule: AppModule = {
  name: "catalog",
  routes: [
    // ---- Nhân viên: danh mục để chọn nhanh trong form tạo đơn ---------------------------
    route("GET", "/api/catalog", "office", async ({ env }) => {
      try {
        await bootstrapIfNeverSynced(env);
      } catch {
        /* Sheet lỗi ở lần đầu: vẫn trả danh mục rỗng + cảnh báo bên dưới, cho phép nhập tay */
      }
      const [items, state] = await Promise.all([loadAll(env.DB), getSyncState(env.DB)]);
      const visible = items.map(toEffective).filter((e) => e.visible).map(publicItem);
      return json({ items: visible, sync: { lastSuccessAt: state.lastSuccessAt, error: state.lastError } } satisfies CatalogPublicResponse);
    }),

    // ---- Admin -----------------------------------------------------------------------------
    route("GET", "/api/catalog/admin", "admin", async ({ env }) => {
      const [items, state] = await Promise.all([loadAll(env.DB), getSyncState(env.DB)]);
      return json({ items: items.map(adminItem), sync: state } satisfies CatalogAdminResponse);
    }),

    route("POST", "/api/catalog/sync", "admin", async ({ env, request, staff }) => {
      const body = await readJson(request);
      const result = await syncCatalog(env, staff.id, { force: body?.force === true });
      if (result.ok) return json(result satisfies CatalogSyncResponse);
      return error(result.code === "sheet_unreachable" ? 502 : result.code === "sync_guard" ? 409 : 424, result.code, result.message);
    }),

    // Ghi đè giá / ẩn / hiện
    route("PATCH", "/api/catalog/:code", "admin", async ({ env, request, params, staff }) => {
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
      if (audits.length === 0 && !cleared) return json({ item: adminItem(item) } satisfies CatalogItemResponse); // không đổi gì
      await saveOverride(env.DB, item.code, next, staff.id, new Date().toISOString(), audits);
      return json({ item: adminItem((await loadOne(env.DB, item.code))!) } satisfies CatalogItemResponse);
    }),

    // "Giữ ghi đè": đã xem Sheet đổi giá, xác nhận giữ giá ghi đè
    route("POST", "/api/catalog/:code/ack", "admin", async ({ env, params, staff }) => {
      const item = await loadByParam(env.DB, params.code);
      if (!item) return NOT_FOUND();
      if (!item.override) return error(409, "no_override", "Dịch vụ này không có ghi đè.");
      const eff = applyOverride(item.prices, item.override);
      if (eff.conflicts.length === 0) return json({ item: adminItem(item) } satisfies CatalogItemResponse);
      await saveOverride(env.DB, item.code, acknowledge(item.prices, item.override), staff.id, new Date().toISOString(), [
        { action: "catalog_overridden", detail: `giữ giá ghi đè sau khi Sheet đổi giá (${eff.conflicts.map((c) => `${PAX_LABEL[c.code].toLowerCase()}: Sheet ${money(c.base)} → ${money(c.current)}`).join("; ")})` },
      ]);
      return json({ item: adminItem((await loadOne(env.DB, item.code))!) } satisfies CatalogItemResponse);
    }),

    // Bỏ toàn bộ ghi đè (giá + ẩn), quay về theo Sheet
    route("DELETE", "/api/catalog/:code/override", "admin", async ({ env, params, staff }) => {
      const item = await loadByParam(env.DB, params.code);
      if (!item) return NOT_FOUND();
      if (!item.override) return json({ item: adminItem(item) } satisfies CatalogItemResponse);
      await saveOverride(env.DB, item.code, null, staff.id, new Date().toISOString(), [{ action: "catalog_override_cleared", detail: "quay về giá theo Sheet" }]);
      return json({ item: adminItem((await loadOne(env.DB, item.code))!) } satisfies CatalogItemResponse);
    }),
  ],
};

/** Cron Trigger: đồng bộ Sheet định kỳ, không có người thao tác (nhật ký ghi là "Hệ thống"). Lỗi chỉ ghi vào trạng thái, không ném ra. */
export async function runScheduledSync(env: Env): Promise<void> {
  await syncCatalog(env, null);
}
