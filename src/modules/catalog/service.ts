// Đồng bộ danh mục từ Google Sheet: MỘT hàm lệnh cho nút «Đồng bộ ngay từ Google Sheet», Cron và đồng bộ lần đầu (ADR-0186 Đ3). Người phát lệnh — người
// bấm, hoặc tác nhân DONG_BO_DANH_MUC do src/modules/catalog/index.ts dựng — qua cùng cổng `can(…, "catalog.sync")` TRƯỚC khi gọi Sheet hay ghi.
import { can, type PermissionHolder } from "../../shared/permissions";
import { SheetError, fetchSheetCsv } from "../../shared/sheets";
import { applySync, claimFirstSync, loadAll, markAttempt, recordFailure } from "./repository";
import { planSync, syncGuard, type CatalogRecord, type SyncPlan } from "./rules";
import { parseCatalogSheet } from "./sheet";

export type SyncResult =
  | { ok: true; added: number; changed: number; hidden: number; unchanged: number; itemCount: number; problems: { row: number; message: string }[]; warnings: { row: number; message: string }[] }
  | { ok: false; code: "forbidden" | "sheet_unreachable" | "sheet_no_access" | "sheet_bad_format" | "sync_guard"; message: string };

/** Câu lý do khi bên phát lệnh không giữ ô `catalog.sync` — hiện ở dòng «lần đồng bộ gần nhất» của màn Danh mục (ADR-0186 Đ6). */
export const CAU_KHONG_DUOC_DONG_BO = "Bên phát lệnh không có quyền đồng bộ danh mục từ Google Sheet. Chưa áp dụng thay đổi nào.";

export async function syncCatalog(env: Env, nguoiPhat: PermissionHolder, opts: { force?: boolean } = {}): Promise<SyncResult> {
  const db = env.DB;
  const at = new Date().toISOString();
  if (!can(nguoiPhat, "catalog.sync")) {
    // ADR-0186 Đ6: bị từ chối thì chỉ ghi lý do vào trạng thái đồng bộ (không gọi Sheet, không chạm danh mục, không ném).
    await recordFailure(db, at, "forbidden", CAU_KHONG_DUOC_DONG_BO);
    return { ok: false, code: "forbidden", message: CAU_KHONG_DUOC_DONG_BO };
  }
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

  await applySync(db, plan, { at, nguoiPhat, itemCount: parsed.items.length, problems: parsed.problems });
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

/**
 * Lần đọc đầu tiên sau khi triển khai: chưa từng đồng bộ lần nào thì đồng bộ ngay, không đợi Cron.
 * Chỉ request giành được quyền mới gọi Sheet; request khác cùng lúc trả danh mục hiện có (có thể rỗng → giao diện cho nhập tay).
 * `tacNhanDongBo`: tác nhân DONG_BO_DANH_MUC (ADR-0186) — việc ghi do máy làm, KHÔNG mang mã người đang mở trang.
 */
export async function bootstrapIfNeverSynced(env: Env, tacNhanDongBo: PermissionHolder): Promise<void> {
  if (await claimFirstSync(env.DB, new Date().toISOString())) await syncCatalog(env, tacNhanDongBo);
}

