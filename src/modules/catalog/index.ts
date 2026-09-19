// Module catalog — danh mục dịch vụ & giá, đồng bộ từ Google Sheet về D1 (spec §2.4-6). Route: /api/catalog*.
// Sheet là nguồn chính; Admin có thể ghi đè giá/ẩn dịch vụ (ghi đè không bị lần đồng bộ sau đè mất). App KHÔNG BAO GIỜ ghi ngược vào Sheet.
import type { AuditAction } from "../audit";
import { requireAdmin, requireStaff } from "../auth";
import { error, json, readJson, type AppModule } from "../../shared/http";
import type { CatalogAdminItemDto, CatalogAdminResponse, CatalogItemResponse, CatalogPublicResponse, CatalogServiceDto, CatalogSyncResponse } from "../../shared/contracts";
import { CATALOG_CODE_RE as CODE_RE, PAX_LABEL, PAX_ORDER, parseUnit, type PaxCode } from "../../shared/order-lines";
import { getSyncState, loadAll, loadOne, saveOverride, type StoredItem } from "./repository";
import { acknowledge, applyOverride, patchOverride, type OverridePatch } from "./rules";
import { bootstrapIfNeverSynced, syncCatalog } from "./service";

const MAX_PRICE = 100_000_000_000;
const money = (n: number | null) => (n === null ? "(không có)" : `${n.toLocaleString("vi-VN")} ₫`);

/** Dịch vụ như nhân viên bán hàng thấy: giá hiệu lực (đã áp ghi đè), không lộ thông tin ghi đè hay Sheet. */
function publicItem(s: StoredItem): CatalogServiceDto {
  return { code: s.code, name: s.name, unit: s.unit, prices: applyOverride(s.prices, s.override).prices, notes: s.notes, supported: parseUnit(s.unit).kind !== "unknown" };
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

export const catalogModule: AppModule = {
  name: "catalog",
  async handle(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["api","catalog", "admin"|"sync"|code, ...]
    if (parts[0] !== "api" || parts[1] !== "catalog") return null;
    const db = env.DB;
    const method = request.method;

    // ---- Nhân viên: danh mục để chọn nhanh trong form tạo đơn ---------------------------
    if (parts.length === 2) {
      if (method !== "GET") return error(405, "method_not_allowed", "Phương thức không được hỗ trợ.");
      const staff = await requireStaff(request, env);
      if (staff instanceof Response) return staff;
      try {
        await bootstrapIfNeverSynced(env);
      } catch {
        /* Sheet lỗi ở lần đầu: vẫn trả danh mục rỗng + cảnh báo bên dưới, cho phép nhập tay */
      }
      const [items, state] = await Promise.all([loadAll(db), getSyncState(db)]);
      const visible = items.filter((s) => s.inSheet && !applyOverride(s.prices, s.override).hidden).map(publicItem);
      return json({ items: visible, sync: { lastSuccessAt: state.lastSuccessAt, error: state.lastError } } satisfies CatalogPublicResponse);
    }

    // Từ đây trở xuống: chỉ Admin.
    const admin = await requireAdmin(request, env);
    if (admin instanceof Response) return admin;

    if (parts.length === 3 && parts[2] === "admin") {
      if (method !== "GET") return error(405, "method_not_allowed", "Phương thức không được hỗ trợ.");
      const [items, state] = await Promise.all([loadAll(db), getSyncState(db)]);
      return json({ items: items.map(adminItem), sync: state } satisfies CatalogAdminResponse);
    }

    if (parts.length === 3 && parts[2] === "sync") {
      if (method !== "POST") return error(405, "method_not_allowed", "Phương thức không được hỗ trợ.");
      const body = await readJson(request);
      const result = await syncCatalog(env, admin.id, { force: body?.force === true });
      if (result.ok) return json(result satisfies CatalogSyncResponse);
      return error(result.code === "sheet_unreachable" ? 502 : result.code === "sync_guard" ? 409 : 424, result.code, result.message);
    }

    const code = parts[2]!;
    if (!CODE_RE.test(code)) return error(404, "not_found", "Không tìm thấy dịch vụ.");
    const item = await loadOne(db, code);
    if (!item) return error(404, "not_found", "Không tìm thấy dịch vụ.");
    const at = new Date().toISOString();

    // PATCH /api/catalog/:code — ghi đè giá / ẩn / hiện
    if (parts.length === 3 && method === "PATCH") {
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
      await saveOverride(db, code, next, admin.id, at, audits);
      return json({ item: adminItem((await loadOne(db, code))!) } satisfies CatalogItemResponse);
    }

    // POST /api/catalog/:code/ack — "Giữ ghi đè": đã xem Sheet đổi giá, xác nhận giữ giá ghi đè
    if (parts.length === 4 && parts[3] === "ack" && method === "POST") {
      if (!item.override) return error(409, "no_override", "Dịch vụ này không có ghi đè.");
      const eff = applyOverride(item.prices, item.override);
      if (eff.conflicts.length === 0) return json({ item: adminItem(item) } satisfies CatalogItemResponse);
      await saveOverride(db, code, acknowledge(item.prices, item.override), admin.id, at, [
        { action: "catalog_overridden", detail: `giữ giá ghi đè sau khi Sheet đổi giá (${eff.conflicts.map((c) => `${PAX_LABEL[c.code].toLowerCase()}: Sheet ${money(c.base)} → ${money(c.current)}`).join("; ")})` },
      ]);
      return json({ item: adminItem((await loadOne(db, code))!) } satisfies CatalogItemResponse);
    }

    // DELETE /api/catalog/:code/override — bỏ toàn bộ ghi đè (giá + ẩn), quay về theo Sheet
    if (parts.length === 4 && parts[3] === "override" && method === "DELETE") {
      if (!item.override) return json({ item: adminItem(item) } satisfies CatalogItemResponse);
      await saveOverride(db, code, null, admin.id, at, [{ action: "catalog_override_cleared", detail: "quay về giá theo Sheet" }]);
      return json({ item: adminItem((await loadOne(db, code))!) } satisfies CatalogItemResponse);
    }

    return error(404, "not_found", "Không tìm thấy.");
  },
};

/** Cron Trigger: đồng bộ Sheet định kỳ, không có người thao tác (nhật ký ghi là "Hệ thống"). Lỗi chỉ ghi vào trạng thái, không ném ra. */
export async function runScheduledSync(env: Env): Promise<void> {
  await syncCatalog(env, null);
}
