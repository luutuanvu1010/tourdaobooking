// Bước 0 Việc 1: thử "xoá hết – nạp lại bản mẫu" bằng đúng API D1 mà Worker dùng (db.batch), trên miniflare ở máy.
// node thu-lam-moi.mjs <tệp sqlite nguồn đã áp migration> <thư mục persist miniflare cho D1 thử>
import { DatabaseSync } from "node:sqlite";
import { getPlatformProxy } from "wrangler";

const [nguon, persist] = process.argv.slice(2);
const src = new DatabaseSync(nguon, { readOnly: true });
const boQua = (n) => n.startsWith("sqlite_") || n.startsWith("_cf_");
const obj = src.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL").all().filter((r) => !boQua(r.name));
const q = (n) => `"${n.replaceAll('"', '""')}"`;
const lit = (v) => (v === null ? "NULL" : typeof v === "number" || typeof v === "bigint" ? String(v) : `'${String(v).replaceAll("'", "''")}'`);

// Bản mẫu: bảng → dữ liệu → chỉ mục → view → trigger (trigger sau cùng để luật vòng đời không chặn gieo).
const mau = [];
for (const t of obj.filter((r) => r.type === "table")) mau.push(t.sql);
let soDong = 0;
for (const t of obj.filter((r) => r.type === "table")) {
  // gộp nhiều dòng vào một câu, mỗi câu ≤ 90 KB (trần D1: 100 KB một câu)
  let dau = null, gom = [], dai = 0;
  const day = () => { if (gom.length) mau.push(dau + gom.join(",")); gom = []; dai = 0; };
  for (const row of src.prepare(`SELECT * FROM ${q(t.name)}`).all()) {
    const cols = Object.keys(row);
    dau ??= `INSERT INTO ${q(t.name)} (${cols.map(q).join(",")}) VALUES `;
    const v = `(${cols.map((c) => lit(row[c])).join(",")})`;
    if (dai + Buffer.byteLength(v) > 60_000) day();
    gom.push(v); dai += Buffer.byteLength(v); soDong++;
  }
  day();
}
for (const k of ["index", "view", "trigger"]) for (const t of obj.filter((r) => r.type === k)) mau.push(t.sql);
const kb = Math.round(mau.join(";\n").length / 1024);
console.log(`bản mẫu: ${mau.length} câu, ${soDong} dòng dữ liệu, ${kb} KB, câu dài nhất ${Math.max(...mau.map((s) => s.length))} byte`);

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
  // MỘT lô = một giao dịch: hỏng giữa chừng thì quay về trạng thái trước, không nửa chừng.
  await db.batch([...xoa, ...mau].map((s) => db.prepare(s)));
  return Date.now() - t0;
}

console.log(`lần 1 (D1 trống): ${await lamMoi()} ms`);
// giả lập người dùng thử ghi một dòng vào bảng có trigger cấm xoá
const bangCam = (await db.prepare("SELECT tbl_name FROM sqlite_master WHERE type='trigger' AND sql LIKE '%BEFORE DELETE%' AND sql LIKE '%RAISE%' LIMIT 1").first()).tbl_name;
await db.prepare(`CREATE TABLE IF NOT EXISTS thu_dau (x)`).run();
await db.prepare(`INSERT INTO thu_dau VALUES ('dữ liệu người thử')`).run();
let chan = "không chặn";
try { await db.prepare(`DELETE FROM ${q(bangCam)}`).run(); } catch (e) { chan = "bị chặn (đúng)"; }
console.log(`DELETE thường trên bảng ${bangCam}: ${chan}`);
let c2="không chặn"; try { await db.prepare("DELETE FROM thu_con").run(); } catch { c2="bị chặn (đúng)"; }
const truoc = await db.prepare("SELECT (SELECT count(*) FROM thu_cha) a, (SELECT count(*) FROM thu_con) b").first();
await db.prepare("INSERT INTO thu_con VALUES (999999, 1, 5, 'dòng người thử thêm')").run();
console.log(`DELETE trên thu_con (có dữ liệu, có trigger): ${c2}; trước làm mới cha=${truoc.a} con=${truoc.b}+1`);
console.log(`lần 2 (sau khi có dữ liệu thử): ${await lamMoi()} ms`);
const sau = await db.prepare("SELECT (SELECT count(*) FROM thu_cha) a, (SELECT count(*) FROM thu_con) b, (SELECT count(*) FROM thu_con WHERE id=999999) c").first();
console.log(`sau làm mới: cha=${sau.a} con=${sau.b} dòng người thử còn=${sau.c}`);
const conDau = await db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='thu_dau'").first();
const mig = await db.prepare("SELECT count(*) n FROM d1_migrations").first();
const dem = await db.prepare("SELECT type, count(*) n FROM sqlite_master GROUP BY type").all();
console.log(`sau làm mới: bảng lạ còn=${conDau.n}, d1_migrations=${mig.n}, đối tượng=${JSON.stringify(dem.results)}`);
// thử lỗi giữa chừng: câu hỏng ở cuối lô ⇒ không được mất dữ liệu cũ
await db.prepare(`CREATE TABLE thu_dau2 (x)`).run();
try { await db.batch([db.prepare("DROP TABLE thu_dau2"), db.prepare("SELECT * FROM bang_khong_co")]); } catch {}
const con2 = await db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='thu_dau2'").first();
console.log(`lô hỏng giữa chừng: bảng còn nguyên=${con2.n === 1}`);
await mf.dispose();
