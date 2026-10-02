// LỚP CHỐNG GHI TRÙNG (ADR-0094 đ3) — BỘ BỌC CƠ SỞ DỮ LIỆU THEO TỪNG YÊU CẦU (đặc tả §3.5). Router dựng `{ ...env, DB: bocDb(env.DB, …).db }` cho handler của
// một lệnh ghi có vé: câu chèn vé được nối vào CUỐI lô ghi đầu tiên THÀNH CÔNG của lệnh ⇒ có dòng vé ⇔ lô ghi của lệnh đã thành công. Chỉ phụ thuộc kiểu
// D1 (không import module — router ở src/shared/ không được import module; câu vé do module `lan-gui` cấp qua `cauVe`).
//
// Bảy bẫy (đặc tả §3.5), mỗi bẫy một bài ở lan-gui-boc.test.ts:
//  1. `prepare/bind` trả câu bọc nhớ chữ SQL; `batch` GỠ BỌC trước khi gọi D1 thật. Câu lạ (không do bộ bọc tạo) đi nguyên và lô có nó coi là lô GHI.
//  2. Vé nối CUỐI lô; kết quả của câu vé bị cắt khỏi mảng trả về (chỉ số `kq[i]` của nơi gọi không lệch).
//  3. `.run()` lẻ và `INSERT … RETURNING` qua `.first()`/`.all()`/`.raw()` khi còn phải mang vé ⇒ đi qua `batch([câu, vé])`, trả lại đúng hình. Câu đọc chạy thẳng.
//  4. Chỉ lô ghi đầu tiên THÀNH CÔNG mang vé (lô hỏng không ghi gì nên lô kế tiếp lại mang vé — vd `createOrder` thử lại khi trùng mã đơn); đếm số lần ghi.
//  5. Lô đụng khoá chính `lg_lan_gui` ⇒ cờ `dungVe`, ném lại ĐÚNG lỗi gốc của D1 (handler có `catch` nuốt `UNIQUE` thật sự bị thử), và TỪ CHỐI mọi lệnh
//     ghi tiếp theo trong yêu cầu (không ghi nửa vời). Router không tin phản hồi của handler khi cờ bật.
//  6. (router) hàm tiêm có câu vào chính lô của handler nhận env đã bọc; việc bắn-và-quên giữ env gốc.
//  7. (ranh giới) câu vé lấy từ `lan-gui` qua phần tiêm, không import.
// Sau khi router xong việc với yêu cầu (`dong()`), lệnh ghi trễ (handler tự bọc waitUntil) đi thẳng D1 gốc — không mang vé, không bị từ chối.

/** Câu đọc (chạy thẳng, không mang vé): SELECT / PRAGMA / EXPLAIN, hoặc WITH … mà không có từ khoá ghi. Bỏ chú thích đầu câu. */
export function laCauDoc(sql: string): boolean {
  const s = sql.replace(/^(?:\s+|--[^\n]*\n|\/\*[\s\S]*?\*\/)*/, "");
  if (/^(SELECT|PRAGMA|EXPLAIN)\b/i.test(s)) return true;
  return /^WITH\b/i.test(s) && !/\b(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(s);
}

/** Lỗi D1 khi lô đụng khoá chính của bảng vé (SQLite: `UNIQUE constraint failed: lg_lan_gui.staff_id, lg_lan_gui.khoa`; D1 bọc thêm tiền tố/hậu tố). */
export const laLoiDungVe = (e: unknown): boolean => /UNIQUE constraint failed: lg_lan_gui\./.test(e instanceof Error ? e.message : String(e));

/** Câu báo khi bộ bọc từ chối lệnh ghi sau khi đã đụng vé (mã máy ở đầu để log/khung bắt lỗi nhận ra). */
export const LOI_TU_CHOI_SAU_DUNG_VE = "lan_gui_tu_choi: lệnh ghi sau khi đụng vé bị từ chối";

const GOC = Symbol("lan-gui-goc");
const DB_GOC = Symbol("lan-gui-db-goc");

/**
 * GHI NGOÀI VÉ (ADR-0094 đặc tả §3.5 bẫy 4; kế hoạch L12/T17): tay cầm D1 GỐC cho một câu ghi PHỤ đứng TRƯỚC lô chính của lệnh (vd dòng đếm "thân kiểu
 * cũ" `demThanCu`) — câu đó không mang vé, không bị đếm, nên không "ăn" vé của lô chính (lô chính hỏng mà vé đã ghi ⇒ gửi lại bị báo nhầm "đã ghi").
 * CHỈ nơi có tên trong `NGOAI_VE` (src/shared/lan-gui-no.ts) được gọi — bài src/lan-gui-no.test.ts ép. `db` không bọc ⇒ trả nguyên.
 */
export const dbNgoaiVe = (db: D1Database): D1Database => (db as unknown as { [DB_GOC]?: D1Database })[DB_GOC] ?? db;
interface CauBoc {
  readonly [GOC]: D1PreparedStatement;
  readonly sql: string;
}
const laCauBoc = (s: unknown): s is CauBoc => typeof s === "object" && s !== null && GOC in s;

export interface BoBoc {
  /** Tay cầm giống D1 đưa cho handler. */
  db: D1Database;
  /** Đã ghi được vé (lô mang vé đã thành công). */
  daGhiVe: () => boolean;
  /** Lô đã đụng khoá vé (một lần gửi đồng thời cùng vé đã thắng). */
  dungVe: () => boolean;
  /** Số lần ghi (lô ghi hoặc câu ghi lẻ) của yêu cầu — H5. */
  soLanGhi: () => number;
  /** Router xong việc: lệnh ghi trễ đi thẳng D1 gốc. */
  dong: () => void;
}

/** `cauVe(dbGoc)` dựng câu chèn vé (CHƯA chạy) trên D1 GỐC — gọi lại mỗi lần cần (mỗi lô mang vé một câu mới). */
export function bocDb(goc: D1Database, cauVe: (dbGoc: D1Database) => D1PreparedStatement): BoBoc {
  let daGhiVe = false;
  let dungVe = false;
  let soLanGhi = 0;
  let daDong = false;

  const goBoc = (s: unknown): D1PreparedStatement => (laCauBoc(s) ? s[GOC] : (s as D1PreparedStatement));
  const laDoc = (s: unknown): boolean => laCauBoc(s) && laCauDoc(s.sql);

  /** Chạy một lô GHI (câu đã gỡ bọc). Trả kết quả của đúng các câu nơi gọi gửi. */
  async function ghiLo(cau: D1PreparedStatement[]): Promise<D1Result[]> {
    if (daDong) return goc.batch(cau);
    if (dungVe) throw new Error(LOI_TU_CHOI_SAU_DUNG_VE);
    soLanGhi++;
    if (daGhiVe) return goc.batch(cau);
    try {
      const kq = await goc.batch([...cau, cauVe(goc)]);
      daGhiVe = true;
      return kq.slice(0, cau.length);
    } catch (e) {
      if (laLoiDungVe(e)) {
        dungVe = true;
        console.warn(JSON.stringify({ event: "lan_gui_dung_ve" })); // không dữ liệu — để đếm/kiểm trên D1 thật rằng chữ lỗi được nhận ra
      } else if (/lg_lan_gui/.test(e instanceof Error ? e.message : String(e))) {
        console.error(JSON.stringify({ level: "error", event: "lan_gui_loi_la" })); // lỗi chạm bảng vé mà không khớp mẫu đụng vé — cần xem lại laLoiDungVe
      }
      throw e;
    }
  }
  /** Câu ghi lẻ: còn phải mang vé ⇒ đi qua lô [câu, vé]; không thì chạy thẳng (giữ đúng hình kết quả của D1). */
  async function ghiLe<T>(cau: D1PreparedStatement, chayThang: () => Promise<T>, tuKetQua: (r: D1Result) => T): Promise<T> {
    if (daDong) return chayThang();
    if (dungVe) throw new Error(LOI_TU_CHOI_SAU_DUNG_VE);
    if (daGhiVe) {
      soLanGhi++;
      return chayThang();
    }
    return tuKetQua((await ghiLo([cau]))[0]!);
  }

  function boc(raw: D1PreparedStatement, sql: string): D1PreparedStatement {
    const doc = laCauDoc(sql);
    const cau = {
      [GOC]: raw,
      sql,
      bind: (...args: unknown[]) => boc(raw.bind(...args), sql),
      first: (col?: string) =>
        doc ? raw.first(col as string) : ghiLe(raw, () => raw.first(col as string), (r) => {
          const row = (r.results?.[0] ?? null) as Record<string, unknown> | null;
          return row === null ? null : col ? (row[col] ?? null) : row;
        }),
      all: () => (doc ? raw.all() : ghiLe(raw, () => raw.all(), (r) => r)),
      raw: (opts?: { columnNames?: boolean }) =>
        doc ? raw.raw(opts as never) : ghiLe(raw, () => raw.raw(opts as never), (r) => (r.results ?? []).map((row) => Object.values(row as object))),
      run: () => (doc ? raw.run() : ghiLe(raw, () => raw.run(), (r) => r)),
    };
    return cau as unknown as D1PreparedStatement;
  }

  const db = {
    [DB_GOC]: goc,
    prepare: (sql: string) => boc(goc.prepare(sql), sql),
    batch: async (stmts: D1PreparedStatement[]) => {
      const cau = stmts.map(goBoc);
      if (stmts.every(laDoc)) return goc.batch(cau);
      return ghiLo(cau);
    },
    exec: (sql: string) => {
      // Không mã nào của handler dùng exec; nếu có: đi thẳng, đếm là một lần ghi (không gắn được vé vào câu thô).
      if (!daDong) soLanGhi++;
      return goc.exec(sql);
    },
    dump: () => goc.dump(),
    withSession: (...a: unknown[]) => (goc as unknown as { withSession: (...x: unknown[]) => unknown }).withSession(...a),
  };
  return {
    db: db as unknown as D1Database,
    daGhiVe: () => daGhiVe,
    dungVe: () => dungVe,
    soLanGhi: () => soLanGhi,
    dong: () => {
      daDong = true;
    },
  };
}
