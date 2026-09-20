// Sổ đăng ký câu SQL của các module "nghiêm" (ADR-0002 điều 8(b)): mỗi câu SQL của `repository.ts` mới đi qua `defineSql`
// nên bài kiểm kiến trúc (src/architecture.test.ts) lấy được toàn bộ câu lệnh và hỏi CHÍNH SQLite (EXPLAIN) câu đó đọc/ghi bảng nào —
// kiểm ngữ nghĩa, không quét chuỗi. Logic thuần, không import gì. Câu SQL phải TĨNH (tham số tuỳ chọn viết `? IS NULL OR …`).

export interface SqlEntry {
  readonly module: string;
  readonly name: string;
  readonly sql: string;
}

const entries = new Map<string, SqlEntry>();

/** Đăng ký một câu SQL rồi trả lại chính chuỗi đó để dùng với `db.prepare(...)`. Đăng ký lại đúng câu cũ thì bỏ qua; khác nội dung thì lỗi. */
export function defineSql(module: string, name: string, sql: string): string {
  const key = `${module}.${name}`;
  const have = entries.get(key);
  if (have && have.sql !== sql) throw new Error(`Câu SQL "${key}" đã đăng ký với nội dung khác.`);
  entries.set(key, { module, name, sql });
  return sql;
}

export const registeredSql = (): readonly SqlEntry[] => [...entries.values()];
