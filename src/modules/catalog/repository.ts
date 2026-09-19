import { auditStatement, type AuditAction } from "../audit";
import type { CatalogSyncStateDto } from "../../shared/contracts";
import type { PaxCode, Prices } from "../../shared/order-lines";
import type { CatalogRecord, Override, SyncPlan } from "./rules";
import { summarizePlan } from "./rules";
import type { CatalogInput } from "./sheet";

interface Row {
  code: string; name: string; unit: string;
  price_adult: number; price_child: number | null; price_senior: number | null; price_infant: number | null;
  note_child: string | null; note_senior: string | null; note_infant: string | null;
  sheet_row: number | null; in_sheet: number; first_seen_at: string; updated_at: string;
  ov_hidden: number | null; ov_prices: string | null; ov_base: string | null; ov_by: string | null; ov_at: string | null;
}

export interface StoredItem extends CatalogRecord {
  override: Override | null;
  overrideUpdatedAt: string | null;
  updatedAt: string;
}

function parseJsonMap(text: string | null): Record<string, number | null> {
  if (!text) return {};
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function toStored(r: Row): StoredItem {
  const prices: Prices = { adult: r.price_adult, child: r.price_child, senior: r.price_senior, infant: r.price_infant };
  const hasOverride = r.ov_hidden !== null;
  return {
    code: r.code,
    name: r.name,
    unit: r.unit,
    prices,
    notes: { child: r.note_child, senior: r.note_senior, infant: r.note_infant },
    inSheet: r.in_sheet === 1,
    updatedAt: r.updated_at,
    overrideUpdatedAt: r.ov_at,
    override: hasOverride
      ? { hidden: r.ov_hidden === 1, prices: parseJsonMap(r.ov_prices) as Override["prices"], base: parseJsonMap(r.ov_base) as Override["base"] }
      : null,
  };
}

const SELECT = `SELECT i.*, o.hidden AS ov_hidden, o.prices_json AS ov_prices, o.base_json AS ov_base, o.updated_by AS ov_by, o.updated_at AS ov_at
                FROM catalog_item i LEFT JOIN catalog_override o ON o.code = i.code`;

export async function loadAll(db: D1Database): Promise<StoredItem[]> {
  const { results } = await db.prepare(`${SELECT} ORDER BY i.code`).all<Row>();
  return results.map(toStored);
}

export async function loadOne(db: D1Database, code: string): Promise<StoredItem | null> {
  const row = await db.prepare(`${SELECT} WHERE i.code = ?`).bind(code).first<Row>();
  return row ? toStored(row) : null;
}

export type SyncState = CatalogSyncStateDto;

export async function getSyncState(db: D1Database): Promise<SyncState> {
  const r = await db
    .prepare("SELECT last_attempt_at, last_success_at, last_error_code, last_error, item_count, problems_json FROM catalog_sync WHERE id = 'default'")
    .first<{ last_attempt_at: string | null; last_success_at: string | null; last_error_code: string | null; last_error: string | null; item_count: number | null; problems_json: string | null }>();
  let problems: SyncState["problems"] = [];
  try {
    problems = r?.problems_json ? JSON.parse(r.problems_json) : [];
  } catch {
    /* bỏ qua JSON hỏng */
  }
  return {
    lastAttemptAt: r?.last_attempt_at ?? null,
    lastSuccessAt: r?.last_success_at ?? null,
    lastErrorCode: r?.last_error_code ?? null,
    lastError: r?.last_error ?? null,
    itemCount: r?.item_count ?? null,
    problems,
  };
}

/** Đánh dấu bắt đầu một lần đồng bộ (để lần đọc đầu tiên không đồng bộ trùng). */
export async function markAttempt(db: D1Database, at: string): Promise<void> {
  await db.prepare("UPDATE catalog_sync SET last_attempt_at = ? WHERE id = 'default'").bind(at).run();
}

export async function recordFailure(db: D1Database, at: string, code: string, message: string): Promise<void> {
  await db
    .prepare("UPDATE catalog_sync SET last_attempt_at = ?, last_error_code = ?, last_error = ? WHERE id = 'default'")
    .bind(at, code, message.slice(0, 500))
    .run();
}

const CHUNK = 40;

/**
 * Áp kế hoạch đồng bộ. Chỉ chạm phần lấy từ Sheet (catalog_item); KHÔNG bao giờ đụng catalog_override — đó là điều bảo đảm
 * "đồng bộ lại không đè ghi đè của Admin". Dịch vụ biến mất chỉ bị đánh dấu in_sheet = 0, không xoá.
 */
export async function applySync(
  db: D1Database,
  plan: SyncPlan,
  meta: { at: string; actorId: string | null; itemCount: number; problems: { row: number; message: string }[] },
): Promise<void> {
  const stmts: D1PreparedStatement[] = [];
  const upsert = (i: CatalogInput) =>
    db
      .prepare(
        `INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, note_child, note_senior, note_infant, sheet_row, in_sheet, first_seen_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(code) DO UPDATE SET name = excluded.name, unit = excluded.unit, price_adult = excluded.price_adult, price_child = excluded.price_child,
           price_senior = excluded.price_senior, price_infant = excluded.price_infant, note_child = excluded.note_child, note_senior = excluded.note_senior,
           note_infant = excluded.note_infant, sheet_row = excluded.sheet_row, in_sheet = 1, updated_at = excluded.updated_at`,
      )
      .bind(i.code, i.name, i.unit, i.prices.adult, i.prices.child, i.prices.senior, i.prices.infant, i.notes.child, i.notes.senior, i.notes.infant, i.row, meta.at, meta.at);
  for (const i of plan.added) stmts.push(upsert(i));
  for (const c of plan.changed) stmts.push(upsert(c.input));
  for (const code of plan.missing) stmts.push(db.prepare("UPDATE catalog_item SET in_sheet = 0, updated_at = ? WHERE code = ?").bind(meta.at, code));

  for (let i = 0; i < stmts.length; i += CHUNK) await db.batch(stmts.slice(i, i + CHUNK));

  const changed = plan.added.length + plan.changed.length + plan.missing.length;
  await db.batch([
    db
      .prepare(
        "UPDATE catalog_sync SET last_attempt_at = ?, last_success_at = ?, last_error_code = NULL, last_error = NULL, item_count = ?, problems_json = ? WHERE id = 'default'",
      )
      .bind(meta.at, meta.at, meta.itemCount, JSON.stringify(meta.problems.slice(0, 50))),
    ...(changed > 0
      ? [auditStatement(db, { staffId: meta.actorId, action: "catalog_synced", at: meta.at, targetType: "catalog", detail: summarizePlan(plan) })]
      : []),
  ]);
}

/** Lưu (hoặc xoá) ghi đè của một dịch vụ, kèm các dòng nhật ký, trong một transaction. */
export async function saveOverride(
  db: D1Database,
  code: string,
  ov: Override | null,
  staffId: string,
  at: string,
  audits: { action: AuditAction; detail?: string }[],
): Promise<void> {
  const write = ov
    ? db
        .prepare(
          `INSERT INTO catalog_override (code, hidden, prices_json, base_json, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(code) DO UPDATE SET hidden = excluded.hidden, prices_json = excluded.prices_json, base_json = excluded.base_json,
             updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
        )
        .bind(code, ov.hidden ? 1 : 0, JSON.stringify(ov.prices), JSON.stringify(ov.base), staffId, at)
    : db.prepare("DELETE FROM catalog_override WHERE code = ?").bind(code);
  await db.batch([write, ...audits.map((a) => auditStatement(db, { staffId, action: a.action, at, targetType: "catalog", targetId: code, detail: a.detail }))]);
}

export const PRICE_COLUMNS: Record<PaxCode, string> = { adult: "price_adult", child: "price_child", senior: "price_senior", infant: "price_infant" };
