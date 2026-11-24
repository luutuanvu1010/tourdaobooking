// Cách dựng NHANH D1 tạm (scripts/d1-tam.mjs: một lệnh `d1 execute --file` gộp mọi migration) phải cho ĐÚNG kết quả của `wrangler d1 migrations apply --local`
// (cách cũ, chậm). Bài dựng bằng cả hai cách trên cùng commit và so: mọi đối tượng schema (câu tạo nguyên văn), mọi dòng dữ liệu do migration chèn (bỏ giờ tạo
// và mã ngẫu nhiên), danh sách `d1_migrations`. Chạy trong mỗi lượt kiểm, nên một migration mà hai cách cho kết quả khác nhau làm npm test đỏ.
// Cần `npx wrangler` (có trong devDependencies), không cần mạng. Chạy 20–60 giây trên Mac (phải dựng cả cách cũ); trần 9 phút, dưới trần mỗi tệp 10 phút.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { DatabaseSync } from "node:sqlite";

const { apMigrationNhanh, sqlGop, tepMigration } = (await import(new URL("../scripts/d1-tam.mjs", import.meta.url).href)) as {
  apMigrationNhanh: (goc: string, persist: string, wrangler: (a: string[]) => Promise<unknown>) => Promise<unknown>;
  sqlGop: (goc: string) => string;
  tepMigration: (goc: string) => string[];
};
const GOC = new URL("..", import.meta.url).pathname;
const chay = promisify(execFile);
const wrangler = (args: string[]) => chay("npx", ["wrangler", ...args], { cwd: GOC, env: { ...process.env, CI: "1" }, maxBuffer: 64 * 1024 * 1024 });

/** Tệp SQLite của D1 cục bộ trong thư mục persist. */
function tepD1(persist: string): string {
  const thu = join(persist, "v3", "d1", "miniflare-D1DatabaseObject");
  const f = readdirSync(thu).find((x) => x.endsWith(".sqlite") && x !== "metadata.sqlite");
  assert.ok(f, `không thấy tệp D1 trong ${thu}`);
  return join(thu, f);
}

/** Bỏ phần đổi theo lần chạy: dấu giờ ISO / SQLite và mã ngẫu nhiên (hex 32, uuid). */
const chuanHoa = (s: string) =>
  s.replace(/\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(\.\d+)?Z?/g, "<GIO>").replace(/\b[0-9a-f]{32}\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, "<ID>");

function anh(persist: string) {
  const db = new DatabaseSync(tepD1(persist), { readOnly: true });
  try {
    const schema = db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY type, name").all();
    const duLieu: Record<string, string[]> = {};
    for (const r of schema) {
      if (r.type !== "table") continue;
      const ten = String(r.name);
      const cot = ten === "d1_migrations" ? "id, name" : "*";
      duLieu[ten] = db.prepare(`SELECT ${cot} FROM "${ten}"`).all().map((x) => chuanHoa(JSON.stringify(x))).sort();
    }
    return { schema, duLieu };
  } finally {
    db.close();
  }
}

test("dựng nhanh (một lệnh d1 execute gộp) cho đúng schema + dữ liệu + d1_migrations như `wrangler d1 migrations apply --local`", { timeout: 540_000 }, async () => {
  const cham = mkdtempSync(join(tmpdir(), "tourdao-d1-cham-"));
  const nhanh = mkdtempSync(join(tmpdir(), "tourdao-d1-nhanh-"));
  try {
    await Promise.all([wrangler(["d1", "migrations", "apply", "tourdao-sales-db", "--local", "--persist-to", cham]), apMigrationNhanh(GOC, nhanh, wrangler)]);
    const a = anh(cham);
    const b = anh(nhanh);
    assert.ok(a.schema.length > 100, `cách cũ dựng quá ít đối tượng (${a.schema.length}) — bài không so gì`);
    assert.deepEqual(b.schema, a.schema, "schema dựng nhanh khác `migrations apply`");
    assert.deepEqual(Object.keys(b.duLieu).sort(), Object.keys(a.duLieu).sort());
    for (const t of Object.keys(a.duLieu)) assert.deepEqual(b.duLieu[t], a.duLieu[t], `dữ liệu bảng ${t} khác nhau giữa hai cách dựng`);
    assert.equal(a.duLieu.d1_migrations.length, tepMigration(GOC).length, "d1_migrations phải có một dòng mỗi tệp migration");
  } finally {
    rmSync(cham, { recursive: true, force: true });
    rmSync(nhanh, { recursive: true, force: true });
  }
});

test("gộp migration: tệp không kết thúc bằng «;» ⇒ ném lỗi (không nối hai câu làm một); thứ tự theo tên tệp", () => {
  const goc = mkdtempSync(join(tmpdir(), "tourdao-d1-gop-"));
  try {
    mkdirSync(join(goc, "migrations"));
    writeFileSync(join(goc, "migrations", "0002_b.sql"), "CREATE TABLE b (x INTEGER); -- chú thích cuối\n");
    writeFileSync(join(goc, "migrations", "0001_a.sql"), "CREATE TABLE a (x INTEGER);");
    const sql = sqlGop(goc);
    assert.ok(sql.indexOf("CREATE TABLE a") < sql.indexOf("CREATE TABLE b"));
    assert.match(sql, /INSERT INTO d1_migrations \(name\) VALUES \('0001_a\.sql'\);\nINSERT INTO d1_migrations \(name\) VALUES \('0002_b\.sql'\);/);
    writeFileSync(join(goc, "migrations", "0003_c.sql"), "CREATE TABLE c (x INTEGER)\n-- thiếu chấm phẩy\n");
    assert.throws(() => sqlGop(goc), /0003_c\.sql không kết thúc bằng «;»/);
  } finally {
    rmSync(goc, { recursive: true, force: true });
  }
});
