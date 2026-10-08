// ky-so/repository.ts — SQL của module ky-so (ADR-0080 D1). Câu TĨNH, defineSql.
import { defineSql } from "../../shared/sql-registry.ts";
const DA_KHOA = defineSql("ky-so", "closed_periods", "SELECT period FROM ky_period_close ORDER BY period");
const KHOA = defineSql("ky-so", "close_period",
  "INSERT INTO ky_period_close (period, closed_at, closed_by, note, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?2, ?3, ?2, ?3)");
export const closedPeriods = async (db: D1Database): Promise<string[]> => (await db.prepare(DA_KHOA).all<{ period: string }>()).results.map((r) => r.period);
export const closePeriodStatement = (db: D1Database, v: { period: string; at: string; by: string; note: string | null }) => db.prepare(KHOA).bind(v.period, v.at, v.by, v.note);
