// Đồng bộ danh mục từ Google Sheet: dùng chung cho Cron (không có người thao tác) và nút "Đồng bộ ngay" của Admin.
import { SheetError, fetchSheetCsv } from "../../shared/sheets";
import { applySync, getSyncState, loadAll, markAttempt, recordFailure } from "./repository";
import { planSync, syncGuard, type CatalogRecord, type SyncPlan } from "./rules";
import { parseCatalogSheet } from "./sheet";

export type SyncResult =
  | { ok: true; added: number; changed: number; hidden: number; unchanged: number; itemCount: number; problems: { row: number; message: string }[]; warnings: { row: number; message: string }[] }
  | { ok: false; code: "sheet_unreachable" | "sheet_no_access" | "sheet_bad_format" | "sync_guard"; message: string };

export async function syncCatalog(env: Env, actorId: string | null, opts: { force?: boolean } = {}): Promise<SyncResult> {
  const db = env.DB;
  const at = new Date().toISOString();
  await markAttempt(db, at);

  let csv: string;
  try {
    csv = await fetchSheetCsv(env.SERVICES_SHEET_ID);
  } catch (e) {
    if (!(e instanceof SheetError)) throw e;
    await recordFailure(db, at, e.code, e.message);
    return { ok: false, code: e.code, message: e.message };
  }
  const parsed = parseCatalogSheet(csv);
  if (!parsed.ok) {
    const message = `Sheet thiếu cột bắt buộc: ${parsed.missing.join(", ")}.`;
    await recordFailure(db, at, "sheet_bad_format", message);
    return { ok: false, code: "sheet_bad_format", message };
  }

  const stored = await loadAll(db);
  const existing = new Map<string, CatalogRecord>(stored.map((s) => [s.code, s]));
  const plan: SyncPlan = planSync(existing, parsed.items);
  const guard = opts.force ? null : syncGuard(stored.filter((s) => s.inSheet).length, plan, parsed.items.length);
  if (guard) {
    await recordFailure(db, at, "sync_guard", `${guard} Chưa áp dụng thay đổi nào.`);
    return { ok: false, code: "sync_guard", message: guard };
  }

  await applySync(db, plan, { at, actorId, itemCount: parsed.items.length, problems: parsed.problems });
  return {
    ok: true,
    added: plan.added.length,
    changed: plan.changed.length,
    hidden: plan.missing.length,
    unchanged: plan.unchanged,
    itemCount: parsed.items.length,
    problems: parsed.problems,
    warnings: parsed.warnings,
  };
}

/** Lần đọc đầu tiên sau khi triển khai: chưa từng đồng bộ lần nào thì đồng bộ ngay, không đợi Cron. */
export async function bootstrapIfNeverSynced(env: Env): Promise<void> {
  const state = await getSyncState(env.DB);
  if (state.lastAttemptAt === null) await syncCatalog(env, null);
}

