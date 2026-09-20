// Bài kiểm KIẾN TRÚC (ADR-0002 điều 8, ADR-0003): ranh giới module, sổ dữ liệu, chuẩn bảng mới, ranh giới SQL của module "nghiêm".
// Ràng buộc không có bài kiểm này là ràng buộc rỗng (Điều 8.2, 8.5: mặc định từ chối). Ngoại lệ có hạn ghi ở LEGACY bên dưới.
// SQL được kiểm bằng CHÍNH SQLite (EXPLAIN trên schema "ranh giới": view công bố v_* thay bằng bảng rỗng cùng cột) — không quét chuỗi SQL.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { renderDictionaryMarkdown } from "../scripts/data-dictionary-lib.mjs";
import { registeredSql, type SqlEntry } from "./shared/sql-registry.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC = join(ROOT, "src");
const WEB = join(ROOT, "web");

/** Chiều phụ thuộc cho phép (ADR-0002 + ADR-0008). Module mới PHẢI khai ở đây. Không được có vòng. */
const ALLOWED_EDGES: Record<string, readonly string[]> = {
  accounts: ["staff", "auth", "audit"],
  audit: [],
  auth: ["staff"],
  catalog: ["audit"],
  locations: ["audit"],
  orders: ["audit", "catalog", "staff", "parties", "locations"],
  parties: ["locations", "audit"],
  staff: ["parties", "audit"],
};

/** Module đã áp điều 8(b) (SQL đăng ký qua defineSql). Module cũ nằm ở LEGACY cho tới hạn ghi kèm. */
const STRICT: readonly { module: string; file: string }[] = [
  { module: "locations", file: "modules/locations/repository.ts" },
];

/**
 * NGOẠI LỆ CÓ HẠN (ADR-0002 điều 8(b)): SQL của module cũ chưa đăng ký — còn JOIN thẳng bảng module khác.
 * Hạn: `staff` chuyển sang STRICT ở kế hoạch N1-B (Task B1); `audit`/`orders` bỏ JOIN thẳng bảng khi chạm ở N1-B (Task B4) và còn wonGuard của orders tới N2;
 * `accounts`, `auth`, `catalog` chưa có SQL riêng đáng kể — chuyển STRICT khi có SQL mới.
 */
const LEGACY = ["accounts", "audit", "auth", "catalog", "orders", "staff", "parties"] as const;

const TABLE_PREFIX: Record<string, string> = { pty_: "parties", loc_: "locations", stf_: "staff", dsp_: "dispatch", bil_: "billing" };
const VIEW_PREFIX: Record<string, string> = { pty: "parties", loc: "locations", stf: "staff", ord: "orders", dsp: "dispatch", bil: "billing" };

// ---------------------------------------------------------------------------------------------------------------------
// Đọc mã nguồn
// ---------------------------------------------------------------------------------------------------------------------
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}

/** Mọi đường dẫn tương đối được import/export-from trong một tệp (import nhiều dòng, `import type`, `export … from`, `import "x"`). */
function relativeImports(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const re = /(?:^|\n)[ \t]*(?:import|export)\s+(?:type\s+)?(?:[^'"`;]*?\sfrom\s+)?["']([^"']+)["']/g;
  const out: string[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) if (m[1]!.startsWith(".")) out.push(m[1]!);
  return out;
}

const relSrc = (file: string, spec: string): string => relative(SRC, resolve(dirname(file), spec)).split(sep).join("/");

const MODULES = readdirSync(join(SRC, "modules")).filter((d) => statSync(join(SRC, "modules", d)).isDirectory());

test("mọi module trong src/modules đều khai chiều phụ thuộc ở ALLOWED_EDGES", () => {
  for (const m of MODULES) assert.ok(m in ALLOWED_EDGES, `module "${m}" chưa khai trong ALLOWED_EDGES`);
});

test("ADR-0002 điều 8(a): module chỉ import index.ts của module khác, đúng chiều phụ thuộc", () => {
  const problems: string[] = [];
  for (const m of MODULES) {
    for (const file of walk(join(SRC, "modules", m))) {
      for (const spec of relativeImports(file)) {
        const rel = relSrc(file, spec);
        if (rel === `modules/${m}` || rel.startsWith(`modules/${m}/`) || rel.startsWith("shared/")) continue;
        const other = /^modules\/([^/]+)(\/index(?:\.ts)?)?$/.exec(rel);
        if (!other) {
          problems.push(`${relative(ROOT, file)}: import "${spec}" ra ngoài module (chỉ được ../<module> hoặc ../<module>/index, hoặc ../../shared/...)`);
          continue;
        }
        const target = other[1]!;
        if (!(ALLOWED_EDGES[m] ?? []).includes(target)) problems.push(`${relative(ROOT, file)}: cạnh ${m} → ${target} chưa được phép`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("đồ thị phụ thuộc module không có vòng", () => {
  const state = new Map<string, "visiting" | "done">();
  const visit = (node: string, path: string[]): void => {
    if (state.get(node) === "done") return;
    assert.notEqual(state.get(node), "visiting", `vòng phụ thuộc: ${[...path, node].join(" → ")}`);
    state.set(node, "visiting");
    for (const next of ALLOWED_EDGES[node] ?? []) visit(next, [...path, node]);
    state.set(node, "done");
  };
  for (const node of Object.keys(ALLOWED_EDGES)) visit(node, []);
});

test("ADR-0002 điều 6/quy tắc 5: shared/ và web/ không import module", () => {
  const problems: string[] = [];
  for (const file of walk(join(SRC, "shared"))) {
    for (const spec of relativeImports(file)) if (relSrc(file, spec).startsWith("modules/")) problems.push(`${relative(ROOT, file)} import "${spec}"`);
  }
  for (const file of walk(WEB)) {
    for (const spec of relativeImports(file)) {
      const t = resolve(dirname(file), spec);
      if (t.startsWith(join(SRC, "modules")) || t === join(SRC, "index")) problems.push(`${relative(ROOT, file)} import "${spec}"`);
    }
  }
  assert.deepEqual(problems, []);
});

// ---------------------------------------------------------------------------------------------------------------------
// Schema thật từ migrations/*.sql
// ---------------------------------------------------------------------------------------------------------------------
interface Dict {
  version: number;
  modules: string[];
  tables: { name: string; module: string; kind: "table" | "lookup"; legacy?: boolean; deprecatedColumns?: string[] }[];
  views: { name: string; module: string; columns: string[] }[];
  integrityEdges: { fromTable: string; toTable: string; note: string }[];
}
const dict: Dict = JSON.parse(readFileSync(join(ROOT, "docs/data-dictionary.json"), "utf8"));

function buildSchema(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(join(ROOT, "migrations")).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(join(ROOT, "migrations", f), "utf8"));
  return db;
}
const db = buildSchema();
const names = (type: string): string[] =>
  (db.prepare("SELECT name FROM sqlite_master WHERE type = ? AND name NOT LIKE 'sqlite_%' ORDER BY name").all(type) as { name: string }[]).map((r) => r.name);
const ownerOf = (name: string): string | undefined => dict.tables.find((t) => t.name === name)?.module ?? dict.views.find((v) => v.name === name)?.module;
const columns = (table: string) => db.prepare(`PRAGMA table_info(${table})`).all() as { name: string; type: string; notnull: number; pk: number }[];
const fks = (table: string) => db.prepare(`PRAGMA foreign_key_list(${table})`).all() as { table: string; from: string; to: string | null; on_delete: string }[];

test("ADR-0002 điều 1: mọi bảng/view của schema có trong sổ dữ liệu và ngược lại", () => {
  assert.deepEqual(dict.tables.map((t) => t.name).sort(), names("table"));
  assert.deepEqual(dict.views.map((v) => v.name).sort(), names("view"));
  for (const o of [...dict.tables, ...dict.views]) assert.ok(dict.modules.includes(o.module), `${o.name}: module "${o.module}" không có trong sổ`);
});

test("ADR-0002 điều 2: bảng mới có tiền tố đúng module; bảng không tiền tố phải đánh dấu legacy", () => {
  for (const t of dict.tables) {
    const prefix = Object.keys(TABLE_PREFIX).find((p) => t.name.startsWith(p));
    if (prefix) {
      assert.equal(TABLE_PREFIX[prefix], t.module, `${t.name} phải thuộc module ${TABLE_PREFIX[prefix]}`);
      assert.ok(!t.legacy, `${t.name} có tiền tố nên không được đánh dấu legacy`);
    } else assert.ok(t.legacy, `${t.name} không có tiền tố module nên phải đánh dấu "legacy": true (tên cũ giữ nguyên)`);
  }
});

test("ADR-0002 điều 5/6: khoá ngoại xuyên module đúng chiều phụ thuộc hoặc là cạnh toàn vẹn đã khai", () => {
  const integrity = new Set(dict.integrityEdges.map((e) => `${e.fromTable}>${e.toTable}`));
  const problems: string[] = [];
  for (const t of dict.tables) {
    for (const fk of fks(t.name)) {
      const parent = dict.tables.find((p) => p.name === fk.table);
      if (!parent) {
        problems.push(`${t.name}.${fk.from} → ${fk.table}: bảng cha không có trong sổ`);
        continue;
      }
      const pk = columns(parent.name).filter((c) => c.pk > 0).map((c) => c.name);
      if (fk.to !== null && !(pk.length === 1 && pk[0] === fk.to)) problems.push(`${t.name}.${fk.from} phải trỏ khoá chính của ${parent.name}, đang trỏ ${fk.to}`);
      if (t.module !== parent.module && !(ALLOWED_EDGES[t.module] ?? []).includes(parent.module) && !integrity.has(`${t.name}>${parent.name}`)) {
        problems.push(`${t.name}.${fk.from} → ${parent.name}: cạnh ${t.module} → ${parent.module} chưa được phép (khai ở integrityEdges nếu là cạnh toàn vẹn)`);
      }
    }
  }
  assert.deepEqual(problems, []);
  for (const e of dict.integrityEdges) assert.ok(fks(e.fromTable).some((f) => f.table === e.toTable), `cạnh toàn vẹn ${e.fromTable} → ${e.toTable} không có thật`);
});

test("ADR-0002 điều 3: view công bố — tên v_<tiền tố>_…, cột đúng sổ, không INSTEAD OF", () => {
  for (const v of dict.views) {
    const m = /^v_([a-z]+)_/.exec(v.name);
    assert.ok(m && VIEW_PREFIX[m[1]!] === v.module, `${v.name} phải đặt tên v_<tiền tố module ${v.module}>_…`);
    assert.deepEqual(columns(v.name).map((c) => c.name), v.columns, `cột của ${v.name} lệch sổ (đổi cột view là đổi hợp đồng — sửa sổ có chủ đích)`);
  }
  const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'trigger'").all() as { name: string; sql: string }[];
  assert.deepEqual(triggers.filter((t) => /INSTEAD\s+OF/i.test(t.sql)).map((t) => t.name), [], "cấm trigger INSTEAD OF (sẽ lách quy tắc ghi)");
});

test("ADR-0003: bảng mới (không legacy) — cột kiểm toán, cột WHO không khoá ngoại, không CASCADE, tra cứu khoá mã", () => {
  const problems: string[] = [];
  for (const t of dict.tables.filter((x) => !x.legacy)) {
    const cols = columns(t.name);
    const byName = new Map(cols.map((c) => [c.name, c]));
    const foreign = fks(t.name);
    for (const fk of foreign) if (fk.on_delete !== "NO ACTION") problems.push(`${t.name}.${fk.from}: ON DELETE ${fk.on_delete} (bảng mới chỉ được NO ACTION)`);
    if (t.kind === "lookup") {
      const pk = cols.filter((c) => c.pk > 0);
      if (!(pk.length === 1 && pk[0]!.name === "code" && pk[0]!.type === "TEXT")) problems.push(`${t.name}: bảng tra cứu phải có khoá chính TEXT \`code\``);
      continue;
    }
    for (const c of ["created_at", "updated_at"]) if (!byName.get(c) || byName.get(c)!.notnull !== 1) problems.push(`${t.name}.${c}: thiếu hoặc không NOT NULL`);
    for (const c of ["created_by", "updated_by"]) {
      const col = byName.get(c);
      if (!col) problems.push(`${t.name}.${c}: thiếu`);
      else {
        if (col.notnull !== 0 || col.type !== "TEXT") problems.push(`${t.name}.${c}: phải TEXT NULL (NULL = hệ thống)`);
        if (foreign.some((fk) => fk.from === c)) problems.push(`${t.name}.${c}: cột WHO không được có khoá ngoại`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("docs/DATA-DICTIONARY.md khớp bản sinh từ docs/data-dictionary.json (chạy `npm run dict`)", () => {
  assert.equal(readFileSync(join(ROOT, "docs/DATA-DICTIONARY.md"), "utf8"), renderDictionaryMarkdown(dict));
});

// ---------------------------------------------------------------------------------------------------------------------
// ADR-0002 điều 8(b): ranh giới SQL của module nghiêm — hỏi chính SQLite bằng EXPLAIN
// ---------------------------------------------------------------------------------------------------------------------
function boundaryDb(): DatabaseSync {
  const b = new DatabaseSync(":memory:");
  const master = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND sql IS NOT NULL").all() as { type: string; name: string; sql: string }[];
  for (const m of master.filter((x) => x.type === "table")) b.exec(m.sql);
  for (const m of master.filter((x) => x.type === "index")) b.exec(m.sql);
  // View công bố → bảng rỗng cùng cột: SQLite không "trải" view thành bảng gốc nên câu SQL lộ đúng quan hệ nó dùng.
  for (const v of dict.views) b.exec(`CREATE TABLE ${v.name} (${columns(v.name).map((c) => c.name).join(", ")})`);
  return b;
}
const boundary = boundaryDb();
const relationOfRootPage = new Map<number, string>();
for (const r of boundary.prepare("SELECT tbl_name, rootpage FROM sqlite_master WHERE rootpage > 0").all() as { tbl_name: string; rootpage: number }[]) relationOfRootPage.set(r.rootpage, r.tbl_name);
const isView = (name: string): boolean => dict.views.some((v) => v.name === name);

/** Các quan hệ (bảng hoặc view công bố) một câu SQL đọc và ghi, theo EXPLAIN. */
function touched(sql: string): { reads: Set<string>; writes: Set<string> } {
  const reads = new Set<string>();
  const writes = new Set<string>();
  for (const op of boundary.prepare(`EXPLAIN ${sql}`).all() as { opcode: string; p2: number; p3: number }[]) {
    const rel = relationOfRootPage.get(op.p2);
    if (!rel || op.p3 !== 0) continue;
    if (op.opcode === "OpenRead") reads.add(rel);
    if (op.opcode === "OpenWrite") writes.add(rel);
  }
  return { reads, writes };
}

/**
 * Câu có thể XOÁ CỨNG dòng: `DELETE`, hoặc `… OR REPLACE` / `REPLACE INTO` (xoá dòng xung đột rồi chèn). Nhận diện theo LOẠI câu lệnh (từ khoá đầu),
 * không quét tên bảng; bảng bị ghi lấy từ EXPLAIN. (Opcode `Delete` của EXPLAIN không dùng được: UPDATE cũng sinh nó.)
 */
const isHardDelete = (sql: string): boolean => /^\s*(?:WITH\b[\s\S]*?\)\s*)?DELETE\b/i.test(sql) || /\bOR\s+REPLACE\b|^\s*REPLACE\b/i.test(sql);

function violations(e: Pick<SqlEntry, "module" | "sql">): string[] {
  const deps = new Set([e.module, ...(ALLOWED_EDGES[e.module] ?? [])]);
  const integrity = new Set(dict.integrityEdges.map((x) => `${x.fromTable}>${x.toTable}`));
  const { reads, writes } = touched(e.sql);
  const out: string[] = [];
  // R-N1-9 (ADR-0003 điều 8): không xoá cứng bản ghi bảng MỚI — đóng hiệu lực (`valid_to`) hoặc `active = 0`.
  if (isHardDelete(e.sql)) for (const w of writes) if (dict.tables.find((t) => t.name === w)?.legacy !== true) out.push(`xoá cứng bảng ${w} (R-N1-9: đóng hiệu lực hoặc active = 0, không DELETE/REPLACE)`);
  const parentsOfWrites = new Map<string, string[]>();
  for (const w of writes) {
    if (ownerOf(w) !== e.module) out.push(`ghi bảng ${w} của module ${ownerOf(w) ?? "không có trong sổ"}`);
    for (const fk of (boundary.prepare(`PRAGMA foreign_key_list(${w})`).all() as { table: string }[])) parentsOfWrites.set(fk.table, [...(parentsOfWrites.get(fk.table) ?? []), w]);
  }
  for (const r of reads) {
    if (writes.has(r)) continue;
    const owner = ownerOf(r);
    if (owner === undefined) out.push(`đọc ${r}: không có trong sổ`);
    else if (owner === e.module) continue;
    else if (isView(r)) {
      if (!deps.has(owner)) out.push(`đọc view ${r} của module ${owner}: cạnh ${e.module} → ${owner} chưa khai`);
    } else if (parentsOfWrites.has(r)) {
      // Khoá ngoại của bảng đang ghi buộc SQLite đọc bảng cha để kiểm toàn vẹn — hợp lệ nếu cạnh đó được phép.
      const ok = deps.has(owner) || (parentsOfWrites.get(r) ?? []).some((w) => integrity.has(`${w}>${r}`));
      if (!ok) out.push(`khoá ngoại tới ${r} của module ${owner}: cạnh ${e.module} → ${owner} chưa khai`);
    } else out.push(`đọc TRỰC TIẾP bảng ${r} của module ${owner} (chỉ được đọc qua view công bố v_*)`);
  }
  return out;
}

test("bộ phân tích SQL: bắt đúng vi phạm và cho phép đúng cách dùng", () => {
  const cases: { module: string; sql: string; expect: RegExp | null }[] = [
    { module: "staff", sql: "SELECT id, phone FROM staff WHERE active = 1", expect: null },
    { module: "staff", sql: "SELECT s.id, a.id FROM staff s JOIN audit_log a ON a.staff_id = s.id", expect: /đọc TRỰC TIẾP bảng audit_log của module audit/ },
    { module: "orders", sql: "SELECT o.id, s.full_name FROM orders o JOIN staff s ON s.id = o.staff_id", expect: /đọc TRỰC TIẾP bảng staff của module staff/ },
    { module: "audit", sql: "UPDATE staff SET active = 0 WHERE id = ?", expect: /ghi bảng staff của module staff/ },
    { module: "orders", sql: "INSERT INTO orders (id, order_code, staff_id, customer_name, customer_phone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)", expect: null },
    { module: "catalog", sql: "INSERT INTO orders (id, order_code, staff_id, customer_name, customer_phone, created_at, updated_at) VALUES (?,?,?,?,?,?,?)", expect: /ghi bảng orders của module orders/ },
  ];
  for (const c of cases) {
    const got = violations(c);
    if (c.expect === null) assert.deepEqual(got, [], c.sql);
    else assert.ok(got.some((g) => c.expect!.test(g)), `${c.sql} → ${JSON.stringify(got)}`);
  }
});

test("ADR-0002 điều 8(b): SQL đã đăng ký của module nghiêm chỉ chạm bảng của mình / view công bố / khoá ngoại được phép", async () => {
  for (const s of STRICT) await import(pathToFileURL(join(SRC, s.file)).href);
  for (const s of STRICT) assert.ok(registeredSql().some((e) => e.module === s.module), `module nghiêm "${s.module}" chưa đăng ký câu SQL nào (repository.ts phải dùng defineSql)`);
  const problems = registeredSql().flatMap((e) => violations(e).map((v) => `${e.module}.${e.name}: ${v}`));
  assert.deepEqual(problems, []);
});

test("R-N1-12: vai trò hồ sơ không là điều kiện cho phép — chỉ module parties nhắc `pty_party_role`", () => {
  const problems: string[] = [];
  for (const file of [...walk(SRC), ...walk(WEB)]) {
    const rel = relative(ROOT, file).split(sep).join("/");
    if (rel.startsWith("src/modules/parties/")) continue;
    if (readFileSync(file, "utf8").includes("pty_party_role")) problems.push(rel);
  }
  assert.deepEqual(problems, [], "vai trò hồ sơ (HDV, tài xế…) chỉ để ghi và truy vấn, không bao giờ để cho/chặn thao tác (ADR-0001 mục 4, ADR-0005)");
});

test("module không nghiêm phải nằm trong LEGACY (ngoại lệ có hạn) — module mới không được trốn 8(b)", () => {
  const strict = new Set(STRICT.map((s) => s.module));
  for (const m of MODULES) assert.ok(strict.has(m) || (LEGACY as readonly string[]).includes(m), `module "${m}" không nghiêm và không có trong LEGACY: thêm vào STRICT (kèm repository dùng defineSql)`);
  for (const m of LEGACY) assert.ok(!strict.has(m), `module "${m}" đã nghiêm — bỏ khỏi LEGACY`);
});

test("R-N1-9: câu DELETE trên bảng mới bị bắt (phải đóng hiệu lực hoặc active = 0); UPDATE thì không", () => {
  assert.ok(violations({ module: "locations", sql: "DELETE FROM loc_location WHERE id = ?" }).some((v) => /xoá cứng bảng loc_location/.test(v)));
  assert.deepEqual(violations({ module: "locations", sql: "UPDATE loc_location SET active = 0 WHERE id = ?" }), [], "UPDATE không phải xoá cứng");
});
