// ky-so/index.ts — Module ky-so: tháng đã khoá sổ (ADR-0080 phần D1). Không route (route ở billing). Phụ thuộc: audit.
import { auditStatement } from "../audit";
import { closedPeriods, closePeriodStatement } from "./repository";
import { cauKyKhoa, kyCua, nhanThang } from "./rules";
export { cauKyKhoa, docGhiChuKy, kiemKhoaKy, kyCua, kyDaKhoaTu, ngayCuoiThang, thangKeTiep, thangKhoaDuocKeTiep } from "./rules";

export const thangDaKhoa = (db: D1Database): Promise<string[]> => closedPeriods(db);
/** Câu khoá tháng + nhật ký, gửi trong MỘT lô. Nhật ký chỉ ghi khi câu chèn thắng. */
export function khoaKyStatements(db: D1Database, v: { period: string; note: string | null; at: string; by: string }): D1PreparedStatement[] {
  return [closePeriodStatement(db, v), auditStatement(db, { staffId: v.by, action: "ledger_period_closed", at: v.at, detail: `Khoá sổ tháng ${nhanThang(v.period)}` }, "changes() > 0")];
}
/** Lỗi trigger `period_closed:` (tháng bị khoá giữa lúc kiểm và lúc ghi) ⇒ đúng câu `cauKyKhoa` của tháng vừa khoá; lỗi khác ⇒ null. */
export async function cauTriggerKhoa(db: D1Database, e: unknown, ngays: readonly string[]): Promise<string | null> {
  if (!/\bperiod_closed:/.test(e instanceof Error ? e.message : String(e))) return null;
  const daKhoa = new Set(await closedPeriods(db));
  const thang = ngays.map(kyCua).find((k) => daKhoa.has(k)) ?? (ngays[0] ? kyCua(ngays[0]) : [...daKhoa].sort().at(-1)!);
  return cauKyKhoa(thang);
}
