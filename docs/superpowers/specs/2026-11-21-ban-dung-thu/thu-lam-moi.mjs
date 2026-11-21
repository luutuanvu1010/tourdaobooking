// Bước 0 Việc 1 (hồ sơ 21/11): thử "xoá hết – nạp lại bản mẫu" bằng đúng API D1 mà Worker dùng (db.batch), D1 chạy ở máy qua wrangler.
// Cách chạy (đặt bản sao tệp này ở gốc kho để `wrangler` tìm thấy; sửa configPath thành đường dẫn tuyệt đối tới wr-thu.jsonc):
//   1. CI=1 npx wrangler d1 migrations apply DB --local --persist-to <thư mục A>
//   2. node <bản sao> <tệp .sqlite trong A/v3/d1/miniflare-D1DatabaseObject/> <thư mục B trống> [--gia] [--tung-dong]
//   --gia       thêm cặp bảng cha–con giả (3.000 + 5.000 dòng, khoá ngoại, trigger cấm xoá) vào BẢN SAO của nguồn
//   --tung-dong mỗi dòng dữ liệu một câu INSERT (mặc định: gộp nhiều dòng, mỗi câu ≤ 60 KB)
import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getPlatformProxy } from "wrangler";

const [nguonGoc, persist] = process.argv.slice(2);
const coGia = process.argv.includes("--gia");
const tungDong = process.argv.includes("--tung-dong");

let nguon = nguonGoc;
if (coGia) {
  nguon = join(mkdtempSync(join(tmpdir(), "thu-lam-moi-")), "nguon.sqlite");
  copyFileSync(nguonGoc, nguon);
  const w = new DatabaseSync(nguon);
  w.exec(`
    CREATE TABLE thu_cha(id INTEGER PRIMARY KEY, ten TEXT NOT NULL, ghi_chu TEXT);
    CREATE TABLE thu_con(id INTEGER PRIMARY KEY, cha_id INTEGER NOT NULL REFERENCES thu_cha(id), so_tien INTEGER NOT NULL, mo_ta TEXT);
    WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<3000) INSERT INTO thu_cha SELECT i, 'Đối tác giả số '||i, 'Ghi chú mẫu dài vừa phải cho dòng '||i FROM n;
    WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<5000) INSERT INTO thu_con SELECT i, 1+(i%3000), i*1000, 'Hoa hồng giả dòng '||i FROM n;
    CREATE TRIGGER thu_cha_cam_xoa BEFORE DELETE ON thu_cha BEGIN SELECT RAISE(ABORT,'cam xoa cha'); END;
    CREATE TRIGGER thu_con_cam_xoa BEFORE DELETE ON thu_con BEGIN SELECT RAISE(ABORT,'cam xoa con'); END;`);
  w.close();
}

const src = new DatabaseSync(nguon, { readOnly: true });
const boQua = (n) => n.startsWith("sqlite_") || n.startsWith("_cf_");
const obj = src.prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL").all().filter((r) => !boQua(r.name));
const q = (n) => `"${n.replaceAll('"', '""')}"`;
const lit = (v) => (v === null ? "NULL" : typeof v === "number" || typeof v === "bigint" ? String(v) : `'${String(v).replaceAll("'", "''")}'`);

// Bản mẫu: bảng → dữ liệu → chỉ mục → view → trigger (trigger sau cùng để luật vòng đời không chặn gieo).
const mau = [];
const bangs = obj.filter((r) => r.type === "table");
for (const t of bangs) mau.push(t.sql);
let soDong = 0;
for (const t of bangs) {
  let dau = null, gom = [], dai = 0;
  const day = () => { if (gom.length) mau.push(dau + gom.join(",")); gom = []; dai = 0; };
  for (const row of src.prepare(`SELECT * FROM ${q(t.name)}`).all()) {
    const cols = Object.keys(row);
    dau ??= `INSERT INTO ${q(t.name)} (${cols.map(q).join(",")}) VALUES `;
    const v = `(${cols.map((c) => lit(row[c])).join(",")})`;
    // trần D1: 100 KB MỘT câu, tính theo byte (chữ có dấu nhiều byte)
    if (tungDong || dai + Buffer.byteLength(v) > 60_000) day();
    gom.push(v); dai += Buffer.byteLength(v); soDong++;
  }
  day();
}
for (const k of ["index", "view", "trigger"]) for (const t of obj.filter((r) => r.type === k)) mau.push(t.sql);
const kb = Math.round(Buffer.byteLength(mau.join(";\n")) / 1024);
console.log(`bản mẫu: ${obj.length} đối tượng có sql, ${mau.length} câu, ${soDong} dòng dữ liệu, ${kb} KB, câu dài nhất ${Math.max(...mau.map((s) => Buffer.byteLength(s)))} byte`);

const mf = await getPlatformProxy({ configPath: "./wr-thu.jsonc", persist: { path: persist } });
const db = mf.env.DB;

async function lamMoi() {
  const t0 = Date.now();
  const hien = (await db.prepare("SELECT type, name FROM sqlite_master").all()).results.filter((r) => !boQua(r.name));
  const xoa = [
    "PRAGMA defer_foreign_keys = ON",
    ...hien.filter((r) => r.type === "view").map((r) => `DROP VIEW IF EXISTS ${q(r.name)}`),
    ...hien.filter((r) => r.type === "table").map((r) => `DROP TABLE IF EXISTS ${q(r.name)}`),
  ];
  // MỘT lô = một giao dịch: hỏng giữa chừng thì quay về trạng thái trước.
  await db.batch([...xoa, ...mau].map((s) => db.prepare(s)));
  return Date.now() - t0;
}

console.log(`lần 1 (D1 trống): ${await lamMoi()} ms`);
await db.prepare("CREATE TABLE IF NOT EXISTS thu_dau (x)").run();
await db.prepare("INSERT INTO thu_dau VALUES ('dữ liệu người thử')").run();
if (coGia) {
  let chan = "không chặn";
  try { await db.prepare("DELETE FROM thu_con").run(); } catch { chan = "bị chặn (đúng)"; }
  await db.prepare("INSERT INTO thu_con VALUES (999999, 1, 5, 'dòng người thử thêm')").run();
  console.log(`DELETE trên thu_con (5.000 dòng, có trigger cấm xoá): ${chan}`);
}
console.log(`lần 2 (sau khi có dữ liệu thử): ${await lamMoi()} ms`);
if (coGia) {
  const sau = await db.prepare("SELECT (SELECT count(*) FROM thu_cha) a, (SELECT count(*) FROM thu_con) b, (SELECT count(*) FROM thu_con WHERE id=999999) c").first();
  console.log(`sau làm mới: cha=${sau.a} con=${sau.b} dòng người thử còn=${sau.c}`);
}
const conDau = await db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='thu_dau'").first();
const mig = await db.prepare("SELECT count(*) n FROM d1_migrations").first();
const dem = await db.prepare("SELECT type, count(*) n FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' GROUP BY type").all();
console.log(`sau làm mới: bảng lạ còn=${conDau.n}, d1_migrations=${mig.n}, đối tượng có sql=${JSON.stringify(dem.results)}`);
await db.prepare("CREATE TABLE thu_dau2 (x)").run();
try { await db.batch([db.prepare("DROP TABLE thu_dau2"), db.prepare("SELECT * FROM bang_khong_co")]); } catch {}
const con2 = await db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='thu_dau2'").first();
console.log(`lô hỏng giữa chừng: bảng còn nguyên=${con2.n === 1}`);
await mf.dispose();
