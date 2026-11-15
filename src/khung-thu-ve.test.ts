// (Tệp phụ trợ cho bài, đặt đuôi .test.ts để ngoài phạm vi tsc của máy chủ — như mọi bài; không chứa bài nào.)
// Khung thử của module ve-dien-tu (CHỈ cho bài *.test.ts): SQLite thật dựng từ migrations/*.sql + một D1 giả ghi lại câu và tham số, rồi chạy lần lượt trên CÙNG
// kết nối như một `db.batch` (`changes()` thấy câu ngay trước). Khoá ngoại tắt: bài ở đây kiểm luật kho vé, không kiểm khoá ngoại sang orders / staff (e2e kiểm).
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
export const AT = "2026-10-31T03:00:00.000Z";

export function taoCsdl(): DatabaseSync {
  const d = new DatabaseSync(":memory:");
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".sql")).sort()) d.exec(readFileSync(new URL(f, DIR), "utf8"));
  d.exec("PRAGMA foreign_keys = OFF");
  return d;
}

export const d1Gia = { prepare: (sql: string) => ({ bind: (...a: unknown[]) => ({ sql, a }) }) } as unknown as D1Database;

/** Chạy một danh sách câu (đã bind) lần lượt, trả `changes()` của từng câu. Một câu lỗi ⇒ ROLLBACK cả lô và ném lại (như `db.batch`). */
export function chayLo(d: DatabaseSync, cau: readonly unknown[]): number[] {
  d.exec("BEGIN");
  try {
    const kq = cau.map((x) => {
      const { sql, a } = x as { sql: string; a: unknown[] };
      return Number(d.prepare(sql).run(...(a as never[])).changes);
    });
    d.exec("COMMIT");
    return kq;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

let n = 0;
export function themLo(d: DatabaseSync, o: { ma?: string; nhom?: "ADULT" | "CHILD" | "SENIOR" | "ALL"; status?: string; nguon?: "HANG_NGOAI" | "TOUR_DAO" } = {}): string {
  const id = `b-${++n}`;
  d.prepare(`INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, source, created_at, updated_at) VALUES (?, ?, ?, 'Vé mẫu', ?, ?, ?, ?)`).run(id, o.ma ?? "V2D", o.nhom ?? "ADULT", o.status ?? "ACTIVE", o.nguon ?? "HANG_NGOAI", AT, AT);
  return id;
}
export function themVe(d: DatabaseSync, lo: string, tu = "2026-10-01", den = "2026-11-30", id = `t-${++n}`): string {
  d.prepare(
    `INSERT INTO vdt_ticket (id, batch_id, ticket_code, valid_from, valid_to, storage_key, content_kind, byte_size, content_hash, status, stored_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'image/jpeg', 1000, ?, 'AVAILABLE', ?, ?, ?)`,
  ).run(id, lo, `TA.SECRET.${id}`, tu, den, `vdt/khoa-bi-mat-${id}`, `bam-${id}`, AT, AT, AT);
  return id;
}
export const dem = (d: DatabaseSync, sql: string, ...a: unknown[]): number => Number((d.prepare(sql).get(...(a as never[])) as { c: number }).c);

/** D1 "thật" tối thiểu trên node:sqlite cho hàm ĐỌC (prepare → bind → all / first). Hàm ghi đi qua d1Gia + chayLo. */
export function d1That(d: DatabaseSync): D1Database {
  return {
    batch: async (cau: { sql: string; a: unknown[] }[]) => chayLo(d, cau).map((changes) => ({ meta: { changes } })),
    prepare: (sql: string) => ({
      bind: (...a: unknown[]) => ({
        sql,
        a,
        all: async () => ({ results: d.prepare(sql).all(...(a as never[])) }),
        first: async () => d.prepare(sql).get(...(a as never[])) ?? null,
        run: async () => ({ meta: { changes: Number(d.prepare(sql).run(...(a as never[])).changes) } }),
      }),
    }),
  } as unknown as D1Database;
}

/** Nhật ký giả: cùng khuôn `INSERT … SELECT … WHERE <onlyIf>` của audit/repository.ts, ghi thẳng bảng audit_log để bài kiểm đọc lại. */
export const nhatKyThu = (db: D1Database) => (e: { staffId: string | null; action: string; at: string; orderId: string; targetType: string; targetId: string; detail: string }, onlyIf: string) =>
  (db as unknown as { prepare(s: string): { bind(...a: unknown[]): unknown } })
    .prepare(`INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at) SELECT lower(hex(randomblob(8))), ?, ?, ?, ?, ?, ?, ? WHERE ${onlyIf}`)
    .bind(e.orderId, e.staffId, e.action, e.targetType, e.targetId, e.detail, e.at) as unknown as D1PreparedStatement;

/** R2 giả tối thiểu: Map khoá → byte; `hong` = tập khoá mà `put` ném lỗi. */
export function r2Gia(hong: Set<string> = new Set()) {
  const kho = new Map<string, Uint8Array>();
  const nhatKy: string[] = [];
  return {
    kho,
    nhatKy,
    put: async (k: string, v: Uint8Array) => {
      nhatKy.push(`put:${k}`);
      if (hong.has(k)) throw new Error("r2 hỏng");
      kho.set(k, v);
    },
    delete: async (k: string) => {
      nhatKy.push(`delete:${k}`);
      kho.delete(k);
    },
  } as unknown as R2Bucket & { kho: Map<string, Uint8Array>; nhatKy: string[] };
}
