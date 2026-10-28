// Bài kiểm BẢN MÁY ĐỌC của sơ đồ kiến trúc (docs/so-do-kien-truc/kien-truc.json): tệp này chỉ chứa thứ KHÔNG suy ra được từ mã
// (mục đích, đối tượng dùng, giới hạn, khối ngoài). Bài này ép nó khớp mã: đủ phần, đúng tiền tố bảng, đúng mã quyền, tệp trỏ tới có thật.
// Mối nối, tầng, số bảng, số trang KHÔNG chép vào JSON — bài cũng đỏ nếu JSON thử chép mối nối (khoá lạ).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PERMISSION_CODES } from "./shared/permissions.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const JSON_PATH = join(ROOT, "docs/so-do-kien-truc/kien-truc.json");

interface Phan {
  ma: string; ten_viet: string; muc_dich: string; ai_dung: string[]; tien_to_bang: string[]; khong_lam: string[]; doc_chi_tiet: string[];
}
interface KhoiNgoai { ten: string; muc_dich: string; chieu: string; phan_dung?: string[] }
interface KienTruc { quy_uoc: string; phan: Phan[]; khoi_ngoai: KhoiNgoai[] }
interface DuLieu { tables: { name: string; module: string }[] }

const kt: KienTruc = JSON.parse(readFileSync(JSON_PATH, "utf8"));
const dd: DuLieu = JSON.parse(readFileSync(join(ROOT, "docs/data-dictionary.json"), "utf8"));
const THU_MUC_PHAN = readdirSync(join(ROOT, "src/modules")).filter((n) => statSync(join(ROOT, "src/modules", n)).isDirectory()).sort();

/** Tiền tố kết thúc bằng "_" khớp theo đầu tên; không có "_" cuối thì là tên đầy đủ của một bảng cũ không tiền tố. */
const khop = (tienTo: string, bang: string): boolean => (tienTo.endsWith("_") ? bang.startsWith(tienTo) : bang === tienTo);

test("kien-truc.json: tập `ma` == tập thư mục con của src/modules (không thiếu, không thừa)", () => {
  const ma = kt.phan.map((p) => p.ma);
  assert.equal(new Set(ma).size, ma.length, "có phần khai hai lần");
  assert.deepEqual([...ma].sort(), THU_MUC_PHAN, "JSON và src/modules lệch nhau");
});

test("kien-truc.json: chỉ chứa khoá đã định (không chép mối nối, số bảng, số trang vào đây)", () => {
  assert.deepEqual(Object.keys(kt).sort(), ["khoi_ngoai", "phan", "quy_uoc"]);
  assert.match(kt.quy_uoc, /ALLOWED_EDGES/);
  for (const p of kt.phan) {
    assert.deepEqual(Object.keys(p).sort(), ["ai_dung", "doc_chi_tiet", "khong_lam", "ma", "muc_dich", "ten_viet", "tien_to_bang"], `phần ${p.ma}: khoá lạ hoặc thiếu`);
  }
});

const TU_ANH_THO = [
  "the", "and", "for", "with", "from", "this", "that", "user", "users", "order", "orders", "ticket", "tickets", "customer", "customers", "booking", "manager",
  "login", "password", "payment", "invoice", "vehicle", "report", "service", "services", "system", "create", "update", "delete", "manage", "handle", "handles", "module", "feature",
];

test("kien-truc.json: mọi phần có muc_dich >= 20 ký tự, lời thường, không chữ Anh thô", () => {
  for (const p of kt.phan) {
    assert.ok(typeof p.muc_dich === "string" && p.muc_dich.trim().length >= 20, `phần ${p.ma}: muc_dich rỗng hoặc quá ngắn`);
    assert.ok(typeof p.ten_viet === "string" && p.ten_viet.trim().length > 0, `phần ${p.ma}: thiếu ten_viet`);
    assert.ok(Array.isArray(p.khong_lam) && p.khong_lam.length >= 1 && p.khong_lam.length <= 3, `phần ${p.ma}: khong_lam phải 1–3 điều`);
    for (const chu of [p.muc_dich, p.ten_viet, ...p.khong_lam]) {
      const tu = chu.toLowerCase().match(/[a-z]+/g) ?? [];
      const lo = tu.filter((t) => TU_ANH_THO.includes(t));
      assert.deepEqual(lo, [], `phần ${p.ma}: chữ Anh thô lộ ra trong "${chu}"`);
    }
  }
  for (const k of kt.khoi_ngoai) assert.ok(k.muc_dich.trim().length >= 20 && k.ten.length > 0 && k.chieu.length > 0, `khối ngoài ${k.ten}: thiếu mô tả`);
});

test("kien-truc.json: tien_to_bang khớp bảng của data-dictionary, hai chiều", () => {
  const theoPhan = new Map(kt.phan.map((p) => [p.ma, p.tien_to_bang]));
  for (const p of kt.phan) {
    for (const tt of p.tien_to_bang) {
      const trung = dd.tables.filter((t) => khop(tt, t.name));
      assert.ok(trung.length > 0, `phần ${p.ma}: tiền tố "${tt}" không khớp bảng nào`);
      for (const t of trung) assert.equal(t.module, p.ma, `tiền tố "${tt}" của ${p.ma} khớp bảng ${t.name} thuộc phần ${t.module}`);
    }
  }
  for (const t of dd.tables) {
    const phu = (theoPhan.get(t.module) ?? []).some((tt) => khop(tt, t.name));
    assert.ok(phu, `bảng ${t.name} (phần ${t.module}) chưa được tien_to_bang của JSON phủ`);
  }
  for (const t of dd.tables) assert.ok(theoPhan.has(t.module), `bảng ${t.name} thuộc phần "${t.module}" không có trong JSON`);
});

test("kien-truc.json: ai_dung là mã trong PERMISSION_CODES hoặc \"he_thong\"", () => {
  for (const p of kt.phan) {
    assert.ok(Array.isArray(p.ai_dung) && p.ai_dung.length > 0, `phần ${p.ma}: ai_dung rỗng`);
    for (const a of p.ai_dung) assert.ok(a === "he_thong" || (PERMISSION_CODES as readonly string[]).includes(a), `phần ${p.ma}: ai_dung "${a}" không phải mã quyền`);
  }
});

test("kien-truc.json: mọi doc_chi_tiet là tệp có thật", () => {
  for (const p of kt.phan) {
    assert.ok(p.doc_chi_tiet.length > 0, `phần ${p.ma}: doc_chi_tiet rỗng`);
    for (const d of p.doc_chi_tiet) assert.ok(existsSync(join(ROOT, d)) && statSync(join(ROOT, d)).isFile(), `phần ${p.ma}: tệp "${d}" không có`);
  }
});

test("kien-truc.json: khoi_ngoai khớp wrangler.jsonc (binding R2, email, Durable Object, D1) và phan_dung trỏ phần có thật", () => {
  const wr = readFileSync(join(ROOT, "wrangler.jsonc"), "utf8");
  const ten = new Set(kt.khoi_ngoai.map((k) => k.ten));
  // Mọi kho R2 đọc THẲNG từ wrangler.jsonc (ADR-0144: kho thứ hai HO_TRO lọt qua danh sách cứng cũ — người kiểm độc lập 28/10).
  const khoR2 = [...wr.matchAll(/\{\s*"binding":\s*"([A-Z_]+)",\s*"bucket_name"/g)].map((m) => m[1]!);
  assert.ok(khoR2.includes("HO_SO"), "chống bài rỗng: đọc được kho R2 từ wrangler.jsonc");
  for (const binding of new Set([...khoR2, "EMAIL", "BANG_TIN", "DB"])) {
    if (wr.includes(`"${binding}"`)) assert.ok([...ten].some((t) => t.includes(binding)), `binding ${binding} có ở wrangler.jsonc nhưng chưa có khối ngoài nhắc tới`);
  }
  for (const k of kt.khoi_ngoai) for (const m of k.phan_dung ?? []) assert.ok(THU_MUC_PHAN.includes(m), `khối ngoài ${k.ten}: phần "${m}" không có`);
});
