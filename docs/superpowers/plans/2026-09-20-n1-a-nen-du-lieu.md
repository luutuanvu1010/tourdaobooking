# N1-A — Nền dữ liệu: kiến trúc kiểm được, migration mở rộng, module `locations` và `parties` — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng nền dữ liệu N1 của `tourdao-sales`: bài kiểm kiến trúc + sổ dữ liệu (ADR-0002/0003), bản đồ quyền dùng chung (ADR-0007), các migration MỞ RỘNG `0009…0012` (view nhãn đơn, địa điểm, hồ sơ–vai trò–quan hệ, quyền app + `staff.party_id` + backfill) và hai module mới `locations`, `parties` có API và e2e — trong khi mã cũ vẫn chạy nguyên vẹn.

**Architecture:** Modular Monolith trên Cloudflare Worker + D1: module mới sở hữu bảng có tiền tố (`loc_`, `pty_`, `stf_`), đọc xuyên module chỉ qua view công bố, ghi xuyên module bằng câu lệnh trả về để gộp `db.batch()`; migration theo expand–contract; SQL của module nghiêm được đăng ký (`defineSql`) để bài kiểm hỏi thẳng SQLite bằng `EXPLAIN`.

**Tech Stack:** TypeScript (Node 22 `node --test` chạy trực tiếp `.ts`), Cloudflare Workers + D1 (SQLite), `node:sqlite` cho test schema, esbuild, `wrangler dev` cho e2e.

**Spec:** `docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md` (đã duyệt 2026-09-20) và ADR-0001…0008 (`docs/adr/`).

**Kế hoạch tiếp theo:** `docs/superpowers/plans/2026-09-20-n1-b-chuyen-quyen.md` (chuyển `role` → quyền, giao diện, trang mới, kiểm toán, phát hành 2). **Không triển khai sau kế hoạch này** — chỉ sau kế hoạch B (và A2).

**Cách kiểm chứng kế hoạch này (đã làm khi soạn):** mọi thao tác trong kế hoạch (ghi tệp, thay chuỗi, chạy lệnh, cả các bước "phải đỏ") đã được **áp dụng thật** vào một worktree sạch tạo từ nền T0 và các lệnh kiểm ở cuối mỗi task đã chạy; các con số ghi "lần kiểm khi soạn" là kết quả thật của lần chạy đó. Mã trong kế hoạch là mã đã chạy được — nếu một bước lệch với thực tế, đó là dấu hiệu nền đã đổi (báo người điều phối), không phải để tự đoán lại.

## Global Constraints

- **Ngôn ngữ:** tài liệu, chú thích, thông báo lỗi trả cho người dùng, nhật ký, giao diện — tiếng Việt ĐẦY ĐỦ DẤU; định danh mã, mã lỗi (`invalid_input`, `stale`…), tên bảng/cột — tiếng Anh.
- **Node:** môi trường soạn kế hoạch Node 22.22.3 (`node --test` chạy trực tiếp `.ts`; `node:sqlite` cho test schema — có cảnh báo "ExperimentalWarning", bình thường). Test chạy bằng `npm test` (= `node --test "src/**/*.test.ts"`).
- **Import:** tệp thuần (`rules.ts`, `src/shared/*`) và `repository.ts` của **module nghiêm** (`locations`, `parties`, `staff`) import bằng đuôi `.ts` tường minh (để `node --test` và bài kiểm kiến trúc nạp được); `index.ts` và tệp của module cũ không đuôi.
- **Ranh giới module** (ADR-0002, `docs/ARCHITECTURE.md`): module khác chỉ import `index.ts`; `src/shared/` và `web/` không import `src/modules/`; chiều phụ thuộc cho phép ở `ALLOWED_EDGES` (`src/architecture.test.ts`), không vòng.
- **SQL của module nghiêm:** đăng ký bằng `defineSql`, **tĩnh** (tham số tuỳ chọn viết `?N IS NULL OR …`, không ghép chuỗi theo đầu vào); đọc xuyên module CHỈ qua view công bố `v_<tiền tố>_<tên>`; ghi xuyên module = nhận câu lệnh chưa chạy từ `index.ts` của module chủ rồi gộp vào một `db.batch()`.
- **Bảng mới** (ADR-0003): tiền tố `pty_`/`loc_`/`stf_`; cột `created_at`/`updated_at` (TEXT NOT NULL, ISO-8601 UTC) và `created_by`/`updated_by` (TEXT **NULL**, **không** khoá ngoại; NULL = hệ thống); bảng tra cứu khoá chính `code` TEXT; khoá ngoại `NO ACTION`, cấm `ON DELETE CASCADE`; không xoá cứng (đóng hiệu lực hoặc `active = 0`); ngày dân sự `YYYY-MM-DD` giờ Việt Nam qua `vnToday(new Date())` (không dùng `date('now')` cho "hôm nay").
- **Migration:** chỉ thêm tệp mới, không sửa tệp đã áp; `0009…0012` là migration MỞ RỘNG (mã cũ vẫn chạy); **`0013` (siết) KHÔNG được có mặt trong `migrations/` trước Task B5** — `wrangler d1 migrations apply` áp mọi migration chưa áp.
- **Nhật ký:** không ghi SĐT, email, MST (chỉ tên/loại/mã); mọi hành động mới khai ở `src/shared/audit-actions.ts`.
- **Quyền:** bản đồ quyền → thao tác (ADR-0007) chỉ ở `src/shared/permissions.ts`; quyền app (SALES/ACCOUNTING/ADMIN/FIELD) ≠ vai trò hồ sơ — vai trò hồ sơ (HDV, tài xế…) không bao giờ là điều kiện cho phép (R-N1-12).
- **Cột chết:** `staff.role` chỉ được GHI hằng `'sales'`, `staff.full_name` chỉ được GHI `''` (ADR-0005; R-N1-14); không SQL nào đọc chúng.
- **Kiểm tra chuẩn:** `npm test`; `npx tsc --noEmit` (sạch); `npx tsc --noEmit -p web --pretty false` = **đúng 4 lỗi A2 đã biết** (`web/order-form.ts` 101,5 và 124,22; `web/order.ts` 44,22 và 44,33) — KHÔNG sửa; `npm run test:e2e` (cần mạng: Sheet thật).
- **Tệp tạm:** các bước "Tạo tệp tạm `$TMPDIR/…`" dùng thư mục tạm của phiên (macOS đặt sẵn `$TMPDIR`; nếu trống, dùng `export TMPDIR=$(mktemp -d)`). Tệp tạm nằm NGOÀI repo và KHÔNG được commit. Lệnh chạy chúng luôn từ gốc repo.
- **Phạm vi cấm:** không đẩy lên GitHub, không merge vào `main`, không triển khai (chủ dự án tự làm — `docs/HANDOFF-N1.md`); không sửa ADR/đặc tả đã duyệt (chỉ đính chính lỗi thực tế và báo chủ dự án); không đụng `orders` ngoài chỗ kế hoạch nêu.
- **Commit:** một commit mỗi task, thông điệp tiếng Việt như trong bước Commit, kèm dòng đồng tác giả theo môi trường.

## Bản đồ tệp

| Tệp | Trách nhiệm |
|---|---|
| `src/shared/sql-registry.ts` | `defineSql`/`registeredSql`: sổ đăng ký SQL của module nghiêm (ADR-0002 điều 8(b)) |
| `src/architecture.test.ts` | bài kiểm kiến trúc: import, đồ thị, sổ ↔ schema, khoá ngoại, view, chuẩn bảng mới, ranh giới SQL bằng `EXPLAIN`; hằng `ALLOWED_EDGES`/`STRICT`/`LEGACY` |
| `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` | sổ dữ liệu (nguồn sự thật) và tài liệu sinh từ nó (`npm run dict`) |
| `scripts/data-dictionary-lib.mjs`, `scripts/gen-data-dictionary.mjs` | sinh `DATA-DICTIONARY.md` |
| `src/shared/phone.ts`, `src/shared/permissions.ts` (+ test) | chuẩn hoá SĐT dùng chung; bản đồ quyền ADR-0007 (một nơi duy nhất) |
| `migrations/0009…0012` | `v_ord_order_label`; `loc_*`; `pty_*`; `stf_*` + `staff.party_id` + backfill (sinh bằng script tạm từ DDL tham chiếu) |
| `src/migrations-n1.test.ts` | test schema/ràng buộc/backfill trên SQLite thật |
| `src/modules/locations/` | module địa điểm: `rules.ts`, `repository.ts` (nghiêm), `index.ts` (route) |
| `src/modules/parties/` | module hồ sơ: `rules.ts` (thuần), `repository.ts` (nghiêm), `index.ts` (route + API cho module khác) |
| `tests/e2e/locations.mjs`, `tests/e2e/parties.mjs` | e2e API địa điểm, hồ sơ |

---

### Task T0: Nền nhánh: gộp `origin/main` (PWA) vào nhánh A1 và chốt baseline

Điều kiện tiên quyết của đặc tả N1 (§11c, đã duyệt): `main` chỉ có migration `0001…0007` và đã có PWA (PR #1, #3); nhánh A1 có `0008` nhưng chưa có PWA. PWA dựng lại `web/shell.ts`, sửa 6 trang HTML và `tests/e2e/run.mjs` — đúng những tệp N1 chạm vào — nên gộp **trước**. **Đây là việc của người điều phối, không giao cho subagent triển khai.** Không đẩy gì lên GitHub.

**Files:**
- Sửa (khi gộp): `docs/SPEC-tourdao-sales.md`, `tests/e2e/run.mjs` (hai xung đột đã biết); còn lại git tự gộp

**Interfaces:**
- Consumes: Nhánh `worktree-thong-tin-chuyen-di` (A1, có migration `0008`) và `origin/main` (PWA: `web/shell.ts` dựng lại, `src/shared/sw-policy.ts`, `web/sw/`, kịch bản e2e `pwa`, trang HTML có thẻ PWA).
- Produces: Nhánh chứa cả A1 lẫn PWA, `npm test`/`tsc`/e2e xanh — nền để mọi task sau viết trên mã thật.

- [ ] **Bước 1: Kiểm nhánh và nguồn gộp**

```bash
git status --short                 # sạch
git rev-parse --abbrev-ref HEAD     # worktree-thong-tin-chuyen-di
git fetch origin
git rev-list --left-right --count HEAD...origin/main   # "<số commit A1> 33": origin/main có 33 commit mà nhánh chưa có
```

- [ ] **Bước 2: Báo chủ dự án một dòng**

Đặc tả đã duyệt kèm điều kiện này. Nội dung: "Sắp gộp `origin/main` (PWA, 33 commit) vào nhánh A1 trên máy để làm N1; không đẩy lên GitHub; xung đột đã biết ở `docs/SPEC-tourdao-sales.md` và `tests/e2e/run.mjs`." Không cần chờ trả lời nếu chủ dự án không phản đối.

- [ ] **Bước 3: Gộp không commit**

```bash
git merge --no-commit --no-ff origin/main
```

Kỳ vọng: `Automatic merge failed` với **đúng hai** xung đột nội dung: `docs/SPEC-tourdao-sales.md` và `tests/e2e/run.mjs` (`git status --short | grep '^UU'`). Có tệp xung đột khác → dừng và báo (nền đã đổi so với lúc soạn kế hoạch).

- [ ] **Bước 4: Giải hai xung đột**

- `tests/e2e/run.mjs` — lấy **hợp** hai danh sách kịch bản (`pwa` từ `main`, `trip` từ A1), bỏ dấu xung đột:

```js
const ALL = ["platform", "pwa", "orders", "trip", "admin", "catalog", "admin-race"];
```

- `docs/SPEC-tourdao-sales.md` (mục *Lịch sử thay đổi*) — giữ **cả hai** dòng, dòng A1 ("thông tin chuyến đi, A1") trước rồi dòng PWA ("App iPhone PWA"); bỏ dấu `<<<<<<<`, `=======`, `>>>>>>>`.

Kiểm không còn dấu xung đột: `grep -rn '^<<<<<<<\|^>>>>>>>' docs tests web src package.json` không in gì.

- [ ] **Bước 5: Commit gộp**

```bash
git add -A
git commit -m "Gộp origin/main (PWA) vào nhánh A1 — nền cho N1"
```

- [ ] **Bước 6: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt (baseline: A1 + PWA). (lần kiểm khi soạn: 104 tests, 104 đạt, 0 lỗi)

- [ ] **Bước 7: Chạy** `npx tsc --noEmit`

Kỳ vọng: không có lỗi (thoát 0).

- [ ] **Bước 8: Chạy** `npx tsc --noEmit -p web --pretty false`

Kỳ vọng: **LỖI** — đúng 4 lỗi đã biết (thuộc A2, KHÔNG sửa ở kế hoạch này): `web/order-form.ts` (101,5) TS2353 và (124,22) TS2339; `web/order.ts` (44,22) TS2339 và (44,33) TS7006. Nếu có lỗi khác là do bước vừa làm.

- [ ] **Bước 9: Chạy** `npm run test:e2e`

Kỳ vọng: `E2E: 7/7 kịch bản xanh` (platform, pwa, orders, trip, admin, catalog, admin-race). Cần mạng (Sheet thật). (lần kiểm khi soạn: `E2E: 7/7 kịch bản xanh`)

---

### Task T1: Bài kiểm kiến trúc, sổ dữ liệu và sổ đăng ký SQL

ADR-0002 điều 8: ranh giới module phải **kiểm được bằng máy**. Task này dựng khung kiểm trước mọi mã N1: (a) import chỉ qua `index.ts` và đúng chiều phụ thuộc, không vòng; (b) sổ dữ liệu khớp schema; (c) tiền tố, khoá ngoại xuyên module, view công bố, chuẩn bảng mới (ADR-0003); (d) ranh giới SQL của module "nghiêm" bằng `EXPLAIN` (view công bố `v_*` được thay bằng bảng rỗng trong một schema "ranh giới" nên SQLite tự cho biết câu SQL đọc/ghi quan hệ nào — không quét chuỗi). Lúc này chưa có module nghiêm nào: bài kiểm phân tích SQL chỉ được chứng minh bằng các ca tổng hợp; `STRICT` để trống, các module cũ nằm ở `LEGACY` (ngoại lệ có hạn).

**Files:**
- Tạo: `src/shared/sql-registry.ts`, `docs/data-dictionary.json`, `scripts/data-dictionary-lib.mjs`, `scripts/gen-data-dictionary.mjs`, `src/architecture.test.ts` (và `docs/DATA-DICTIONARY.md` do lệnh sinh)
- Sửa: `package.json` (script `dict`)

**Interfaces:**
- Consumes: Schema dựng từ `migrations/*.sql` bằng `node:sqlite`; import giữa module (`src/modules/*`, `src/shared/*`, `web/*`).
- Produces: `defineSql(module, name, sql)` và `registeredSql()` (`src/shared/sql-registry.ts`); `docs/data-dictionary.json` (nguồn sự thật của bảng/view/cạnh toàn vẹn); `npm run dict`; `src/architecture.test.ts` với `ALLOWED_EDGES`, `STRICT`, `LEGACY` — các task sau chỉ sửa ba hằng này và sổ.

- [ ] **Bước 1: Tạo/ghi `src/architecture.test.ts`**

```ts
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
const STRICT: readonly { module: string; file: string }[] = [];

/**
 * NGOẠI LỆ CÓ HẠN (ADR-0002 điều 8(b)): SQL của module cũ chưa đăng ký — còn JOIN thẳng bảng module khác.
 * Hạn: `staff` chuyển sang STRICT ở kế hoạch N1-B (Task B1); `audit`/`orders` bỏ JOIN thẳng bảng khi chạm ở N1-B (Task B4) và còn wonGuard của orders tới N2;
 * `accounts`, `auth`, `catalog` chưa có SQL riêng đáng kể — chuyển STRICT khi có SQL mới.
 */
const LEGACY = ["accounts", "audit", "auth", "catalog", "orders", "staff"] as const;

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
```

- [ ] **Bước 2: Chạy** `node --test src/architecture.test.ts`

Kỳ vọng: **LỖI** — lỗi nạp module: chưa có `scripts/data-dictionary-lib.mjs` / `src/shared/sql-registry.ts` (test chưa chạy được).

- [ ] **Bước 3: Tạo/ghi `src/shared/sql-registry.ts`**

```ts
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
```

- [ ] **Bước 4: Tạo/ghi `scripts/data-dictionary-lib.mjs`**

```js
// Sinh docs/DATA-DICTIONARY.md từ docs/data-dictionary.json (nguồn sự thật duy nhất — ADR-0002 điều 1).
// Hàm thuần: dùng cho scripts/gen-data-dictionary.mjs và cho bài kiểm src/architecture.test.ts (tài liệu sinh ra phải khớp tệp đang có).

export function renderDictionaryMarkdown(dict) {
  const out = [
    "# Sổ dữ liệu",
    "",
    "> **Sinh tự động** từ `docs/data-dictionary.json` bằng `npm run dict` — không sửa tay. Bài kiểm `src/architecture.test.ts` báo lỗi nếu tệp này lệch.",
    "",
  ];
  for (const module of dict.modules) {
    const tables = dict.tables.filter((t) => t.module === module);
    const views = dict.views.filter((v) => v.module === module);
    if (tables.length === 0 && views.length === 0) continue;
    out.push(`## ${module}`, "", "| Đối tượng | Loại | Ghi chú |", "|---|---|---|");
    for (const t of tables) {
      const notes = [t.legacy ? "tên cũ, giữ nguyên (ADR-0002 điều 2)" : null, t.deprecatedColumns?.length ? `cột chết: ${t.deprecatedColumns.join(", ")}` : null].filter(Boolean);
      out.push(`| \`${t.name}\` | ${t.kind === "lookup" ? "bảng tra cứu" : "bảng"} | ${notes.join("; ")} |`);
    }
    for (const v of views) out.push(`| \`${v.name}\` | view công bố | cột: ${v.columns.join(", ")} |`);
    out.push("");
  }
  out.push("## Cạnh toàn vẹn (khoá ngoại có sẵn, không phải phụ thuộc mã — ADR-0002 điều 6)", "");
  for (const e of dict.integrityEdges) out.push(`- \`${e.fromTable}\` → \`${e.toTable}\` — ${e.note}`);
  out.push("");
  return out.join("\n");
}
```

- [ ] **Bước 5: Tạo/ghi `scripts/gen-data-dictionary.mjs`**

```js
// Sinh docs/DATA-DICTIONARY.md từ docs/data-dictionary.json. Dùng: npm run dict
import { readFileSync, writeFileSync } from "node:fs";
import { renderDictionaryMarkdown } from "./data-dictionary-lib.mjs";

const dict = JSON.parse(readFileSync(new URL("../docs/data-dictionary.json", import.meta.url), "utf8"));
writeFileSync(new URL("../docs/DATA-DICTIONARY.md", import.meta.url), renderDictionaryMarkdown(dict));
console.log("Đã ghi docs/DATA-DICTIONARY.md");
```

- [ ] **Bước 6: Tạo/ghi `docs/data-dictionary.json`** — 10 bảng hiện có (đều `legacy`: tên cũ giữ nguyên, ADR-0002 điều 2) và 4 "cạnh toàn vẹn" khoá ngoại có sẵn tới `staff`/`orders` (ADR-0002 điều 6)

```json
{
  "version": 1,
  "modules": [
    "accounts",
    "audit",
    "auth",
    "catalog",
    "company",
    "locations",
    "orders",
    "parties",
    "staff"
  ],
  "tables": [
    {
      "name": "audit_log",
      "module": "audit",
      "kind": "table",
      "legacy": true
    },
    {
      "name": "catalog_item",
      "module": "catalog",
      "kind": "table",
      "legacy": true
    },
    {
      "name": "catalog_override",
      "module": "catalog",
      "kind": "table",
      "legacy": true
    },
    {
      "name": "catalog_sync",
      "module": "catalog",
      "kind": "table",
      "legacy": true
    },
    {
      "name": "company_profile",
      "module": "company",
      "kind": "table",
      "legacy": true
    },
    {
      "name": "login_attempt",
      "module": "auth",
      "kind": "table",
      "legacy": true
    },
    {
      "name": "order_item",
      "module": "orders",
      "kind": "table",
      "legacy": true
    },
    {
      "name": "order_service",
      "module": "orders",
      "kind": "table",
      "legacy": true
    },
    {
      "name": "orders",
      "module": "orders",
      "kind": "table",
      "legacy": true
    },
    {
      "name": "staff",
      "module": "staff",
      "kind": "table",
      "legacy": true
    }
  ],
  "views": [],
  "integrityEdges": [
    {
      "fromTable": "audit_log",
      "toTable": "staff",
      "note": "audit_log.staff_id — ADR-0002 điều 6"
    },
    {
      "fromTable": "audit_log",
      "toTable": "orders",
      "note": "audit_log.order_id — ADR-0002 điều 6"
    },
    {
      "fromTable": "catalog_override",
      "toTable": "staff",
      "note": "catalog_override.updated_by — ADR-0002 điều 6"
    },
    {
      "fromTable": "company_profile",
      "toTable": "staff",
      "note": "company_profile.updated_by — ADR-0002 điều 6"
    }
  ]
}
```

- [ ] **Bước 7: Sửa `package.json`**

Thay đoạn (đúng một chỗ):

```json
"test:e2e": "node tests/e2e/run.mjs"
```

bằng:

```json
"test:e2e": "node tests/e2e/run.mjs",
    "dict": "node scripts/gen-data-dictionary.mjs"
```

- [ ] **Bước 8: Chạy** `npm run dict`

Kỳ vọng: in `Đã ghi docs/DATA-DICTIONARY.md` và tạo tệp đó.

- [ ] **Bước 9: Chạy** `node --test src/architecture.test.ts`

Kỳ vọng: toàn bộ test của tệp đạt, 0 lỗi. (lần kiểm khi soạn: 14 tests, 14 đạt, 0 lỗi)

- [ ] **Bước 10: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt, 0 lỗi. (lần kiểm khi soạn: 118 tests, 118 đạt, 0 lỗi)

- [ ] **Bước 11: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 T1: bài kiểm kiến trúc (ADR-0002 điều 8), sổ dữ liệu, sổ đăng ký SQL"
```

---

### Task T2: Mã dùng chung: số điện thoại, bản đồ quyền (ADR-0007), hành động nhật ký

Ba khối nhỏ, thuần logic, không đụng CSDL. `normalizePhone` chuyển sang `shared/` vì cả `staff` (đăng nhập) lẫn `parties` (liên hệ) dùng mà `parties` ở đáy đồ thị nên không được import `staff` (ADR-0002). `permissions.ts` là **một nơi duy nhất** của bản đồ quyền → thao tác (ADR-0007, P6); test `permissions.test.ts` là bản đọc thứ hai của bảng ADR, phủ từng ô. Quyền app (SALES/ACCOUNTING/ADMIN/FIELD) KHÔNG phải vai trò hồ sơ (HDV, tài xế…): vai trò hồ sơ không bao giờ là điều kiện ở đây (R-N1-12).

**Files:**
- Tạo: `src/shared/phone.ts`, `src/shared/phone.test.ts`, `src/shared/permissions.ts`, `src/shared/permissions.test.ts`
- Sửa: `src/modules/staff/phone.ts`, `src/shared/audit-actions.ts`

**Interfaces:**
- Consumes: `normalizePhone` hiện nằm ở `src/modules/staff/phone.ts`; `AUDIT_ACTIONS`/`AUDIT_GROUPS`.
- Produces: `normalizePhone(input): string | null` (shared); `PERMISSION_CODES`, `PermissionCode`, `PERMISSION_LABEL`, `isPermissionCode`, `hasPermission(who, code)`, `MATRIX`, `OperationCode`, `can(who, op, ctx?)`, `isOffice(who)` (`src/shared/permissions.ts`); chín hành động nhật ký mới (`permission_changed`, `party_*`, `location_*`) và nhóm `party`, `location`.

- [ ] **Bước 1: Tạo/ghi `src/shared/phone.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "./phone.ts";

test("chuẩn hoá về 0xxxxxxxxx", () => {
  assert.equal(normalizePhone("0901234567"), "0901234567");
  assert.equal(normalizePhone("0901 234 567"), "0901234567");
  assert.equal(normalizePhone("090.123.4567"), "0901234567");
  assert.equal(normalizePhone("(090) 123-4567"), "0901234567");
  assert.equal(normalizePhone("+84 901 234 567"), "0901234567");
  assert.equal(normalizePhone("84901234567"), "0901234567");
});

test("từ chối số sai", () => {
  for (const bad of ["", "123", "090123456", "09012345678", "+84901", "abc0901234567", "1901234567"]) assert.equal(normalizePhone(bad), null, bad);
});
```

- [ ] **Bước 2: Tạo/ghi `src/shared/permissions.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { MATRIX, PERMISSION_CODES, can, hasPermission, isOffice, isPermissionCode, type OperationCode, type PermissionCode, type Scope } from "./permissions.ts";

// BẢN ĐỌC THỨ HAI của bảng ADR-0007 điều 1, viết lại độc lập từ tài liệu ADR — không suy ra từ MATRIX. Cột: SALES, ACCOUNTING, ADMIN, FIELD.
const ADR: Record<string, [Scope, Scope, Scope, Scope]> = {
  "order.view": ["any", "any", "any", "none"],
  "money.view": ["any", "any", "any", "none"],
  "order.history.view": ["own", "any", "any", "none"],
  "contact.view": ["any", "any", "any", "assigned"],
  "order.create": ["any", "none", "any", "none"],
  "order.modify": ["own", "none", "any", "none"],
  "order.trip.edit": ["ownOrAssigned", "none", "any", "none"],
  "task.progress": ["none", "none", "any", "assigned"],
  "order.money.edit": ["own", "any", "any", "none"],
  "dispatch.assign": ["own", "none", "any", "none"],
  "payment.receive": ["own", "any", "any", "none"],
  "payment.refund": ["none", "any", "any", "none"],
  "invoice.request": ["own", "any", "any", "none"],
  "invoice.issue": ["none", "any", "any", "none"],
  "party.view": ["any", "any", "any", "none"],
  "party.write": ["any", "any", "any", "none"],
  "admin.manage": ["none", "none", "any", "none"],
};
const ORDER: readonly PermissionCode[] = ["SALES", "ACCOUNTING", "ADMIN", "FIELD"];
const OPS = Object.keys(ADR) as OperationCode[];

test("bản đồ quyền khớp TỪNG Ô của ADR-0007 (17 thao tác × 4 quyền)", () => {
  assert.deepEqual([...PERMISSION_CODES], [...ORDER]);
  assert.deepEqual(Object.keys(MATRIX).sort(), Object.keys(ADR).sort(), "MATRIX và ADR phải có cùng danh sách thao tác");
  for (const op of OPS) ORDER.forEach((p, i) => assert.equal(MATRIX[op][p], ADR[op]![i], `${op} × ${p}`));
});

// Kết quả mong đợi của can() cho MỘT quyền, theo phạm vi và ngữ cảnh — bảng chân lý viết tay, không dùng lại logic của file nguồn.
const TRUTH: Record<Scope, { none: boolean; mine: boolean; theirs: boolean; assigned: boolean; mineAndAssigned: boolean }> = {
  //             không ctx  của mình  của người khác  được giao  cả hai
  none: { none: false, mine: false, theirs: false, assigned: false, mineAndAssigned: false },
  own: { none: false, mine: true, theirs: false, assigned: false, mineAndAssigned: true },
  assigned: { none: false, mine: false, theirs: false, assigned: true, mineAndAssigned: true },
  ownOrAssigned: { none: false, mine: true, theirs: false, assigned: true, mineAndAssigned: true },
  any: { none: true, mine: true, theirs: true, assigned: true, mineAndAssigned: true },
};

test("can(): mọi ô × mọi ngữ cảnh cho tài khoản một quyền", () => {
  for (const op of OPS) {
    ORDER.forEach((p, i) => {
      const scope = ADR[op]![i]!;
      const who = { id: "u1", permissions: [p] };
      assert.equal(can(who, op), TRUTH[scope].none, `${op} × ${p} không ctx`);
      assert.equal(can(who, op, { ownerId: "u1" }), TRUTH[scope].mine, `${op} × ${p} của mình`);
      assert.equal(can(who, op, { ownerId: "u2" }), TRUTH[scope].theirs, `${op} × ${p} của người khác`);
      assert.equal(can(who, op, { ownerId: "u2", assigned: true }), TRUTH[scope].assigned, `${op} × ${p} được giao`);
      assert.equal(can(who, op, { ownerId: "u1", assigned: true }), TRUTH[scope].mineAndAssigned, `${op} × ${p} của mình + được giao`);
    });
  }
});

test("nhiều quyền: hợp các ô (SALES + ACCOUNTING sửa tiền đơn người khác được, sửa đơn người khác thì không)", () => {
  const both = { id: "u1", permissions: ["SALES", "ACCOUNTING"] as const };
  assert.equal(can(both, "order.money.edit", { ownerId: "u2" }), true);
  assert.equal(can(both, "order.modify", { ownerId: "u2" }), false);
  assert.equal(can(both, "order.modify", { ownerId: "u1" }), true);
  const sf = { id: "u1", permissions: ["SALES", "FIELD"] as const };
  assert.equal(can(sf, "task.progress", { assigned: true }), true);
  assert.equal(can(sf, "task.progress"), false);
});

test("mặc định từ chối: không quyền, thao tác lạ, chủ đơn thiếu", () => {
  assert.equal(can({ id: "u1", permissions: [] }, "order.view"), false);
  assert.equal(can({ id: "u1", permissions: ["ADMIN"] }, "khong.co" as OperationCode), false);
  assert.equal(can({ id: "u1", permissions: ["SALES"] }, "order.modify", { ownerId: undefined }), false, "thiếu chủ đơn ≠ của mình");
  assert.equal(can({ id: "", permissions: ["SALES"] }, "order.modify", { ownerId: "" }), true, "so sánh id nguyên văn (id rỗng không tồn tại thật)");
});

test("FIELD không xem đơn/tiền/nhật ký; ADMIN làm mọi thao tác của bản đồ", () => {
  const field = { id: "f", permissions: ["FIELD"] as const };
  for (const op of ["order.view", "money.view", "order.history.view", "order.create", "order.modify", "party.view", "admin.manage"] as OperationCode[]) assert.equal(can(field, op, { ownerId: "x" }), false, op);
  const admin = { id: "a", permissions: ["ADMIN"] as const };
  for (const op of OPS) assert.equal(can(admin, op, { ownerId: "x" }), true, `ADMIN × ${op}`);
});

test("isOffice / hasPermission / isPermissionCode", () => {
  assert.equal(isOffice({ id: "a", permissions: ["FIELD"] }), false);
  assert.equal(isOffice({ id: "a", permissions: ["FIELD", "ACCOUNTING"] }), true);
  assert.equal(hasPermission({ permissions: ["ADMIN"] }, "ADMIN"), true);
  assert.equal(hasPermission({ permissions: ["SALES"] }, "ADMIN"), false);
  assert.equal(isPermissionCode("SALES"), true);
  assert.equal(isPermissionCode("sales"), false);
  assert.equal(isPermissionCode(1), false);
});
```

- [ ] **Bước 3: Chạy** `node --test src/shared/phone.test.ts src/shared/permissions.test.ts`

Kỳ vọng: **LỖI** — lỗi nạp module `./phone.ts` / `./permissions.ts` (chưa có).

- [ ] **Bước 4: Tạo/ghi `src/shared/phone.ts`**

```ts
// Chuẩn hoá SĐT Việt Nam về dạng 0xxxxxxxxx. Trả null nếu không hợp lệ. Logic thuần: nằm ở shared/ vì cả `staff` (đăng nhập) và
// `parties` (liên hệ) dùng, mà `parties` ở đáy đồ thị nên không được import `staff` (ADR-0002).
export function normalizePhone(input: string): string | null {
  let p = input.replace(/[\s.\-()]/g, "");
  if (p.startsWith("+84")) p = "0" + p.slice(3);
  else if (p.startsWith("84") && p.length === 11) p = "0" + p.slice(2);
  return /^0\d{9}$/.test(p) ? p : null;
}
```

- [ ] **Bước 5: Tạo/ghi `src/modules/staff/phone.ts`** — `normalizePhone` được xuất lại từ `shared`; `isValidPin` ở lại (chỉ `staff` dùng)

```ts
// `normalizePhone` đã chuyển sang src/shared/phone.ts (parties cũng dùng); ở đây giữ đường import cũ và phần PIN.
export { normalizePhone } from "../../shared/phone.ts";

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{6}$/.test(pin);
}
```

- [ ] **Bước 6: Tạo/ghi `src/shared/permissions.ts`**

```ts
// BẢN ĐỒ QUYỀN → THAO TÁC (ADR-0007) — MỘT NƠI DUY NHẤT trong mã (P6). Logic thuần: server (kiểm quyền) và web/ (ẩn/hiện) cùng import.
// Mặc định từ chối (Điều 8.5): thao tác lạ hoặc ô không khai = không được. Quyền app KHÔNG phải vai trò hồ sơ (ADR-0005): vai trò
// hồ sơ (HDV, tài xế…) không bao giờ là điều kiện ở đây (R-N1-12).

export const PERMISSION_CODES = ["SALES", "ACCOUNTING", "ADMIN", "FIELD"] as const;
export type PermissionCode = (typeof PERMISSION_CODES)[number];

export const PERMISSION_LABEL: Record<PermissionCode, string> = {
  SALES: "Bán hàng",
  ACCOUNTING: "Kế toán",
  ADMIN: "Quản trị",
  FIELD: "Thực hiện",
};

export const isPermissionCode = (v: unknown): v is PermissionCode => typeof v === "string" && (PERMISSION_CODES as readonly string[]).includes(v);

/**
 * Phạm vi của một ô: `none` không được; `own` chỉ đơn của mình (`orders.staff_id`); `assigned` chỉ việc đang được giao (N2);
 * `ownOrAssigned` một trong hai; `any` tất cả.
 */
export type Scope = "none" | "own" | "assigned" | "ownOrAssigned" | "any";

/** Thứ tự cột của mỗi hàng ở MATRIX. */
type Row = Record<PermissionCode, Scope>;
const row = (SALES: Scope, ACCOUNTING: Scope, ADMIN: Scope, FIELD: Scope): Row => ({ SALES, ACCOUNTING, ADMIN, FIELD });

/**
 * Bản đồ ADR-0007 điều 1 (ADMIN làm được mọi thao tác). "Của mình" = người lập đơn.
 * Thao tác của N2/N3 (task.progress, order.money.edit, dispatch.assign, payment.*, invoice.*) có mặt để test khoá bản đồ; chưa có route dùng.
 */
export const MATRIX = {
  "order.view": row("any", "any", "any", "none"), // xem đơn
  "money.view": row("any", "any", "any", "none"), // xem tiền, bảng giá danh mục
  "order.history.view": row("own", "any", "any", "none"), // nhật ký/lịch sử sửa đơn
  "contact.view": row("any", "any", "any", "assigned"), // tên/SĐT khách, điểm đón, giờ
  "order.create": row("any", "none", "any", "none"), // lập đơn (đơn mới luôn là của người lập)
  "order.modify": row("own", "none", "any", "none"), // sửa, xác nhận, huỷ đơn
  "order.trip.edit": row("ownOrAssigned", "none", "any", "none"), // thông tin vận hành sau xác nhận
  "task.progress": row("none", "none", "any", "assigned"), // cập nhật trạng thái việc được giao
  "order.money.edit": row("own", "any", "any", "none"), // số khách, dịch vụ, tiền sau xác nhận
  "dispatch.assign": row("own", "none", "any", "none"), // đặt/đổi người phụ trách và nhiệm vụ
  "payment.receive": row("own", "any", "any", "none"), // ghi thu tiền
  "payment.refund": row("none", "any", "any", "none"), // ghi hoàn tiền
  "invoice.request": row("own", "any", "any", "none"), // ghi yêu cầu hoá đơn + thông tin xuất
  "invoice.issue": row("none", "any", "any", "none"), // đánh dấu hoá đơn đã xuất
  "party.view": row("any", "any", "any", "none"), // xem hồ sơ khách/đại lý
  "party.write": row("any", "any", "any", "none"), // tạo/sửa hồ sơ khách/đại lý
  "admin.manage": row("none", "none", "any", "none"), // tài khoản, quyền, địa điểm, danh mục, vai trò hồ sơ, gộp hồ sơ
} as const satisfies Record<string, Row>;

export type OperationCode = keyof typeof MATRIX;

export interface PermissionHolder {
  readonly id: string;
  readonly permissions: readonly PermissionCode[];
}

/** Ngữ cảnh của một thao tác: `ownerId` = người lập đơn; `assigned` = người dùng đang được giao (N2, do gốc lắp ráp tiêm). */
export interface OperationContext {
  readonly ownerId?: string;
  readonly assigned?: boolean;
}

export const hasPermission = (who: { readonly permissions: readonly PermissionCode[] }, code: PermissionCode): boolean => who.permissions.includes(code);

function allows(scope: Scope | undefined, whoId: string, ctx: OperationContext): boolean {
  const own = ctx.ownerId !== undefined && ctx.ownerId === whoId;
  switch (scope) {
    case "any":
      return true;
    case "own":
      return own;
    case "assigned":
      return ctx.assigned === true;
    case "ownOrAssigned":
      return own || ctx.assigned === true;
    default:
      return false;
  }
}

/** Người dùng được làm thao tác `op` không — hợp các ô của mọi quyền họ có. Thao tác lạ → false. */
export function can(who: PermissionHolder, op: OperationCode, ctx: OperationContext = {}): boolean {
  const cells = (MATRIX as Record<string, Row | undefined>)[op];
  if (!cells) return false;
  return who.permissions.some((p) => allows(cells[p], who.id, ctx));
}

/** Nhân sự "văn phòng": dùng được màn hình/API đơn (mọi quyền trừ chỉ-FIELD). Router dùng cho access "office". */
export const isOffice = (who: PermissionHolder): boolean => can(who, "order.view");
```

- [ ] **Bước 7: Sửa `src/shared/audit-actions.ts`**

Thay đoạn (đúng một chỗ):

```ts
  staff: "Tài khoản",
  catalog: "Dịch vụ",
} as const;
```

bằng:

```ts
  staff: "Tài khoản",
  catalog: "Dịch vụ",
  party: "Hồ sơ",
  location: "Địa điểm",
} as const;
```

Thay đoạn (đúng một chỗ):

```ts
  staff_synced: { label: "Đồng bộ nhân viên từ Sheet", group: "staff" },
```

bằng:

```ts
  staff_synced: { label: "Đồng bộ nhân viên từ Sheet", group: "staff" },
  permission_changed: { label: "Đổi quyền tài khoản", group: "staff" },
  party_created: { label: "Tạo hồ sơ", group: "party" },
  party_updated: { label: "Sửa hồ sơ", group: "party" },
  party_contact_changed: { label: "Đổi thông tin liên hệ", group: "party" },
  party_role_added: { label: "Thêm vai trò hồ sơ", group: "party" },
  party_role_ended: { label: "Kết thúc vai trò hồ sơ", group: "party" },
  party_relationship_changed: { label: "Đổi quan hệ hồ sơ", group: "party" },
  location_created: { label: "Thêm địa điểm", group: "location" },
  location_updated: { label: "Sửa địa điểm", group: "location" },
```

- [ ] **Bước 8: Chạy** `node --test src/shared/phone.test.ts src/shared/permissions.test.ts`

Kỳ vọng: toàn bộ test `phone` và `permissions` đạt. (lần kiểm khi soạn: 8 tests, 8 đạt, 0 lỗi)

- [ ] **Bước 9: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt, 0 lỗi. (lần kiểm khi soạn: 126 tests, 126 đạt, 0 lỗi)

- [ ] **Bước 10: Chạy** `npx tsc --noEmit`

Kỳ vọng: không có lỗi (thoát 0).

- [ ] **Bước 11: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 T2: shared/phone, shared/permissions (bản đồ quyền ADR-0007), hành động nhật ký hồ sơ/địa điểm/quyền"
```

---

### Task T3: Migration `0009` (view nhãn đơn) và `0010` (địa điểm)

Migration **mở rộng** (chỉ thêm): mã cũ vẫn chạy nguyên vẹn. Id 8 địa điểm gieo được sinh MỘT lần và ghi cứng trong migration (script tạm thay đoạn `randomblob` của DDL tham chiếu) để local và remote giống nhau (đặc tả §9). Test dựng schema từ `migrations/*.sql` bằng `node:sqlite` (D1 là SQLite, bật khoá ngoại). Sau khi thêm migration, `architecture.test.ts` sẽ **đỏ** cho tới khi sổ dữ liệu khai đủ bảng/view mới — đó là cơ chế "mặc định từ chối" đang làm việc.

**Files:**
- Tạo: `migrations/0009_orders_label_view.sql`, `migrations/0010_locations.sql` (sinh bằng script tạm), `src/migrations-n1.test.ts`
- Sửa: `docs/data-dictionary.json`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-09-20-n1-schema-reference.sql` (DDL tham chiếu đã duyệt và đã kiểm bằng `n1-schema-verify.py` — **nguồn chi tiết duy nhất** về kiểu/CHECK/chỉ mục/trigger; script tạm chỉ TÁCH nó theo mục); `architecture.test.ts` từ T1.
- Produces: View `v_ord_order_label(id, order_code)` (module orders); bảng `loc_location_type` (4 loại), `loc_location` (8 địa điểm với **id cố định** trong tệp migration) và view `v_loc_location_label`.

- [ ] **Bước 1: Tạo/ghi `src/migrations-n1.test.ts`** — phần đầu: hàm dựng schema + kiểm 0009, 0010

```ts
// Kiểm migration N1 (0009…0012) trên SQLite thật (node:sqlite) với schema dựng từ migrations/*.sql — bản chuyển thể của
// docs/superpowers/specs/2026-09-20-n1-schema-verify.py. D1 là SQLite và bật khoá ngoại, nên đây là lưới đầu tiên; e2e xác nhận lại trên D1 local.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const upTo = (prefix: string) => files.filter((f) => f.slice(0, 4) <= prefix);

function open(list: string[] = files): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-09-20T00:00:00.000Z";
const rows = (db: DatabaseSync, sql: string, ...args: (string | number | null)[]) => db.prepare(sql).all(...args).map((r) => ({ ...r }));
const one = (db: DatabaseSync, sql: string, ...args: (string | number | null)[]) => Object.values(db.prepare(sql).get(...args) ?? {})[0];
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);

// ---------------------------------------------------------------------------------------------------------------------
// 0009 + 0010: orders label view, locations
// ---------------------------------------------------------------------------------------------------------------------
test("0009: v_ord_order_label chỉ có (id, order_code) và trả mã đơn", () => {
  const db = open(upTo("0009"));
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${NOW}')`);
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-1', 's1', 'draft', 'K', '0900000009', '${NOW}', '${NOW}')`);
  assert.deepEqual(db.prepare("PRAGMA table_info(v_ord_order_label)").all().map((c) => c.name), ["id", "order_code"]);
  assert.deepEqual(rows(db, "SELECT id, order_code FROM v_ord_order_label"), [{ id: "o1", order_code: "TD-1" }]);
});

test("0010: 8 địa điểm gieo, id cố định giữa các lần dựng, 4 loại", () => {
  const a = open(upTo("0010"));
  const b = open(upTo("0010"));
  const codes = ["BEN_TAU_NHA_TRANG", "CANG_VINPEARL", "QUAY_VE_01", "QUAY_VE_02", "QUAY_VE_03", "QUAY_VE_04", "VP_2_THANG_4", "VP_TRAN_PHU"];
  assert.deepEqual(rows(a, "SELECT code FROM loc_location ORDER BY code").map((r) => r.code), codes);
  assert.deepEqual(rows(a, "SELECT id, code FROM loc_location ORDER BY code"), rows(b, "SELECT id, code FROM loc_location ORDER BY code"), "id gieo phải giống nhau ở mọi môi trường");
  for (const r of rows(a, "SELECT id FROM loc_location")) assert.match(String(r.id), /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  assert.deepEqual(rows(a, "SELECT code FROM loc_location_type ORDER BY sort_order").map((r) => r.code), ["OFFICE", "TICKET_COUNTER", "PIER", "PORT"]);
  assert.equal(one(a, "SELECT count(*) FROM loc_location WHERE location_type_code = 'TICKET_COUNTER'"), 4);
});

test("0010: ràng buộc địa điểm (mã trùng, mã chữ thường, loại lạ, tên rỗng, cờ active)", () => {
  const db = open(upTo("0010"));
  const ins = (id: string, code: string, name: string, type: string, active = 1) =>
    `INSERT INTO loc_location (id, code, name, location_type_code, active, created_at, updated_at) VALUES ('${id}', '${code}', '${name}', '${type}', ${active}, '${NOW}', '${NOW}')`;
  db.exec(ins("x1", "QUAY_VE_05", "Quầy vé 05", "TICKET_COUNTER"));
  fails(db, ins("x2", "QUAY_VE_05", "Trùng mã", "TICKET_COUNTER"), /UNIQUE/);
  fails(db, ins("x3", "quay_ve_06", "Chữ thường", "TICKET_COUNTER"), /CHECK/);
  fails(db, ins("x4", "LOAI_LA", "Loại lạ", "KHONG_CO"), /FOREIGN KEY/);
  fails(db, ins("x5", "TEN_RONG", "   ", "OFFICE"), /CHECK/);
  fails(db, ins("x6", "CO_LA", "Cờ lạ", "OFFICE", 2), /CHECK/);
});

test("0010: v_loc_location_label chỉ có khoá + nhãn + cờ", () => {
  const db = open(upTo("0010"));
  assert.deepEqual(db.prepare("PRAGMA table_info(v_loc_location_label)").all().map((c) => c.name), ["id", "code", "name", "location_type_code", "active"]);
});
```

- [ ] **Bước 2: Chạy** `node --test src/migrations-n1.test.ts`

Kỳ vọng: **LỖI** — các test 0009/0010 lỗi (chưa có view/bảng).

- [ ] **Bước 3: Tạo tệp tạm `$TMPDIR/build-n1-migrations.mjs` (KHÔNG commit) rồi chạy** 

```js
// MỘT LẦN (không commit): dựng migrations/0009…0012 từ DDL tham chiếu đã duyệt. Chạy từ gốc repo: node <đường dẫn>/build-n1-migrations.mjs [0009 0010 …]
// Nguồn chi tiết duy nhất về kiểu/CHECK/chỉ mục/trigger là docs/superpowers/specs/2026-09-20-n1-schema-reference.sql (P6); script này chỉ TÁCH.
import { readFileSync, writeFileSync } from "node:fs";

const REF = "docs/superpowers/specs/2026-09-20-n1-schema-reference.sql";
const ref = readFileSync(REF, "utf8");

// Tách theo banner "-- ---…\n-- N. tiêu đề\n-- ---…"
const BANNER = /^-- -{100,}\n-- (\d)\. [^\n]*\n-- -{100,}\n/gm;
const marks = [...ref.matchAll(BANNER)].map((m) => ({ n: Number(m[1]), start: m.index, end: m.index + m[0].length }));
if (marks.map((m) => m.n).join() !== "0,1,2,3,4") throw new Error(`Không thấy đủ 5 mục 0–4: ${marks.map((m) => m.n)}`);
const section = (n) => {
  const i = marks.findIndex((m) => m.n === n);
  return ref.slice(marks[i].end, marks[i + 1]?.start ?? ref.length).trim() + "\n";
};

// Địa điểm: id gieo CỐ ĐỊNH trong tệp migration (sinh một lần) để local và remote giống nhau — thay đoạn dùng randomblob.
const LOC_IDS = {
  VP_TRAN_PHU: "d4b573d1-872e-411c-a648-2695c53b0997",
  VP_2_THANG_4: "3e0c3a7a-d489-4c43-8d05-8dd9a1e4ed12",
  QUAY_VE_01: "6f335462-244c-497f-b689-f46d25278fff",
  QUAY_VE_02: "8f62bcba-f659-479e-be86-089f63c3f597",
  QUAY_VE_03: "2e863e6c-fdb5-4907-be7d-496fac57bf3a",
  QUAY_VE_04: "47e10502-9ed5-4bcb-a433-a830f8ba69ee",
  BEN_TAU_NHA_TRANG: "a941dd7d-faab-4098-9ab9-1df7fa6dd551",
  CANG_VINPEARL: "ec67ff94-bb00-4546-842a-aedb5f916b0a",
};
const LOC_SEED = `INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at) VALUES
  ('${LOC_IDS.VP_TRAN_PHU}', 'VP_TRAN_PHU', 'Văn phòng Trần Phú', 'OFFICE', 1, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.VP_2_THANG_4}', 'VP_2_THANG_4', 'Văn phòng 2 tháng 4', 'OFFICE', 2, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.QUAY_VE_01}', 'QUAY_VE_01', 'Quầy vé 01', 'TICKET_COUNTER', 3, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.QUAY_VE_02}', 'QUAY_VE_02', 'Quầy vé 02', 'TICKET_COUNTER', 4, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.QUAY_VE_03}', 'QUAY_VE_03', 'Quầy vé 03', 'TICKET_COUNTER', 5, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.QUAY_VE_04}', 'QUAY_VE_04', 'Quầy vé 04', 'TICKET_COUNTER', 6, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.BEN_TAU_NHA_TRANG}', 'BEN_TAU_NHA_TRANG', 'Bến tàu du lịch Nha Trang', 'PIER', 7, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.CANG_VINPEARL}', 'CANG_VINPEARL', 'Bến cảng Vinpearl', 'PORT', 8, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z');
`;
const LOC_SEED_RE = /INSERT INTO loc_location \(id, code, name, location_type_code, sort_order, created_at, updated_at\)\nSELECT lower\(hex\(randomblob\(16\)\)\)[\s\S]*?\n\) v;\n/;

// Trigger "siết" (đặc tả N1 §9): ở migration 0013 (lần phát hành 2), KHÔNG ở lần 1. Bỏ kèm dòng chú thích đứng ngay trước.
const CONTRACT_TRIGGER =
  /((?:--[^\n]*\n)*)CREATE TRIGGER (?:stf_permission_keep_admin_upd|staff_keep_admin_upd|staff_party_required_ins|staff_party_required_upd)\b[\s\S]*?\bEND;\n/g;

const head = (n, title, from) =>
  `-- Migration ${n} — ${title}. Đặc tả N1 (docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md), ADR-0001/0002/0003/0005/0008.\n` +
  `-- Nguồn: ${from} của docs/superpowers/specs/2026-09-20-n1-schema-reference.sql (bộ kiểm SQLite đã chạy). Chỉ THÊM — mã cũ vẫn chạy nguyên vẹn (expand–contract).\n\n`;

const files = {
  "migrations/0009_orders_label_view.sql": head("0009", "view công bố nhãn đơn (module orders)", "mục 0") + section(0),
  "migrations/0010_locations.sql": head("0010", "địa điểm (module locations)", "mục 1") + section(1).replace(LOC_SEED_RE, LOC_SEED),
  "migrations/0011_parties.sql": head("0011", "hồ sơ, liên hệ, vai trò, quan hệ (module parties)", "mục 2") + section(2),
  "migrations/0012_staff_permissions_party.sql":
    head("0012", "quyền app đa trị + tài khoản trỏ hồ sơ + backfill (module staff)", "mục 3 và 4") +
    (section(3) + "\n" + section(4)).replace(CONTRACT_TRIGGER, "") +
    "\n-- Các trigger bắt buộc party_id (staff_party_required_*) và giữ quản trị viên cuối (stf_permission_keep_admin_upd, staff_keep_admin_upd)\n" +
    "-- KHÔNG nằm ở đây: chúng vào migration 0013 ở LẦN PHÁT HÀNH 2, sau khi Worker mới đã chạy (đặc tả N1 §9; wrangler áp mọi migration chưa áp).\n",
};

// Tham số dòng lệnh: các mã migration cần ghi (vd `0009 0010`); bỏ trống = cả bốn (0009…0012).
const wanted = process.argv.slice(2);
for (const [path, text] of Object.entries(files)) {
  if (wanted.length > 0 && !wanted.some((w) => path.startsWith(`migrations/${w}_`))) continue;
  if (/randomblob|CREATE TRIGGER (?:stf_permission_keep_admin_upd|staff_keep_admin_upd|staff_party_required)/.test(text)) throw new Error(`${path}: còn randomblob hoặc trigger siết`);
  writeFileSync(path, text);
  console.log(`đã ghi ${path} (${text.split("\n").length} dòng)`);
}
```

Chạy từ gốc repo:

```bash
node $TMPDIR/build-n1-migrations.mjs 0009 0010
```

- [ ] **Bước 4: Chạy** `node --test src/migrations-n1.test.ts`

Kỳ vọng: các test 0009/0010 đạt. (lần kiểm khi soạn: 4 tests, 4 đạt, 0 lỗi)

- [ ] **Bước 5: Chạy** `node --test src/architecture.test.ts`

Kỳ vọng: **LỖI** — **LỖI** ở test "mọi bảng/view của schema có trong sổ dữ liệu" — bảng `loc_*` và hai view chưa có trong sổ (cố ý; bước sau sửa).

- [ ] **Bước 6: Sửa `docs/data-dictionary.json`** — thêm hai bảng địa điểm (`loc_location_type` là bảng tra cứu) và hai view công bố

Thêm vào mảng `tables`:

```json
{"name": "loc_location", "module": "locations", "kind": "table"},
{"name": "loc_location_type", "module": "locations", "kind": "lookup"},
```

Thêm vào mảng `views`:

```json
{"name": "v_loc_location_label", "module": "locations", "columns": ["id", "code", "name", "location_type_code", "active"]},
{"name": "v_ord_order_label", "module": "orders", "columns": ["id", "order_code"]},
```

Rồi chạy `npm run dict` để sinh lại `docs/DATA-DICTIONARY.md`.

- [ ] **Bước 7: Chạy** `npm run dict`

Kỳ vọng: sinh lại `docs/DATA-DICTIONARY.md`.

- [ ] **Bước 8: Thêm vào CUỐI `src/architecture.test.ts`** — R-N1-9 (không xoá cứng bảng mới): bài kiểm ranh giới SQL đã có từ T1, ca này chỉ chạy được khi đã có bảng `loc_*`

```ts
test("R-N1-9: câu DELETE trên bảng mới bị bắt (phải đóng hiệu lực hoặc active = 0); UPDATE thì không", () => {
  assert.ok(violations({ module: "locations", sql: "DELETE FROM loc_location WHERE id = ?" }).some((v) => /xoá cứng bảng loc_location/.test(v)));
  assert.deepEqual(violations({ module: "locations", sql: "UPDATE loc_location SET active = 0 WHERE id = ?" }), [], "UPDATE không phải xoá cứng");
});
```

- [ ] **Bước 9: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt, 0 lỗi. (lần kiểm khi soạn: 131 tests, 131 đạt, 0 lỗi)

- [ ] **Bước 10: Chạy** `npm run test:e2e -- platform`

Kỳ vọng: `E2E: 1/1 kịch bản xanh` — `wrangler d1 migrations apply --local` áp được `0009`, `0010` trên D1 local. (lần kiểm khi soạn: `E2E: 1/1 kịch bản xanh`)

- [ ] **Bước 11: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 T3: migration 0009 (v_ord_order_label) và 0010 (loc_*, 8 địa điểm id cố định)"
```

---

### Task T4: Migration `0011` (hồ sơ, liên hệ, vai trò theo nơi, quan hệ)

Mô hình Party–Role–Relationship (ADR-0001): một danh bạ chung, vai trò gắn theo NƠI và theo khoảng ngày dân sự giờ Việt Nam. Ràng buộc ở CSDL: một dòng vai trò/quan hệ MỞ mỗi khoá nghiệp vụ (chỉ mục duy nhất có điều kiện, `IFNULL` cho nơi rỗng) và không chồng lấn khoảng đã đóng (trigger, chỉ mục không làm được); số điện thoại dùng chung giữa hồ sơ là **hợp lệ** (chỉ mục tra cứu không duy nhất). View `v_pty_party_label` có `sort_key` (tên → họ → đệm) để module khác sắp xếp mà không chạm bảng gốc.

**Files:**
- Tạo: `migrations/0011_parties.sql` (script tạm)
- Sửa: `src/migrations-n1.test.ts`, `docs/data-dictionary.json`

**Interfaces:**
- Consumes: DDL tham chiếu mục 2; `loc_location` từ T3 (khoá ngoại `pty_party_role.location_id`, ADR-0008).
- Produces: Bảng `pty_party`, `pty_person`, `pty_organization`, `pty_contact_kind`, `pty_contact_point`, `pty_role_type` (8 vai trò), `pty_party_role`, `pty_relationship_type`, `pty_party_relationship`; bốn trigger chống chồng lấn thời hạn; view `v_pty_party_label(id, display_name, party_kind, active, sort_key)`.

- [ ] **Bước 1: Thêm vào CUỐI `src/migrations-n1.test.ts`** — phần 0011

```ts
// ---------------------------------------------------------------------------------------------------------------------
// 0011: parties
// ---------------------------------------------------------------------------------------------------------------------
const party = (db: DatabaseSync, id: string, kind: "PERSON" | "ORGANIZATION", name: string) =>
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('${id}', '${kind}', '${name}', '${NOW}', '${NOW}')`);
const person = (db: DatabaseSync, id: string, family: string | null, middle: string | null, given: string) => {
  const q = (v: string | null) => (v === null ? "NULL" : `'${v}'`);
  party(db, id, "PERSON", [family, middle, given].filter(Boolean).join(" "));
  db.exec(`INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, updated_at) VALUES ('${id}', ${q(family)}, ${q(middle)}, '${given}', '${NOW}', '${NOW}')`);
};

test("0011: gieo tra cứu (8 vai trò, 2 loại liên hệ, 1 loại quan hệ)", () => {
  const db = open(upTo("0011"));
  assert.deepEqual(rows(db, "SELECT code FROM pty_role_type ORDER BY code").map((r) => r.code), ["AGENT", "BOAT_CAPTAIN", "CUSTOMER", "DRIVER", "GUIDE", "SALES", "STAFF", "ACCOUNTANT"].sort());
  assert.deepEqual(rows(db, "SELECT code FROM pty_contact_kind ORDER BY code").map((r) => r.code), ["EMAIL", "PHONE"]);
  assert.deepEqual(rows(db, "SELECT code FROM pty_relationship_type").map((r) => r.code), ["CONTACT_OF"]);
});

test("0011: hồ sơ — loại lạ, tên rỗng, MST sai độ dài, cá nhân thiếu tên", () => {
  const db = open(upTo("0011"));
  fails(db, `INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('p1', 'ROBOT', 'X', '${NOW}', '${NOW}')`, /CHECK/);
  fails(db, `INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('p2', 'PERSON', '  ', '${NOW}', '${NOW}')`, /CHECK/);
  party(db, "o1", "ORGANIZATION", "Đại lý A");
  fails(db, `INSERT INTO pty_organization (party_id, legal_name, tax_code, created_at, updated_at) VALUES ('o1', 'A', '123', '${NOW}', '${NOW}')`, /CHECK/);
  db.exec(`INSERT INTO pty_organization (party_id, legal_name, tax_code, created_at, updated_at) VALUES ('o1', 'Công ty A', '0312345678', '${NOW}', '${NOW}')`);
  party(db, "p3", "PERSON", "Không tên");
  fails(db, `INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p3', '', '${NOW}', '${NOW}')`, /CHECK|NOT NULL/);
});

test("0011: liên hệ — số dùng chung được, tối đa một liên hệ chính đang mở mỗi loại", () => {
  const db = open(upTo("0011"));
  person(db, "a", "Nguyễn", null, "An");
  person(db, "b", "Trần", null, "Bình");
  const contact = (id: string, party: string, value: string, primary: number, to: string | null = null) =>
    `INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, valid_to_date, created_at, updated_at)
     VALUES ('${id}', '${party}', 'PHONE', '${value}', '${value}', ${primary}, '2026-01-01', ${to === null ? "NULL" : `'${to}'`}, '${NOW}', '${NOW}')`;
  db.exec(contact("c1", "a", "0901234567", 1));
  db.exec(contact("c2", "b", "0901234567", 1)); // cùng số ở hồ sơ khác: hợp lệ (ADR-0001 mục 8)
  fails(db, contact("c3", "a", "0907654321", 1), /UNIQUE/);
  db.exec(contact("c4", "a", "0907654321", 0)); // liên hệ phụ thì được
  db.exec("UPDATE pty_contact_point SET valid_to_date = '2026-06-30' WHERE id = 'c1'");
  db.exec(contact("c5", "a", "0908888888", 1)); // đóng liên hệ chính cũ thì mở được chính mới
  assert.equal(rows(db, "SELECT count(*) AS n FROM pty_contact_point WHERE value_normalized = '0901234567'")[0]!.n, 2);
  fails(db, `INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, valid_from_date, created_at, updated_at) VALUES ('c6','a','PHONE','x','x','2026-02-30','${NOW}','${NOW}')`, /CHECK/);
});

test("0011: vai trò theo nơi — một dòng mở, không chồng lấn, ngày đúng lịch, FK nơi", () => {
  const db = open(upTo("0011"));
  person(db, "a", "Nguyễn", "Tuyên", "Phong");
  const vin = one(db, "SELECT id FROM loc_location WHERE code = 'CANG_VINPEARL'") as string;
  const pier = one(db, "SELECT id FROM loc_location WHERE code = 'BEN_TAU_NHA_TRANG'") as string;
  const role = (id: string, type: string, loc: string | null, from: string, to: string | null) =>
    `INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, updated_at)
     VALUES ('${id}', 'a', '${type}', ${loc === null ? "NULL" : `'${loc}'`}, '${from}', ${to === null ? "NULL" : `'${to}'`}, '${NOW}', '${NOW}')`;
  db.exec(role("r1", "GUIDE", vin, "2026-01-01", "2026-03-31"));
  db.exec(role("r2", "GUIDE", vin, "2026-04-01", null)); // liền kề: hợp lệ
  fails(db, role("r3", "GUIDE", vin, "2026-05-01", null), /UNIQUE|chồng/); // trùng đang mở
  fails(db, role("r4", "GUIDE", vin, "2026-02-01", "2026-02-28"), /chồng/); // chồng khoảng đã đóng
  db.exec(role("r5", "GUIDE", pier, "2026-01-01", null)); // nơi khác: độc lập
  db.exec(role("r6", "STAFF", null, "2026-01-01", null));
  fails(db, role("r7", "STAFF", null, "2026-06-01", null), /UNIQUE|chồng/); // NULL nơi cũng không được trùng đang mở
  fails(db, role("r8", "DRIVER", vin, "2026-02-30", null), /CHECK/); // 30/02
  fails(db, role("r9", "DRIVER", vin, "2026-05-02", "2026-05-01"), /CHECK/); // đảo ngày
  fails(db, role("r10", "DRIVER", "khong-co", "2026-05-01", null), /FOREIGN KEY/);
  fails(db, role("r11", "KHONG_CO", vin, "2026-05-01", null), /FOREIGN KEY/);
});

test("0011: quan hệ hồ sơ — không tự quan hệ, một dòng mở, không chồng lấn", () => {
  const db = open(upTo("0011"));
  person(db, "a", "Nguyễn", null, "An");
  party(db, "org", "ORGANIZATION", "Đại lý A");
  const rel = (id: string, from: string, to: string, f: string, t: string | null) =>
    `INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, valid_to_date, created_at, updated_at)
     VALUES ('${id}', '${from}', '${to}', 'CONTACT_OF', '${f}', ${t === null ? "NULL" : `'${t}'`}, '${NOW}', '${NOW}')`;
  db.exec(rel("q1", "a", "org", "2026-01-01", "2026-06-30"));
  fails(db, rel("q2", "org", "org", "2026-01-01", null), /CHECK/);
  fails(db, rel("q3", "a", "org", "2026-03-01", "2026-04-01"), /chồng/);
  db.exec(rel("q4", "a", "org", "2026-07-01", null));
  fails(db, rel("q5", "a", "org", "2026-08-01", null), /UNIQUE|chồng/);
});

test("0011: v_pty_party_label — khoá + nhãn + loại + cờ + sort_key (tên trước họ)", () => {
  const db = open(upTo("0011"));
  assert.deepEqual(db.prepare("PRAGMA table_info(v_pty_party_label)").all().map((c) => c.name), ["id", "display_name", "party_kind", "active", "sort_key"]);
  person(db, "a", "Nguyễn", "Tuyên", "Phong");
  person(db, "b", null, null, "Hương");
  party(db, "org", "ORGANIZATION", "Đại lý Sao Biển");
  assert.equal(one(db, "SELECT sort_key FROM v_pty_party_label WHERE id = 'a'"), "Phong Nguyễn Tuyên");
  assert.equal(one(db, "SELECT sort_key FROM v_pty_party_label WHERE id = 'b'"), "Hương");
  assert.equal(one(db, "SELECT sort_key FROM v_pty_party_label WHERE id = 'org'"), "Đại lý Sao Biển");
});

test("0011: truy vấn 'ai giữ vai HDV ở Bến cảng Vinpearl hôm nay' (ADR-0001, Điều 6.2)", () => {
  const db = open(upTo("0011"));
  person(db, "a", "Nguyễn", "Tuyên", "Phong");
  db.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at)
           SELECT 'r1', 'a', 'GUIDE', id, '2026-09-01', '${NOW}', '${NOW}' FROM loc_location WHERE code = 'CANG_VINPEARL'`);
  const q = `SELECT pl.display_name AS name FROM pty_party_role pr
             JOIN v_loc_location_label l ON l.id = pr.location_id JOIN v_pty_party_label pl ON pl.id = pr.party_id
             WHERE pr.role_type_code = 'GUIDE' AND l.code = 'CANG_VINPEARL' AND pr.valid_from_date <= ? AND (pr.valid_to_date IS NULL OR pr.valid_to_date >= ?)`;
  assert.deepEqual(rows(db, q, "2026-09-25", "2026-09-25"), [{ name: "Nguyễn Tuyên Phong" }]);
  assert.deepEqual(rows(db, q, "2026-08-31", "2026-08-31"), [], "trước ngày hiệu lực thì không có ai");
});
```

- [ ] **Bước 2: Chạy** `node --test src/migrations-n1.test.ts`

Kỳ vọng: **LỖI** — các test 0011 lỗi (chưa có bảng `pty_*`).

- [ ] **Bước 3: Tạo tệp tạm `$TMPDIR/build-n1-migrations.mjs` (KHÔNG commit) rồi chạy** 

```js
// MỘT LẦN (không commit): dựng migrations/0009…0012 từ DDL tham chiếu đã duyệt. Chạy từ gốc repo: node <đường dẫn>/build-n1-migrations.mjs [0009 0010 …]
// Nguồn chi tiết duy nhất về kiểu/CHECK/chỉ mục/trigger là docs/superpowers/specs/2026-09-20-n1-schema-reference.sql (P6); script này chỉ TÁCH.
import { readFileSync, writeFileSync } from "node:fs";

const REF = "docs/superpowers/specs/2026-09-20-n1-schema-reference.sql";
const ref = readFileSync(REF, "utf8");

// Tách theo banner "-- ---…\n-- N. tiêu đề\n-- ---…"
const BANNER = /^-- -{100,}\n-- (\d)\. [^\n]*\n-- -{100,}\n/gm;
const marks = [...ref.matchAll(BANNER)].map((m) => ({ n: Number(m[1]), start: m.index, end: m.index + m[0].length }));
if (marks.map((m) => m.n).join() !== "0,1,2,3,4") throw new Error(`Không thấy đủ 5 mục 0–4: ${marks.map((m) => m.n)}`);
const section = (n) => {
  const i = marks.findIndex((m) => m.n === n);
  return ref.slice(marks[i].end, marks[i + 1]?.start ?? ref.length).trim() + "\n";
};

// Địa điểm: id gieo CỐ ĐỊNH trong tệp migration (sinh một lần) để local và remote giống nhau — thay đoạn dùng randomblob.
const LOC_IDS = {
  VP_TRAN_PHU: "d4b573d1-872e-411c-a648-2695c53b0997",
  VP_2_THANG_4: "3e0c3a7a-d489-4c43-8d05-8dd9a1e4ed12",
  QUAY_VE_01: "6f335462-244c-497f-b689-f46d25278fff",
  QUAY_VE_02: "8f62bcba-f659-479e-be86-089f63c3f597",
  QUAY_VE_03: "2e863e6c-fdb5-4907-be7d-496fac57bf3a",
  QUAY_VE_04: "47e10502-9ed5-4bcb-a433-a830f8ba69ee",
  BEN_TAU_NHA_TRANG: "a941dd7d-faab-4098-9ab9-1df7fa6dd551",
  CANG_VINPEARL: "ec67ff94-bb00-4546-842a-aedb5f916b0a",
};
const LOC_SEED = `INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at) VALUES
  ('${LOC_IDS.VP_TRAN_PHU}', 'VP_TRAN_PHU', 'Văn phòng Trần Phú', 'OFFICE', 1, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.VP_2_THANG_4}', 'VP_2_THANG_4', 'Văn phòng 2 tháng 4', 'OFFICE', 2, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.QUAY_VE_01}', 'QUAY_VE_01', 'Quầy vé 01', 'TICKET_COUNTER', 3, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.QUAY_VE_02}', 'QUAY_VE_02', 'Quầy vé 02', 'TICKET_COUNTER', 4, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.QUAY_VE_03}', 'QUAY_VE_03', 'Quầy vé 03', 'TICKET_COUNTER', 5, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.QUAY_VE_04}', 'QUAY_VE_04', 'Quầy vé 04', 'TICKET_COUNTER', 6, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.BEN_TAU_NHA_TRANG}', 'BEN_TAU_NHA_TRANG', 'Bến tàu du lịch Nha Trang', 'PIER', 7, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.CANG_VINPEARL}', 'CANG_VINPEARL', 'Bến cảng Vinpearl', 'PORT', 8, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z');
`;
const LOC_SEED_RE = /INSERT INTO loc_location \(id, code, name, location_type_code, sort_order, created_at, updated_at\)\nSELECT lower\(hex\(randomblob\(16\)\)\)[\s\S]*?\n\) v;\n/;

// Trigger "siết" (đặc tả N1 §9): ở migration 0013 (lần phát hành 2), KHÔNG ở lần 1. Bỏ kèm dòng chú thích đứng ngay trước.
const CONTRACT_TRIGGER =
  /((?:--[^\n]*\n)*)CREATE TRIGGER (?:stf_permission_keep_admin_upd|staff_keep_admin_upd|staff_party_required_ins|staff_party_required_upd)\b[\s\S]*?\bEND;\n/g;

const head = (n, title, from) =>
  `-- Migration ${n} — ${title}. Đặc tả N1 (docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md), ADR-0001/0002/0003/0005/0008.\n` +
  `-- Nguồn: ${from} của docs/superpowers/specs/2026-09-20-n1-schema-reference.sql (bộ kiểm SQLite đã chạy). Chỉ THÊM — mã cũ vẫn chạy nguyên vẹn (expand–contract).\n\n`;

const files = {
  "migrations/0009_orders_label_view.sql": head("0009", "view công bố nhãn đơn (module orders)", "mục 0") + section(0),
  "migrations/0010_locations.sql": head("0010", "địa điểm (module locations)", "mục 1") + section(1).replace(LOC_SEED_RE, LOC_SEED),
  "migrations/0011_parties.sql": head("0011", "hồ sơ, liên hệ, vai trò, quan hệ (module parties)", "mục 2") + section(2),
  "migrations/0012_staff_permissions_party.sql":
    head("0012", "quyền app đa trị + tài khoản trỏ hồ sơ + backfill (module staff)", "mục 3 và 4") +
    (section(3) + "\n" + section(4)).replace(CONTRACT_TRIGGER, "") +
    "\n-- Các trigger bắt buộc party_id (staff_party_required_*) và giữ quản trị viên cuối (stf_permission_keep_admin_upd, staff_keep_admin_upd)\n" +
    "-- KHÔNG nằm ở đây: chúng vào migration 0013 ở LẦN PHÁT HÀNH 2, sau khi Worker mới đã chạy (đặc tả N1 §9; wrangler áp mọi migration chưa áp).\n",
};

// Tham số dòng lệnh: các mã migration cần ghi (vd `0009 0010`); bỏ trống = cả bốn (0009…0012).
const wanted = process.argv.slice(2);
for (const [path, text] of Object.entries(files)) {
  if (wanted.length > 0 && !wanted.some((w) => path.startsWith(`migrations/${w}_`))) continue;
  if (/randomblob|CREATE TRIGGER (?:stf_permission_keep_admin_upd|staff_keep_admin_upd|staff_party_required)/.test(text)) throw new Error(`${path}: còn randomblob hoặc trigger siết`);
  writeFileSync(path, text);
  console.log(`đã ghi ${path} (${text.split("\n").length} dòng)`);
}
```

Chạy từ gốc repo:

```bash
node $TMPDIR/build-n1-migrations.mjs 0011
```

- [ ] **Bước 4: Chạy** `node --test src/migrations-n1.test.ts`

Kỳ vọng: toàn bộ test 0009/0010/0011 đạt. (lần kiểm khi soạn: 11 tests, 11 đạt, 0 lỗi)

- [ ] **Bước 5: Sửa `docs/data-dictionary.json`** — chín bảng `pty_*` (ba bảng tra cứu) và view công bố

Thêm vào mảng `tables`:

```json
{"name": "pty_contact_kind", "module": "parties", "kind": "lookup"},
{"name": "pty_contact_point", "module": "parties", "kind": "table"},
{"name": "pty_organization", "module": "parties", "kind": "table"},
{"name": "pty_party", "module": "parties", "kind": "table"},
{"name": "pty_party_relationship", "module": "parties", "kind": "table"},
{"name": "pty_party_role", "module": "parties", "kind": "table"},
{"name": "pty_person", "module": "parties", "kind": "table"},
{"name": "pty_relationship_type", "module": "parties", "kind": "lookup"},
{"name": "pty_role_type", "module": "parties", "kind": "lookup"},
```

Thêm vào mảng `views`:

```json
{"name": "v_pty_party_label", "module": "parties", "columns": ["id", "display_name", "party_kind", "active", "sort_key"]},
```

Rồi chạy `npm run dict` để sinh lại `docs/DATA-DICTIONARY.md`.

- [ ] **Bước 6: Chạy** `npm run dict`

Kỳ vọng: sinh lại `docs/DATA-DICTIONARY.md`.

- [ ] **Bước 7: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt, 0 lỗi. (lần kiểm khi soạn: 138 tests, 138 đạt, 0 lỗi)

- [ ] **Bước 8: Chạy** `npm run test:e2e -- platform`

Kỳ vọng: `E2E: 1/1 kịch bản xanh` (D1 local áp được `0011`). (lần kiểm khi soạn: `E2E: 1/1 kịch bản xanh`)

- [ ] **Bước 9: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 T4: migration 0011 (pty_*: hồ sơ, liên hệ, vai trò theo nơi, quan hệ)"
```

---

### Task T5: Migration `0012` (quyền app đa trị, `staff.party_id`, backfill)

Đây là migration **mở rộng cuối** của lần phát hành 1. Nó KHÔNG chứa trigger bắt buộc `party_id` và trigger "luôn còn quản trị viên": hai nhóm đó vào `0013` ở LẦN PHÁT HÀNH 2 (Task B5), vì `wrangler d1 migrations apply` áp mọi migration chưa áp — nếu trigger có mặt ngay bây giờ, mã cũ (`INSERT INTO staff` không có `party_id`) sẽ hỏng trong khoảng giữa lúc áp migration và lúc deploy Worker. View dùng `LEFT JOIN` để tài khoản do mã cũ tạo trong khoảng đó (chưa có hồ sơ) không làm biến mất đơn của họ khỏi danh sách (nhãn dự phòng "(chưa có hồ sơ)"). Backfill: tên tách theo cùng quy tắc với `splitPersonName` (tên = từ cuối, họ = từ đầu, đệm = giữa), vai STAFF theo NGÀY VIỆT NAM, quyền `sales → SALES`, `admin → ADMIN`; SĐT đăng nhập KHÔNG sao chép thành liên hệ (ADR-0001 mục 5).

**Files:**
- Tạo: `migrations/0012_staff_permissions_party.sql` (script tạm)
- Sửa: `src/migrations-n1.test.ts`, `docs/data-dictionary.json`

**Interfaces:**
- Consumes: DDL tham chiếu mục 3 và 4; `pty_*` từ T4.
- Produces: `stf_permission_type` (SALES, ACCOUNTING, ADMIN, FIELD), `stf_permission`; cột `staff.party_id` (**không dựng lại `staff`** — ADR-0005) + chỉ mục duy nhất `staff_party_uq`; view `v_stf_staff_label(id, label, active, party_id)` (**LEFT JOIN**); backfill mỗi tài khoản có sẵn thành hồ sơ PERSON + vai STAFF + quyền.

- [ ] **Bước 1: Thêm vào CUỐI `src/migrations-n1.test.ts`** — phần 0012 và kiểm hai pha

```ts
// ---------------------------------------------------------------------------------------------------------------------
// 0012: staff permissions + party_id + backfill
// ---------------------------------------------------------------------------------------------------------------------
function seedStaff(db: DatabaseSync): void {
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES
    ('s-admin', 'Nguyễn Tuyên Phong', '0845256256', 'x', 'admin', 1, '2026-09-19T17:30:00.000Z'),
    ('s-sales', ' Trần Văn Bình ', '0901000002', 'x', 'sales', 1, '2026-09-19T05:00:00.000Z'),
    ('s-one', 'Hương', '0901000003', 'x', 'sales', 0, '2026-09-19T05:00:00.000Z')`);
}

test("0012: backfill — mỗi tài khoản có hồ sơ PERSON, tên tách đúng, vai STAFF, quyền, party_id", () => {
  const db = open(upTo("0011"));
  seedStaff(db);
  db.exec(readFileSync(new URL(files.find((f) => f.startsWith("0012"))!, DIR), "utf8"));
  assert.equal(one(db, "SELECT count(*) FROM staff WHERE party_id IS NULL"), 0);
  assert.equal(one(db, "SELECT count(*) FROM pty_party WHERE party_kind = 'PERSON'"), 3);
  const names = rows(db, "SELECT s.id, p.family_name AS family, p.middle_name AS middle, p.given_name AS given, y.display_name AS display FROM staff s JOIN pty_person p ON p.party_id = s.party_id JOIN pty_party y ON y.id = s.party_id ORDER BY s.id");
  assert.deepEqual(names, [
    { id: "s-admin", family: "Nguyễn", middle: "Tuyên", given: "Phong", display: "Nguyễn Tuyên Phong" },
    { id: "s-one", family: null, middle: null, given: "Hương", display: "Hương" },
    { id: "s-sales", family: "Trần", middle: "Văn", given: "Bình", display: "Trần Văn Bình" }, // khoảng trắng đầu/cuối được cắt
  ]);
});

test("0012: backfill — vai STAFF theo NGÀY VIỆT NAM, quyền sales→SALES / admin→ADMIN, không sao chép SĐT đăng nhập", () => {
  const db = open(upTo("0011"));
  seedStaff(db);
  db.exec(readFileSync(new URL(files.find((f) => f.startsWith("0012"))!, DIR), "utf8"));
  assert.equal(one(db, "SELECT valid_from_date FROM pty_party_role WHERE party_id = 'pty-s-admin' AND role_type_code = 'STAFF'"), "2026-09-20", "17:30 UTC ngày 19 = 00:30 ngày 20 giờ VN");
  assert.equal(one(db, "SELECT location_id FROM pty_party_role WHERE party_id = 'pty-s-admin'"), null);
  assert.deepEqual(rows(db, "SELECT staff_id, permission_type_code FROM stf_permission WHERE valid_to_at IS NULL ORDER BY staff_id"), [
    { staff_id: "s-admin", permission_type_code: "ADMIN" },
    { staff_id: "s-one", permission_type_code: "SALES" },
    { staff_id: "s-sales", permission_type_code: "SALES" },
  ]);
  assert.equal(one(db, "SELECT count(*) FROM pty_contact_point"), 0, "SĐT đăng nhập ≠ SĐT liên hệ (ADR-0001 mục 5)");
});

test("0012: ràng buộc tài khoản — một hồ sơ một tài khoản, quyền lạ/trùng, thu hồi trước hiệu lực, FK sạch", () => {
  const db = open(upTo("0011"));
  seedStaff(db);
  db.exec(readFileSync(new URL(files.find((f) => f.startsWith("0012"))!, DIR), "utf8"));
  fails(db, "UPDATE staff SET party_id = 'pty-s-admin' WHERE id = 's-sales'", /UNIQUE/);
  fails(db, "UPDATE staff SET party_id = 'khong-co' WHERE id = 's-sales'", /FOREIGN KEY/);
  const perm = (id: string, code: string, from: string, to: string | null = null) =>
    `INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, valid_to_at, created_at, updated_at) VALUES ('${id}', 's-sales', '${code}', '${from}', ${to === null ? "NULL" : `'${to}'`}, '${NOW}', '${NOW}')`;
  db.exec(perm("p1", "FIELD", "2026-09-20T00:00:00.000Z"));
  fails(db, perm("p2", "FIELD", "2026-09-21T00:00:00.000Z"), /UNIQUE/);
  fails(db, perm("p3", "KHONG_CO", "2026-09-20T00:00:00.000Z"), /FOREIGN KEY/);
  fails(db, perm("p4", "ACCOUNTING", "2026-09-20T00:00:00.000Z", "2026-09-19T00:00:00.000Z"), /CHECK/);
  db.exec("UPDATE stf_permission SET valid_to_at = '2026-10-01T00:00:00.000Z' WHERE id = 'p1'");
  db.exec(perm("p5", "FIELD", "2026-10-01T00:00:00.000Z")); // thu hồi rồi cấp lại = dòng mới
  assert.deepEqual(rows(db, "PRAGMA foreign_key_check"), []);
  assert.deepEqual(rows(db, "SELECT code FROM stf_permission_type ORDER BY sort_order").map((r) => r.code), ["SALES", "ACCOUNTING", "ADMIN", "FIELD"]);
});

test("0012 (expand): mã CŨ vẫn chạy — INSERT staff không party_id, đổi role/full_name, ngưng tài khoản; tài khoản chưa có hồ sơ KHÔNG rơi khỏi view", () => {
  const db = open(upTo("0012"));
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at) VALUES ('s-old', 'Lê Thị Hoa', '0900000030', 'x', 'admin', 1, '${NOW}')`);
  db.exec("UPDATE staff SET role = 'sales', full_name = 'Lê Hoa' WHERE id = 's-old'");
  db.exec("UPDATE staff SET active = 0 WHERE id = 's-old'");
  assert.equal(rows(db, "SELECT * FROM staff WHERE id = 's-old'").length, 1);
  assert.deepEqual(rows(db, "SELECT id, label, party_id FROM v_stf_staff_label WHERE id = 's-old'"), [{ id: "s-old", label: "(chưa có hồ sơ)", party_id: null }]);
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o1', 'TD-WIN', 's-old', 'draft', 'K', '0900000009', '${NOW}', '${NOW}')`);
  assert.deepEqual(rows(db, "SELECT o.order_code, s.label FROM orders o JOIN v_stf_staff_label s ON s.id = o.staff_id"), [{ order_code: "TD-WIN", label: "(chưa có hồ sơ)" }]);
  assert.deepEqual(db.prepare("PRAGMA table_info(v_stf_staff_label)").all().map((c) => c.name), ["id", "label", "active", "party_id"]);
});

test("hai pha: các migration mở rộng KHÔNG chứa trigger siết (0013 mới có, ở lần phát hành 2)", () => {
  const db = open();
  const triggers = rows(db, "SELECT name FROM sqlite_master WHERE type = 'trigger' AND (name LIKE 'staff_%' OR name LIKE 'stf_%')").map((r) => r.name);
  const hasContract = files.some((f) => f.startsWith("0013"));
  if (!hasContract) assert.deepEqual(triggers, [], "trước 0013 không được có trigger siết");
});
```

- [ ] **Bước 2: Chạy** `node --test src/migrations-n1.test.ts`

Kỳ vọng: **LỖI** — các test 0012 lỗi (chưa có `stf_*`, `party_id`).

- [ ] **Bước 3: Tạo tệp tạm `$TMPDIR/build-n1-migrations.mjs` (KHÔNG commit) rồi chạy** 

```js
// MỘT LẦN (không commit): dựng migrations/0009…0012 từ DDL tham chiếu đã duyệt. Chạy từ gốc repo: node <đường dẫn>/build-n1-migrations.mjs [0009 0010 …]
// Nguồn chi tiết duy nhất về kiểu/CHECK/chỉ mục/trigger là docs/superpowers/specs/2026-09-20-n1-schema-reference.sql (P6); script này chỉ TÁCH.
import { readFileSync, writeFileSync } from "node:fs";

const REF = "docs/superpowers/specs/2026-09-20-n1-schema-reference.sql";
const ref = readFileSync(REF, "utf8");

// Tách theo banner "-- ---…\n-- N. tiêu đề\n-- ---…"
const BANNER = /^-- -{100,}\n-- (\d)\. [^\n]*\n-- -{100,}\n/gm;
const marks = [...ref.matchAll(BANNER)].map((m) => ({ n: Number(m[1]), start: m.index, end: m.index + m[0].length }));
if (marks.map((m) => m.n).join() !== "0,1,2,3,4") throw new Error(`Không thấy đủ 5 mục 0–4: ${marks.map((m) => m.n)}`);
const section = (n) => {
  const i = marks.findIndex((m) => m.n === n);
  return ref.slice(marks[i].end, marks[i + 1]?.start ?? ref.length).trim() + "\n";
};

// Địa điểm: id gieo CỐ ĐỊNH trong tệp migration (sinh một lần) để local và remote giống nhau — thay đoạn dùng randomblob.
const LOC_IDS = {
  VP_TRAN_PHU: "d4b573d1-872e-411c-a648-2695c53b0997",
  VP_2_THANG_4: "3e0c3a7a-d489-4c43-8d05-8dd9a1e4ed12",
  QUAY_VE_01: "6f335462-244c-497f-b689-f46d25278fff",
  QUAY_VE_02: "8f62bcba-f659-479e-be86-089f63c3f597",
  QUAY_VE_03: "2e863e6c-fdb5-4907-be7d-496fac57bf3a",
  QUAY_VE_04: "47e10502-9ed5-4bcb-a433-a830f8ba69ee",
  BEN_TAU_NHA_TRANG: "a941dd7d-faab-4098-9ab9-1df7fa6dd551",
  CANG_VINPEARL: "ec67ff94-bb00-4546-842a-aedb5f916b0a",
};
const LOC_SEED = `INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at) VALUES
  ('${LOC_IDS.VP_TRAN_PHU}', 'VP_TRAN_PHU', 'Văn phòng Trần Phú', 'OFFICE', 1, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.VP_2_THANG_4}', 'VP_2_THANG_4', 'Văn phòng 2 tháng 4', 'OFFICE', 2, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.QUAY_VE_01}', 'QUAY_VE_01', 'Quầy vé 01', 'TICKET_COUNTER', 3, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.QUAY_VE_02}', 'QUAY_VE_02', 'Quầy vé 02', 'TICKET_COUNTER', 4, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.QUAY_VE_03}', 'QUAY_VE_03', 'Quầy vé 03', 'TICKET_COUNTER', 5, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.QUAY_VE_04}', 'QUAY_VE_04', 'Quầy vé 04', 'TICKET_COUNTER', 6, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.BEN_TAU_NHA_TRANG}', 'BEN_TAU_NHA_TRANG', 'Bến tàu du lịch Nha Trang', 'PIER', 7, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
  ('${LOC_IDS.CANG_VINPEARL}', 'CANG_VINPEARL', 'Bến cảng Vinpearl', 'PORT', 8, '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z');
`;
const LOC_SEED_RE = /INSERT INTO loc_location \(id, code, name, location_type_code, sort_order, created_at, updated_at\)\nSELECT lower\(hex\(randomblob\(16\)\)\)[\s\S]*?\n\) v;\n/;

// Trigger "siết" (đặc tả N1 §9): ở migration 0013 (lần phát hành 2), KHÔNG ở lần 1. Bỏ kèm dòng chú thích đứng ngay trước.
const CONTRACT_TRIGGER =
  /((?:--[^\n]*\n)*)CREATE TRIGGER (?:stf_permission_keep_admin_upd|staff_keep_admin_upd|staff_party_required_ins|staff_party_required_upd)\b[\s\S]*?\bEND;\n/g;

const head = (n, title, from) =>
  `-- Migration ${n} — ${title}. Đặc tả N1 (docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md), ADR-0001/0002/0003/0005/0008.\n` +
  `-- Nguồn: ${from} của docs/superpowers/specs/2026-09-20-n1-schema-reference.sql (bộ kiểm SQLite đã chạy). Chỉ THÊM — mã cũ vẫn chạy nguyên vẹn (expand–contract).\n\n`;

const files = {
  "migrations/0009_orders_label_view.sql": head("0009", "view công bố nhãn đơn (module orders)", "mục 0") + section(0),
  "migrations/0010_locations.sql": head("0010", "địa điểm (module locations)", "mục 1") + section(1).replace(LOC_SEED_RE, LOC_SEED),
  "migrations/0011_parties.sql": head("0011", "hồ sơ, liên hệ, vai trò, quan hệ (module parties)", "mục 2") + section(2),
  "migrations/0012_staff_permissions_party.sql":
    head("0012", "quyền app đa trị + tài khoản trỏ hồ sơ + backfill (module staff)", "mục 3 và 4") +
    (section(3) + "\n" + section(4)).replace(CONTRACT_TRIGGER, "") +
    "\n-- Các trigger bắt buộc party_id (staff_party_required_*) và giữ quản trị viên cuối (stf_permission_keep_admin_upd, staff_keep_admin_upd)\n" +
    "-- KHÔNG nằm ở đây: chúng vào migration 0013 ở LẦN PHÁT HÀNH 2, sau khi Worker mới đã chạy (đặc tả N1 §9; wrangler áp mọi migration chưa áp).\n",
};

// Tham số dòng lệnh: các mã migration cần ghi (vd `0009 0010`); bỏ trống = cả bốn (0009…0012).
const wanted = process.argv.slice(2);
for (const [path, text] of Object.entries(files)) {
  if (wanted.length > 0 && !wanted.some((w) => path.startsWith(`migrations/${w}_`))) continue;
  if (/randomblob|CREATE TRIGGER (?:stf_permission_keep_admin_upd|staff_keep_admin_upd|staff_party_required)/.test(text)) throw new Error(`${path}: còn randomblob hoặc trigger siết`);
  writeFileSync(path, text);
  console.log(`đã ghi ${path} (${text.split("\n").length} dòng)`);
}
```

Chạy từ gốc repo:

```bash
node $TMPDIR/build-n1-migrations.mjs 0012
```

- [ ] **Bước 4: Chạy** `node --test src/migrations-n1.test.ts`

Kỳ vọng: toàn bộ test migration N1 đạt. (lần kiểm khi soạn: 16 tests, 16 đạt, 0 lỗi)

- [ ] **Bước 5: Sửa `docs/data-dictionary.json`** — hai bảng quyền và view nhãn nhân sự

Thêm vào mảng `tables`:

```json
{"name": "stf_permission", "module": "staff", "kind": "table"},
{"name": "stf_permission_type", "module": "staff", "kind": "lookup"},
```

Thêm vào mảng `views`:

```json
{"name": "v_stf_staff_label", "module": "staff", "columns": ["id", "label", "active", "party_id"]},
```

Rồi chạy `npm run dict` để sinh lại `docs/DATA-DICTIONARY.md`.

- [ ] **Bước 6: Chạy** `npm run dict`

Kỳ vọng: sinh lại `docs/DATA-DICTIONARY.md`.

- [ ] **Bước 7: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt, 0 lỗi. (lần kiểm khi soạn: 143 tests, 143 đạt, 0 lỗi)

- [ ] **Bước 8: Chạy** `npm run test:e2e`

Kỳ vọng: `E2E: 7/7 kịch bản xanh` — **bằng chứng mã cũ vẫn chạy trên schema mới** (e2e nạp tài khoản bằng `insertStaffSql` CŨ, không có `party_id`). (lần kiểm khi soạn: `E2E: 7/7 kịch bản xanh`)

- [ ] **Bước 9: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 T5: migration 0012 (stf_permission*, staff.party_id, backfill; trigger siết để lần phát hành 2)"
```

---

### Task T6: Module `locations` (địa điểm): luật, SQL, API, e2e

Module đáy của đồ thị (chỉ phụ thuộc `audit`). `repository.ts` import bằng đuôi `.ts` và mọi câu SQL đi qua `defineSql` để `architecture.test.ts` (điều 8(b)) phân tích được; sau task này `STRICT` có `locations`. Sửa địa điểm dùng khoá lạc quan: câu `UPDATE … WHERE id = ? AND updated_at = ?` và dòng nhật ký `changes() > 0` — bên thua nhận 409 và **không** để lại dòng nhật ký.

**Files:**
- Tạo: `src/modules/locations/{rules.ts,rules.test.ts,repository.ts,index.ts}`, `tests/e2e/locations.mjs`
- Sửa: `src/shared/contracts.ts`, `src/index.ts`, `src/architecture.test.ts`, `tests/e2e/run.mjs`

**Interfaces:**
- Consumes: `loc_*` từ T3; `auditStatement` của module audit; `route`, `json`, `error`, `readJson`, `UUID_RE` của `shared`; `defineSql` (T1).
- Produces: `GET /api/locations` (mọi tài khoản đăng nhập), `POST /api/locations`, `PUT /api/locations/:id` (chỉ ADMIN, khoá lạc quan `expectedUpdatedAt`, ngưng dùng thay cho xoá); DTO `LocationDto`, `LocationTypeDto`, `LocationListResponse`, `LocationResponse`; module `locations` đã đăng ký ở `src/index.ts` và là module **nghiêm** (SQL qua `defineSql`).

- [ ] **Bước 1: Tạo/ghi `src/modules/locations/rules.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLocationCreate, validateLocationUpdate } from "./rules.ts";

const ok = { code: "QUAY_VE_05", name: "  Quầy   vé 05 ", locationTypeCode: "TICKET_COUNTER" };

test("tạo: hợp lệ — chuẩn hoá tên, mặc định địa chỉ null và thứ tự 0", () => {
  const r = validateLocationCreate(ok);
  assert.deepEqual(r, { ok: true, value: { code: "QUAY_VE_05", name: "Quầy vé 05", locationTypeCode: "TICKET_COUNTER", address: null, sortOrder: 0 } });
  const withAddr = validateLocationCreate({ ...ok, address: " 12 Trần Phú ", sortOrder: 9 });
  assert.equal(withAddr.ok && withAddr.value.address, "12 Trần Phú");
});

test("tạo: từ chối mã sai, tên rỗng/quá dài, loại sai, địa chỉ quá dài, thứ tự sai", () => {
  const bad: [Record<string, unknown> | null, RegExp][] = [
    [null, /không hợp lệ/],
    [{ ...ok, code: "quay_ve" }, /Mã địa điểm/],
    [{ ...ok, code: "Q" }, /Mã địa điểm/],
    [{ ...ok, code: "1ABC" }, /Mã địa điểm/],
    [{ ...ok, name: "   " }, /Tên địa điểm/],
    [{ ...ok, name: "x".repeat(101) }, /tối đa 100/],
    [{ ...ok, locationTypeCode: "office" }, /Loại địa điểm/],
    [{ ...ok, address: "x".repeat(301) }, /tối đa 300/],
    [{ ...ok, sortOrder: -1 }, /Thứ tự/],
    [{ ...ok, sortOrder: 1.5 }, /Thứ tự/],
    [{ ...ok, sortOrder: "3" }, /Thứ tự/],
  ];
  for (const [body, re] of bad) {
    const r = validateLocationCreate(body);
    assert.ok(!r.ok && re.test(r.message), JSON.stringify(body) + " → " + JSON.stringify(r));
  }
});

test("sửa: bắt buộc expectedUpdatedAt và active kiểu boolean; mã không đổi được", () => {
  const body = { name: "Quầy vé 05", locationTypeCode: "TICKET_COUNTER", active: false, expectedUpdatedAt: "2026-09-20T00:00:00.000Z", code: "BO_QUA" };
  const r = validateLocationUpdate(body);
  assert.deepEqual(r, { ok: true, value: { name: "Quầy vé 05", locationTypeCode: "TICKET_COUNTER", address: null, sortOrder: 0, active: false, expectedUpdatedAt: "2026-09-20T00:00:00.000Z" } });
  assert.ok(!("code" in (r.ok ? r.value : {})), "mã là định danh, không nằm trong dữ liệu sửa");
  assert.ok(!validateLocationUpdate({ ...body, expectedUpdatedAt: undefined }).ok);
  assert.ok(!validateLocationUpdate({ ...body, active: "false" }).ok);
});
```

- [ ] **Bước 2: Chạy** `node --test src/modules/locations/rules.test.ts`

Kỳ vọng: **LỖI** — lỗi nạp module `./rules.ts`.

- [ ] **Bước 3: Tạo/ghi `src/modules/locations/rules.ts`**

```ts
// Luật thuần của module locations: kiểm đầu vào địa điểm. Không I/O; import kiểu/hằng bằng đuôi .ts (node --test chạy trực tiếp).
export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export interface LocationCreate {
  code: string;
  name: string;
  locationTypeCode: string;
  address: string | null;
  sortOrder: number;
}

export interface LocationUpdate {
  name: string;
  locationTypeCode: string;
  address: string | null;
  sortOrder: number;
  active: boolean;
  expectedUpdatedAt: string;
}

/** Mã địa điểm: chữ HOA, số, gạch dưới; 2–40 ký tự; bắt đầu bằng chữ (khớp CHECK của migration 0010). */
export const LOCATION_CODE_RE = /^[A-Z][A-Z0-9_]{1,39}$/;
const TYPE_CODE_RE = /^[A-Z][A-Z_]{1,29}$/;

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

function cleanText(v: unknown, label: string, min: number, max: number): Result<string> {
  if (typeof v !== "string") return fail(`${label} là bắt buộc.`);
  const s = v.trim().replace(/\s+/g, " ");
  if (s.length < min) return fail(`${label} là bắt buộc.`);
  if (s.length > max) return fail(`${label} tối đa ${max} ký tự.`);
  return { ok: true, value: s };
}

function common(b: Record<string, unknown>): Result<Omit<LocationCreate, "code">> {
  const name = cleanText(b.name, "Tên địa điểm", 1, 100);
  if (!name.ok) return name;
  if (typeof b.locationTypeCode !== "string" || !TYPE_CODE_RE.test(b.locationTypeCode)) return fail("Loại địa điểm không hợp lệ.");
  let address: string | null = null;
  if (b.address !== undefined && b.address !== null && b.address !== "") {
    const a = cleanText(b.address, "Địa chỉ", 1, 300);
    if (!a.ok) return a;
    address = a.value;
  }
  const sortOrder = b.sortOrder === undefined ? 0 : b.sortOrder;
  if (typeof sortOrder !== "number" || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) return fail("Thứ tự phải là số nguyên từ 0 đến 9999.");
  return { ok: true, value: { name: name.value, locationTypeCode: b.locationTypeCode, address, sortOrder } };
}

export function validateLocationCreate(body: Record<string, unknown> | null): Result<LocationCreate> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (typeof body.code !== "string" || !LOCATION_CODE_RE.test(body.code)) return fail("Mã địa điểm gồm chữ HOA, số, gạch dưới (2–40 ký tự, bắt đầu bằng chữ), ví dụ QUAY_VE_05.");
  const c = common(body);
  return c.ok ? { ok: true, value: { code: body.code, ...c.value } } : c;
}

export function validateLocationUpdate(body: Record<string, unknown> | null): Result<LocationUpdate> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (typeof body.expectedUpdatedAt !== "string" || !body.expectedUpdatedAt) return fail("Thiếu mốc cập nhật (expectedUpdatedAt) — hãy tải lại trang.");
  if (typeof body.active !== "boolean") return fail("Trạng thái hoạt động phải là true/false.");
  const c = common(body);
  return c.ok ? { ok: true, value: { ...c.value, active: body.active, expectedUpdatedAt: body.expectedUpdatedAt } } : c;
}
```

- [ ] **Bước 4: Chạy** `node --test src/modules/locations/rules.test.ts`

Kỳ vọng: toàn bộ test đạt. (lần kiểm khi soạn: 3 tests, 3 đạt, 0 lỗi)

- [ ] **Bước 5: Tạo/ghi `src/modules/locations/repository.ts`**

```ts
// SQL của các bảng module locations sở hữu (loc_location_type, loc_location). Mọi câu đi qua defineSql (ADR-0002 điều 8(b)) và import bằng
// đuôi .ts để bài kiểm kiến trúc nạp được tệp này. Câu SQL TĨNH: không ghép chuỗi theo đầu vào.
import { defineSql } from "../../shared/sql-registry.ts";
import type { LocationCreate, LocationUpdate } from "./rules.ts";

export interface LocationRow {
  id: string;
  code: string;
  name: string;
  location_type_code: string;
  type_name: string;
  address: string | null;
  sort_order: number;
  active: number;
  updated_at: string;
}

const LIST = defineSql(
  "locations",
  "list",
  `SELECT l.id, l.code, l.name, l.location_type_code, t.name AS type_name, l.address, l.sort_order, l.active, l.updated_at
   FROM loc_location l JOIN loc_location_type t ON t.code = l.location_type_code
   ORDER BY l.active DESC, l.sort_order, l.name`,
);
const FIND = defineSql(
  "locations",
  "find",
  `SELECT l.id, l.code, l.name, l.location_type_code, t.name AS type_name, l.address, l.sort_order, l.active, l.updated_at
   FROM loc_location l JOIN loc_location_type t ON t.code = l.location_type_code WHERE l.id = ?`,
);
const TYPES = defineSql("locations", "types", "SELECT code, name FROM loc_location_type WHERE active = 1 ORDER BY sort_order");
const TYPE_EXISTS = defineSql("locations", "type_exists", "SELECT 1 AS ok FROM loc_location_type WHERE code = ? AND active = 1");
const INSERT = defineSql(
  "locations",
  "insert",
  `INSERT INTO loc_location (id, code, name, location_type_code, address, sort_order, active, created_at, created_by, updated_at, updated_by)
   VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
);
const UPDATE = defineSql(
  "locations",
  "update",
  `UPDATE loc_location SET name = ?, location_type_code = ?, address = ?, sort_order = ?, active = ?, updated_at = ?, updated_by = ?
   WHERE id = ? AND updated_at = ?`,
);

export async function listLocations(db: D1Database): Promise<LocationRow[]> {
  const { results } = await db.prepare(LIST).all<LocationRow>();
  return results;
}

export function findLocation(db: D1Database, id: string): Promise<LocationRow | null> {
  return db.prepare(FIND).bind(id).first<LocationRow>();
}

export async function listLocationTypes(db: D1Database): Promise<{ code: string; name: string }[]> {
  const { results } = await db.prepare(TYPES).all<{ code: string; name: string }>();
  return results;
}

export async function locationTypeExists(db: D1Database, code: string): Promise<boolean> {
  return (await db.prepare(TYPE_EXISTS).bind(code).first()) !== null;
}

export function insertLocationStatement(db: D1Database, id: string, v: LocationCreate, actorId: string, at: string): D1PreparedStatement {
  return db.prepare(INSERT).bind(id, v.code, v.name, v.locationTypeCode, v.address, v.sortOrder, at, actorId, at, actorId);
}

/** Sửa có khoá lạc quan: chỉ áp dụng khi `updated_at` còn đúng mốc client đã đọc (changes() = 0 → đã bị sửa). */
export function updateLocationStatement(db: D1Database, id: string, v: LocationUpdate, actorId: string, at: string): D1PreparedStatement {
  return db.prepare(UPDATE).bind(v.name, v.locationTypeCode, v.address, v.sortOrder, v.active ? 1 : 0, at, actorId, id, v.expectedUpdatedAt);
}
```

- [ ] **Bước 6: Tạo/ghi `src/modules/locations/index.ts`**

```ts
// Module locations — địa điểm phát sinh nghiệp vụ (văn phòng, quầy vé, bến tàu, bến cảng). Route: /api/locations*.
// Đáy đồ thị phụ thuộc (ADR-0002): chỉ dùng audit để ghi dấu vết. Module khác đọc nhãn địa điểm qua view công bố v_loc_location_label,
// KHÔNG import repository.ts. Thêm/sửa/ngưng dùng địa điểm chỉ quản trị viên (ADR-0007: "quản lý địa điểm" = ADMIN).
import { auditStatement } from "../audit";
import type { LocationDto, LocationListResponse, LocationResponse } from "../../shared/contracts";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { route, type AppModule } from "../../shared/router";
import { findLocation, insertLocationStatement, listLocationTypes, listLocations, locationTypeExists, updateLocationStatement, type LocationRow } from "./repository";
import { validateLocationCreate, validateLocationUpdate } from "./rules";

const toDto = (r: LocationRow): LocationDto => ({
  id: r.id,
  code: r.code,
  name: r.name,
  locationTypeCode: r.location_type_code,
  locationTypeName: r.type_name,
  address: r.address,
  sortOrder: r.sort_order,
  active: r.active === 1,
  updatedAt: r.updated_at,
});

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy địa điểm.");
const BAD_TYPE = () => error(400, "invalid_input", "Loại địa điểm không tồn tại.");

export const locationsModule: AppModule = {
  name: "locations",
  routes: [
    // Mọi tài khoản đăng nhập đọc được danh sách (nhãn không nhạy cảm; người làm việc ngoài hiện trường cũng cần thấy tên nơi).
    route("GET", "/api/locations", "staff", async ({ env }) => {
      const [rows, types] = await Promise.all([listLocations(env.DB), listLocationTypes(env.DB)]);
      return json({ locations: rows.map(toDto), types } satisfies LocationListResponse);
    }),

    route("POST", "/api/locations", "admin", async ({ request, env, staff }) => {
      const parsed = validateLocationCreate(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (!(await locationTypeExists(env.DB, parsed.value.locationTypeCode))) return BAD_TYPE();
      const id = crypto.randomUUID();
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          insertLocationStatement(env.DB, id, parsed.value, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "location_created", at, targetType: "location", targetId: id, detail: `${parsed.value.code} — ${parsed.value.name}` }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: loc_location\.code/.test(e.message)) return error(409, "code_taken", "Mã địa điểm này đã có.");
        throw e;
      }
      return json({ location: toDto((await findLocation(env.DB, id))!) } satisfies LocationResponse, 201);
    }),

    route("PUT", "/api/locations/:id", "admin", async ({ request, env, params, staff }) => {
      const id = params.id!;
      const current = UUID_RE.test(id) ? await findLocation(env.DB, id) : null;
      if (!current) return NOT_FOUND();
      const parsed = validateLocationUpdate(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (!(await locationTypeExists(env.DB, parsed.value.locationTypeCode))) return BAD_TYPE();
      const at = new Date().toISOString();
      const results = await env.DB.batch([
        updateLocationStatement(env.DB, id, parsed.value, staff.id, at),
        // Chỉ ghi nhật ký khi UPDATE thật sự áp dụng (thắng khoá lạc quan).
        auditStatement(env.DB, { staffId: staff.id, action: "location_updated", at, targetType: "location", targetId: id, detail: current.code }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return error(409, "stale", "Địa điểm vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
      return json({ location: toDto((await findLocation(env.DB, id))!) } satisfies LocationResponse);
    }),
  ],
};
```

- [ ] **Bước 7: Thêm vào CUỐI `src/shared/contracts.ts`** — DTO địa điểm

```ts
// ---- Địa điểm (module locations) ---------------------------------------------
export interface LocationTypeDto {
  code: string;
  name: string;
}

export interface LocationDto {
  id: string;
  code: string;
  name: string;
  locationTypeCode: string;
  locationTypeName: string;
  address: string | null;
  sortOrder: number;
  active: boolean;
  /** Mốc cập nhật cuối — gửi lại làm `expectedUpdatedAt` khi sửa (khoá lạc quan). */
  updatedAt: string;
}

export interface LocationListResponse { locations: LocationDto[]; types: LocationTypeDto[] }
export interface LocationResponse { location: LocationDto }
```

- [ ] **Bước 8: Sửa `src/index.ts`**

Thay đoạn (đúng một chỗ):

```ts
import { catalogModule, runScheduledSync } from "./modules/catalog";
```

bằng:

```ts
import { catalogModule, runScheduledSync } from "./modules/catalog";
import { locationsModule } from "./modules/locations";
```

Thay đoạn (đúng một chỗ):

```ts
modules: [authModule, accountsModule, ordersModule, catalogModule, auditModule],
```

bằng:

```ts
modules: [authModule, accountsModule, ordersModule, catalogModule, auditModule, locationsModule],
```

- [ ] **Bước 9: Sửa `src/architecture.test.ts`** — `locations` thành module nghiêm: SQL của nó giờ được EXPLAIN kiểm

Thay đoạn (đúng một chỗ):

```ts
const STRICT: readonly { module: string; file: string }[] = [];
```

bằng:

```ts
const STRICT: readonly { module: string; file: string }[] = [
  { module: "locations", file: "modules/locations/repository.ts" },
];
```

- [ ] **Bước 10: Tạo/ghi `tests/e2e/locations.mjs`**

```js
// Địa điểm (module locations): đọc cho mọi tài khoản, ghi chỉ quản trị viên, khoá lạc quan, nhật ký.
import assert from "node:assert/strict";
import { ACCOUNTS, call, session } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const code = `TEST_${String(Date.now()).slice(-8)}`;

// --- đọc: phải đăng nhập; mọi tài khoản đọc được; 8 địa điểm gieo sẵn
assert.equal((await call(null, "GET", "/api/locations")).status, 401);
let r = await call(SALES, "GET", "/api/locations");
assert.equal(r.status, 200);
const seeded = r.body.locations.map((l) => l.code);
for (const c of ["VP_TRAN_PHU", "VP_2_THANG_4", "QUAY_VE_01", "QUAY_VE_04", "BEN_TAU_NHA_TRANG", "CANG_VINPEARL"]) assert.ok(seeded.includes(c), `thiếu địa điểm gieo ${c}`);
assert.ok(r.body.locations.length >= 8);
assert.deepEqual(r.body.types.map((t) => t.code), ["OFFICE", "TICKET_COUNTER", "PIER", "PORT"]);
const vin = r.body.locations.find((l) => l.code === "CANG_VINPEARL");
assert.equal(vin.locationTypeName, "Bến cảng"); assert.equal(vin.active, true); assert.match(vin.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
console.log("✓ đọc danh sách");

// --- ghi: chỉ quản trị viên
const input = { code, name: "  Quầy vé thử ", locationTypeCode: "TICKET_COUNTER", address: "12 Trần Phú", sortOrder: 90 };
assert.equal((await call(SALES, "POST", "/api/locations", input)).status, 403);
assert.equal((await call(null, "POST", "/api/locations", input)).status, 401);
r = await call(ADMIN, "POST", "/api/locations", input);
assert.equal(r.status, 201, JSON.stringify(r.body));
const created = r.body.location;
assert.equal(created.code, code); assert.equal(created.name, "Quầy vé thử"); assert.equal(created.address, "12 Trần Phú"); assert.equal(created.active, true);
assert.equal((await call(ADMIN, "POST", "/api/locations", input)).status, 409, "mã trùng");
for (const bad of [{ ...input, code: "abc" }, { ...input, name: " " }, { ...input, locationTypeCode: "KHONG_CO" }, { ...input, sortOrder: -1 }]) {
  r = await call(ADMIN, "POST", "/api/locations", { ...bad, code: bad.code === "abc" ? "abc" : `T_${String(Date.now()).slice(-6)}` });
  assert.equal(r.status, 400, JSON.stringify(bad));
}
console.log("✓ tạo: quyền, trùng mã, đầu vào sai");

// --- sửa với khoá lạc quan
const edit = { name: "Quầy vé thử (đã sửa)", locationTypeCode: "TICKET_COUNTER", address: null, sortOrder: 91, active: true, expectedUpdatedAt: created.updatedAt };
assert.equal((await call(SALES, "PUT", `/api/locations/${created.id}`, edit)).status, 403);
r = await call(ADMIN, "PUT", `/api/locations/${created.id}`, edit);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.location.name, "Quầy vé thử (đã sửa)"); assert.equal(r.body.location.address, null); assert.notEqual(r.body.location.updatedAt, created.updatedAt);
r = await call(ADMIN, "PUT", `/api/locations/${created.id}`, { ...edit, name: "Sửa từ tab cũ" }); // mốc cũ
assert.equal(r.status, 409); assert.equal(r.body.error.code, "stale");
assert.equal((await call(ADMIN, "PUT", `/api/locations/${created.id}`, { ...edit, expectedUpdatedAt: undefined })).status, 400);
assert.equal((await call(ADMIN, "PUT", "/api/locations/khong-phai-uuid", edit)).status, 404);
assert.equal((await call(ADMIN, "PUT", "/api/locations/00000000-0000-0000-0000-000000000000", edit)).status, 404);
console.log("✓ sửa: khoá lạc quan, 404, 400");

// --- ngưng dùng: không xoá, vẫn liệt kê với active=false
r = await call(ADMIN, "PUT", `/api/locations/${created.id}`, { ...edit, active: false, expectedUpdatedAt: (await call(ADMIN, "GET", "/api/locations")).body.locations.find((l) => l.id === created.id).updatedAt });
assert.equal(r.status, 200); assert.equal(r.body.location.active, false);
assert.equal((await call(SALES, "GET", "/api/locations")).body.locations.find((l) => l.id === created.id).active, false);
console.log("✓ ngưng dùng thay cho xoá");

// --- nhật ký: có dòng theo loại đối tượng "location"; bên thua khoá lạc quan KHÔNG để lại dòng
r = await call(ADMIN, "GET", "/api/audit?action=location_updated&limit=50");
assert.equal(r.body.entries.filter((e) => e.targetId === created.id).length, 2, "đúng 2 lần sửa thành công (sửa tên, ngưng dùng)");
assert.ok(r.body.entries.every((e) => e.targetType === "location"));
r = await call(ADMIN, "GET", "/api/audit?action=location_created&limit=50");
assert.ok(r.body.entries.some((e) => e.targetId === created.id && e.detail.includes(code)));
console.log("✓ nhật ký");
console.log("E2E LOCATIONS OK");
```

- [ ] **Bước 11: Sửa `tests/e2e/run.mjs`**

Thay đoạn (đúng một chỗ):

```js
const ALL = ["platform", "pwa", "orders", "trip", "admin", "catalog", "admin-race"];
```

bằng:

```js
const ALL = ["platform", "pwa", "orders", "trip", "admin", "catalog", "admin-race", "locations"];
```

- [ ] **Bước 12: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt, 0 lỗi. (lần kiểm khi soạn: 146 tests, 146 đạt, 0 lỗi)

- [ ] **Bước 13: Chạy** `npx tsc --noEmit`

Kỳ vọng: không có lỗi (thoát 0).

- [ ] **Bước 14: Chạy** `npm run test:e2e -- locations`

Kỳ vọng: `E2E LOCATIONS OK` và `E2E: 1/1 kịch bản xanh`. (lần kiểm khi soạn: `E2E: 1/1 kịch bản xanh`)

- [ ] **Bước 15: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 T6: module locations (địa điểm) — luật, SQL đăng ký, API, e2e"
```

---

### Task T7: Module `parties`: luật thuần (tên, liên hệ, thời hạn, hồ sơ, vai trò, quan hệ)

Toàn bộ kiểm đầu vào của module nằm ở đây, thuần, không I/O. Quy tắc tách tên (tên = từ cuối, họ = từ đầu nếu ≥ 2 từ, đệm = phần giữa) **trùng** với backfill của `0012`; tên hiển thị của cá nhân LUÔN ghép từ ba phần (`composePersonName`, R-N1-3). Cờ liên hệ chính được chốt cuối cùng cho từng loại ở `validateContactList` để câu INSERT dùng thẳng cờ. Thư mục `parties` xuất hiện nên `architecture.test.ts` đòi module này khai ở `STRICT` hoặc `LEGACY`: tạm đưa vào `LEGACY` (T8 chuyển sang `STRICT` khi có `repository.ts`).

**Files:**
- Tạo: `src/modules/parties/rules.ts`, `src/modules/parties/rules.test.ts`
- Sửa: `src/architecture.test.ts` (tạm: đưa `parties` vào `LEGACY` cho tới T8)

**Interfaces:**
- Consumes: `normalizePhone` (`shared/phone.ts`), `isISODate` (`shared/vn-date.ts`).
- Produces: `splitPersonName(full)`, `composePersonName(n)`, `validatePeriod`, `validateEndDate`, `validateContact`, `validateContactList`, `validatePartyCreate`, `validatePartyUpdate`, `validateRole`, `validateRelationship`, `PARTY_ID_RE` (UUID hoặc `pty-<uuid>` của hồ sơ nhân sự do backfill), `ROW_ID_RE`; kiểu `Result<T>`, `PersonName`, `ContactInput`, `OrgFields`, `PartyCreate`, `PartyUpdate`, `RoleInput`, `RelationshipInput`.

- [ ] **Bước 1: Tạo/ghi `src/modules/parties/rules.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  composePersonName, splitPersonName, validateContact, validateContactList, validateEndDate, validatePartyCreate, validatePartyUpdate,
  validatePeriod, validateRelationship, validateRole, PARTY_ID_RE, ROW_ID_RE,
} from "./rules.ts";

const TODAY = "2026-09-20";
const U1 = "11111111-1111-1111-1111-111111111111";
const U2 = "22222222-2222-2222-2222-222222222222";

test("tách họ tên: 1, 2, 3, 4+ từ, khoảng trắng thừa, dấu", () => {
  assert.deepEqual(splitPersonName("Hương"), { family: null, middle: null, given: "Hương" });
  assert.deepEqual(splitPersonName("Trần Bình"), { family: "Trần", middle: null, given: "Bình" });
  assert.deepEqual(splitPersonName("Nguyễn Tuyên Phong"), { family: "Nguyễn", middle: "Tuyên", given: "Phong" });
  assert.deepEqual(splitPersonName("  Nguyễn   Thị  Thu   Hà "), { family: "Nguyễn", middle: "Thị Thu", given: "Hà" });
  assert.equal(splitPersonName("   "), null);
  assert.equal(splitPersonName(""), null);
});

test("ghép tên hiển thị: bỏ phần trống, ngược của tách", () => {
  assert.equal(composePersonName({ family: "Nguyễn", middle: "Tuyên", given: "Phong" }), "Nguyễn Tuyên Phong");
  assert.equal(composePersonName({ family: null, middle: null, given: "Hương" }), "Hương");
  assert.equal(composePersonName({ family: "Trần", given: "Bình" }), "Trần Bình");
  for (const full of ["Hương", "Trần Bình", "Nguyễn Tuyên Phong", "Nguyễn Thị Thu Hà"]) assert.equal(composePersonName(splitPersonName(full)!), full);
});

test("thời hạn: mặc định hôm nay, ngày đúng lịch, to ≥ from", () => {
  assert.deepEqual(validatePeriod(undefined, undefined, TODAY), { ok: true, value: { from: TODAY, to: null } });
  assert.deepEqual(validatePeriod("2026-01-01", "2026-01-31", TODAY), { ok: true, value: { from: "2026-01-01", to: "2026-01-31" } });
  for (const [f, t] of [["2026-02-30", null], ["2026-01-01", "2025-12-31"], ["01/01/2026", null], [5, null], ["2026-01-01", "x"]] as const) assert.equal(validatePeriod(f, t, TODAY).ok, false, `${f} ${t}`);
  assert.deepEqual(validateEndDate(null, TODAY), { ok: true, value: TODAY });
  assert.equal(validateEndDate({ validTo: "2026-13-01" }, TODAY).ok, false);
});

test("liên hệ: SĐT chuẩn hoá, email hạ chữ thường, từ chối sai", () => {
  const p = validateContact({ kind: "PHONE", value: " 0901 234 567 ", label: " Zalo " });
  assert.deepEqual(p, { ok: true, value: { kind: "PHONE", value: "0901 234 567", valueNormalized: "0901234567", label: "Zalo", isPrimary: false } });
  const e = validateContact({ kind: "EMAIL", value: "An@Example.COM", isPrimary: true });
  assert.deepEqual(e, { ok: true, value: { kind: "EMAIL", value: "An@Example.COM", valueNormalized: "an@example.com", label: null, isPrimary: true } });
  for (const bad of [null, [], { kind: "FAX", value: "1" }, { kind: "PHONE", value: "123" }, { kind: "EMAIL", value: "khong-co-a-cong" }, { kind: "PHONE", value: "" }, { kind: "PHONE", value: "0901234567", isPrimary: "yes" }, { kind: "PHONE", value: "0901234567", label: "x".repeat(51) }]) {
    assert.equal(validateContact(bad).ok, false, JSON.stringify(bad));
  }
});

test("danh sách liên hệ: chốt cờ chính cuối cùng cho từng loại", () => {
  const a = { kind: "PHONE", value: "0901234567" }, b = { kind: "PHONE", value: "0907654321", isPrimary: true }, c = { kind: "EMAIL", value: "x@y.vn" };
  const r = validateContactList([a, b, c]);
  assert.ok(r.ok);
  assert.deepEqual(r.value.map((x) => [x.kind, x.valueNormalized, x.isPrimary]), [["PHONE", "0901234567", false], ["PHONE", "0907654321", true], ["EMAIL", "x@y.vn", true]]);
  const first = validateContactList([a, { kind: "PHONE", value: "0907654321" }]);
  assert.ok(first.ok && first.value[0]!.isPrimary && !first.value[1]!.isPrimary, "không đánh dấu thì dòng đầu là chính");
  assert.equal(validateContactList([{ ...a, isPrimary: true }, { ...b }]).ok, false, "hai liên hệ chính cùng loại");
  assert.equal(validateContactList(new Array(6).fill(a)).ok, false, "quá 5");
  assert.deepEqual(validateContactList(undefined), { ok: true, value: [] });
});

test("tạo hồ sơ cá nhân: fullName hoặc tên tách rời", () => {
  const r = validatePartyCreate({ kind: "PERSON", fullName: "Nguyễn  Tuyên Phong", contacts: [{ kind: "PHONE", value: "0845256256" }] });
  assert.ok(r.ok && r.value.kind === "PERSON");
  assert.deepEqual(r.value.name, { family: "Nguyễn", middle: "Tuyên", given: "Phong" });
  const split = validatePartyCreate({ kind: "PERSON", familyName: "Trần", givenName: "Bình" });
  assert.ok(split.ok && split.value.kind === "PERSON" && split.value.name.given === "Bình" && split.value.name.middle === null);
  for (const bad of [null, {}, { kind: "ROBOT" }, { kind: "PERSON" }, { kind: "PERSON", fullName: "  " }, { kind: "PERSON", givenName: "x".repeat(61) }]) assert.equal(validatePartyCreate(bad).ok, false, JSON.stringify(bad));
});

test("tạo hồ sơ tổ chức: tên gọi bắt buộc, MST 10/13 số, email hoá đơn", () => {
  const r = validatePartyCreate({ kind: "ORGANIZATION", displayName: " Đại lý  Sao Biển ", legalName: "Công ty TNHH Sao Biển", taxCode: "0312 345 678", invoiceEmail: "KeToan@SaoBien.vn", address: "1 Trần Phú" });
  assert.ok(r.ok && r.value.kind === "ORGANIZATION");
  assert.deepEqual(r.value.org, { displayName: "Đại lý Sao Biển", legalName: "Công ty TNHH Sao Biển", taxCode: "0312345678", address: "1 Trần Phú", invoiceEmail: "ketoan@saobien.vn" });
  assert.ok(validatePartyCreate({ kind: "ORGANIZATION", displayName: "A", taxCode: "0312345678-001" }).ok);
  for (const bad of [{ kind: "ORGANIZATION" }, { kind: "ORGANIZATION", displayName: "A", taxCode: "123" }, { kind: "ORGANIZATION", displayName: "A", invoiceEmail: "sai" }, { kind: "ORGANIZATION", displayName: "x".repeat(201) }]) {
    assert.equal(validatePartyCreate(bad).ok, false, JSON.stringify(bad));
  }
});

test("sửa hồ sơ: bắt buộc expectedUpdatedAt và active; loại lấy từ hồ sơ hiện có", () => {
  const body = { fullName: "Trần Văn Bình", active: true, expectedUpdatedAt: "2026-09-20T00:00:00.000Z", kind: "ORGANIZATION" };
  const r = validatePartyUpdate(body, "PERSON");
  assert.ok(r.ok && r.value.kind === "PERSON", "kind trong body bị bỏ qua");
  assert.equal(validatePartyUpdate({ ...body, expectedUpdatedAt: undefined }, "PERSON").ok, false);
  assert.equal(validatePartyUpdate({ ...body, active: "true" }, "PERSON").ok, false);
  assert.equal(validatePartyUpdate({ displayName: "A", active: false, expectedUpdatedAt: "x" }, "ORGANIZATION").ok, true);
  assert.equal(validatePartyUpdate({ displayName: "", active: false, expectedUpdatedAt: "x" }, "ORGANIZATION").ok, false);
});

test("vai trò: mã hợp lệ, nơi tuỳ chọn, thời hạn", () => {
  assert.deepEqual(validateRole({ roleTypeCode: "GUIDE", locationId: U1 }, TODAY), { ok: true, value: { roleTypeCode: "GUIDE", locationId: U1, from: TODAY, to: null } });
  assert.deepEqual(validateRole({ roleTypeCode: "STAFF", validFrom: "2026-01-01", validTo: "2026-12-31" }, TODAY), { ok: true, value: { roleTypeCode: "STAFF", locationId: null, from: "2026-01-01", to: "2026-12-31" } });
  for (const bad of [null, { roleTypeCode: "guide" }, { roleTypeCode: "GUIDE", locationId: "khong-uuid" }, { roleTypeCode: "GUIDE", validFrom: "2026-02-30" }]) assert.equal(validateRole(bad, TODAY).ok, false, JSON.stringify(bad));
});

test("quan hệ: hai đầu hợp lệ, khác nhau, một đầu là hồ sơ đang xem", () => {
  const U3 = "33333333-3333-3333-3333-333333333333";
  const rel = (extra: Record<string, unknown> = {}) => ({ fromPartyId: U1, toPartyId: U2, relationshipTypeCode: "CONTACT_OF", ...extra });
  assert.ok(validateRelationship(rel(), U2, TODAY).ok);
  assert.ok(validateRelationship(rel({ fromPartyId: `pty-${U1}` }), U2, TODAY).ok, "hồ sơ nhân sự có tiền tố pty-");
  const bad: [Record<string, unknown> | null, string, string][] = [
    [null, U2, "thiếu dữ liệu"],
    [rel({ toPartyId: U1 }), U1, "tự quan hệ với chính mình"],
    [rel(), U3, "hồ sơ đang xem không ở đầu nào"],
    [rel({ fromPartyId: "x" }), U2, "id sai dạng"],
    [rel({ relationshipTypeCode: "contact" }), U2, "mã loại sai"],
    [rel({ validFrom: "2026-02-30" }), U2, "ngày sai lịch"],
  ];
  for (const [body, partyId, why] of bad) assert.equal(validateRelationship(body, partyId, TODAY).ok, false, why);
});

test("mẫu id: UUID hoặc tiền tố do backfill", () => {
  assert.ok(PARTY_ID_RE.test(U1) && PARTY_ID_RE.test(`pty-${U1}`) && !PARTY_ID_RE.test("pty-x") && !PARTY_ID_RE.test(`ptr-${U1}`));
  assert.ok(ROW_ID_RE.test(U1) && ROW_ID_RE.test(`ptr-${U1}`) && !ROW_ID_RE.test(`pty-${U1}`));
});
```

- [ ] **Bước 2: Chạy** `node --test src/modules/parties/rules.test.ts`

Kỳ vọng: **LỖI** — lỗi nạp module `./rules.ts`.

- [ ] **Bước 3: Tạo/ghi `src/modules/parties/rules.ts`**

```ts
// Luật thuần của module parties: tách/ghép tên người, kiểm liên hệ, thời hạn, đầu vào hồ sơ/vai trò/quan hệ. Không I/O.
// Import bằng đuôi .ts (node --test chạy trực tiếp). Giới hạn độ dài khớp CHECK của migration 0011.
import { normalizePhone } from "../../shared/phone.ts";
import { isISODate } from "../../shared/vn-date.ts";

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

/** id hồ sơ: UUID, hoặc 'pty-<uuid staff>' của hồ sơ nhân sự do migration 0012 tạo. */
export const PARTY_ID_RE = /^(?:pty-)?[0-9a-f-]{36}$/;
/** id dòng con (liên hệ, vai trò, quan hệ): UUID, hoặc 'ptr-<uuid staff>' của vai STAFF do migration 0012 tạo. */
export const ROW_ID_RE = /^(?:ptr-)?[0-9a-f-]{36}$/;
const UUID_RE = /^[0-9a-f-]{36}$/;
const CODE_RE = /^[A-Z][A-Z_]{1,29}$/;

// ---------------------------------------------------------------------------------------------------------------------
// Tên người
// ---------------------------------------------------------------------------------------------------------------------
export interface PersonName {
  family: string | null;
  middle: string | null;
  given: string;
}

const squash = (s: string): string => s.trim().replace(/\s+/g, " ");

/** Tách một chuỗi họ tên: tên = từ cuối; họ = từ đầu (nếu ≥ 2 từ); tên đệm = phần giữa. Cùng quy tắc với backfill của migration 0012. */
export function splitPersonName(full: string): PersonName | null {
  const tokens = squash(full).split(" ").filter(Boolean);
  if (tokens.length === 0) return null;
  const given = tokens[tokens.length - 1]!;
  if (tokens.length === 1) return { family: null, middle: null, given };
  const middle = tokens.slice(1, -1).join(" ");
  return { family: tokens[0]!, middle: middle || null, given };
}

/** Tên hiển thị của cá nhân: họ + tên đệm + tên (bỏ phần trống). Một nguồn cho mọi đường ghi (R-N1-3). */
export function composePersonName(n: { family?: string | null; middle?: string | null; given: string }): string {
  return [n.family, n.middle, n.given].filter((p): p is string => typeof p === "string" && p.length > 0).join(" ");
}

function personName(b: Record<string, unknown>): Result<PersonName> {
  let name: PersonName | null;
  if (typeof b.fullName === "string") name = splitPersonName(b.fullName);
  else {
    const part = (v: unknown): string | null => (typeof v === "string" && squash(v) ? squash(v) : null);
    const given = part(b.givenName);
    name = given ? { family: part(b.familyName), middle: part(b.middleName), given } : null;
  }
  if (!name) return fail("Họ tên là bắt buộc.");
  if (name.given.length > 60 || (name.family?.length ?? 0) > 60 || (name.middle?.length ?? 0) > 100) return fail("Họ tối đa 60, tên đệm tối đa 100, tên tối đa 60 ký tự.");
  if (composePersonName(name).length > 200) return fail("Họ tên tối đa 200 ký tự.");
  return { ok: true, value: name };
}

// ---------------------------------------------------------------------------------------------------------------------
// Thời hạn (ngày dân sự giờ Việt Nam)
// ---------------------------------------------------------------------------------------------------------------------
/** `from` mặc định = hôm nay; `to` rỗng = còn hiệu lực. Ngày phải đúng lịch; to ≥ from. */
export function validatePeriod(fromRaw: unknown, toRaw: unknown, today: string): Result<{ from: string; to: string | null }> {
  const from = fromRaw === undefined || fromRaw === null || fromRaw === "" ? today : fromRaw;
  if (typeof from !== "string" || !isISODate(from)) return fail("Ngày bắt đầu không hợp lệ (YYYY-MM-DD).");
  if (toRaw === undefined || toRaw === null || toRaw === "") return { ok: true, value: { from, to: null } };
  if (typeof toRaw !== "string" || !isISODate(toRaw)) return fail("Ngày kết thúc không hợp lệ (YYYY-MM-DD).");
  if (toRaw < from) return fail("Ngày kết thúc không được trước ngày bắt đầu.");
  return { ok: true, value: { from, to: toRaw } };
}

/** Ngày kết thúc khi đóng một dòng (mặc định hôm nay). Việc "không trước ngày bắt đầu" do câu UPDATE kiểm (changes() = 0). */
export function validateEndDate(body: Record<string, unknown> | null, today: string): Result<string> {
  const to = body?.validTo ?? today;
  return typeof to === "string" && isISODate(to) ? { ok: true, value: to } : fail("Ngày kết thúc không hợp lệ (YYYY-MM-DD).");
}

// ---------------------------------------------------------------------------------------------------------------------
// Liên hệ
// ---------------------------------------------------------------------------------------------------------------------
export type ContactKind = "PHONE" | "EMAIL";
export interface ContactInput {
  kind: ContactKind;
  value: string;
  valueNormalized: string;
  label: string | null;
  isPrimary: boolean;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(v: unknown): Result<ContactInput> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return fail("Liên hệ không hợp lệ.");
  const b = v as Record<string, unknown>;
  if (b.kind !== "PHONE" && b.kind !== "EMAIL") return fail("Loại liên hệ phải là PHONE hoặc EMAIL.");
  if (typeof b.value !== "string" || !b.value.trim()) return fail("Thiếu giá trị liên hệ.");
  const value = b.value.trim();
  let valueNormalized: string;
  if (b.kind === "PHONE") {
    const p = normalizePhone(value);
    if (!p) return fail("Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
    valueNormalized = p;
  } else {
    if (value.length > 200 || !EMAIL_RE.test(value)) return fail("Email không hợp lệ.");
    valueNormalized = value.toLowerCase();
  }
  if (value.length > 200) return fail("Liên hệ tối đa 200 ký tự.");
  let label: string | null = null;
  if (b.label !== undefined && b.label !== null && b.label !== "") {
    if (typeof b.label !== "string" || squash(b.label).length > 50) return fail("Ghi chú liên hệ tối đa 50 ký tự.");
    label = squash(b.label);
  }
  if (b.isPrimary !== undefined && typeof b.isPrimary !== "boolean") return fail("isPrimary phải là true/false.");
  return { ok: true, value: { kind: b.kind, value, valueNormalized, label, isPrimary: b.isPrimary === true } };
}

/**
 * Danh sách liên hệ khi tạo hồ sơ (≤ 5). Chốt cờ chính CUỐI CÙNG cho từng loại: có đúng một dòng chính đánh dấu thì giữ, nhiều hơn một → lỗi,
 * không có → dòng đầu của loại đó là chính. Nhờ vậy câu INSERT dùng thẳng cờ, không phụ thuộc thứ tự chèn.
 */
export function validateContactList(v: unknown): Result<ContactInput[]> {
  if (v === undefined || v === null) return { ok: true, value: [] };
  if (!Array.isArray(v) || v.length > 5) return fail("Tối đa 5 liên hệ khi tạo hồ sơ.");
  const list: ContactInput[] = [];
  for (const item of v) {
    const c = validateContact(item);
    if (!c.ok) return c;
    list.push(c.value);
  }
  for (const kind of ["PHONE", "EMAIL"] as const) {
    const of = list.filter((c) => c.kind === kind);
    if (of.filter((c) => c.isPrimary).length > 1) return fail("Mỗi loại liên hệ chỉ có một liên hệ chính.");
    if (of.length > 0 && !of.some((c) => c.isPrimary)) of[0]!.isPrimary = true;
  }
  return { ok: true, value: list };
}

// ---------------------------------------------------------------------------------------------------------------------
// Hồ sơ
// ---------------------------------------------------------------------------------------------------------------------
export interface OrgFields {
  displayName: string;
  legalName: string | null;
  taxCode: string | null;
  address: string | null;
  invoiceEmail: string | null;
}
export type PartyCreate =
  | { kind: "PERSON"; name: PersonName; contacts: ContactInput[] }
  | { kind: "ORGANIZATION"; org: OrgFields; contacts: ContactInput[] };
export type PartyUpdate =
  | { kind: "PERSON"; name: PersonName; active: boolean; expectedUpdatedAt: string }
  | { kind: "ORGANIZATION"; org: OrgFields; active: boolean; expectedUpdatedAt: string };

const optText = (v: unknown, label: string, max: number): Result<string | null> => {
  if (v === undefined || v === null || v === "") return { ok: true, value: null };
  if (typeof v !== "string" || squash(v).length > max) return fail(`${label} tối đa ${max} ký tự.`);
  return { ok: true, value: squash(v) };
};

function orgFields(b: Record<string, unknown>): Result<OrgFields> {
  if (typeof b.displayName !== "string" || !squash(b.displayName)) return fail("Tên gọi của tổ chức là bắt buộc.");
  if (squash(b.displayName).length > 200) return fail("Tên gọi tối đa 200 ký tự.");
  const legalName = optText(b.legalName, "Tên pháp lý", 300);
  if (!legalName.ok) return legalName;
  const address = optText(b.address, "Địa chỉ", 300);
  if (!address.ok) return address;
  let taxCode: string | null = null;
  if (b.taxCode !== undefined && b.taxCode !== null && b.taxCode !== "") {
    const t = typeof b.taxCode === "string" ? b.taxCode.replace(/\s+/g, "") : "";
    if (!/^\d{10}(\d{3}|-\d{3})?$/.test(t)) return fail("Mã số thuế gồm 10 hoặc 13 chữ số (có thể ghi dạng 10 số-3 số).");
    taxCode = t;
  }
  let invoiceEmail: string | null = null;
  if (b.invoiceEmail !== undefined && b.invoiceEmail !== null && b.invoiceEmail !== "") {
    if (typeof b.invoiceEmail !== "string" || b.invoiceEmail.trim().length > 200 || !EMAIL_RE.test(b.invoiceEmail.trim())) return fail("Email nhận hoá đơn không hợp lệ.");
    invoiceEmail = b.invoiceEmail.trim().toLowerCase();
  }
  return { ok: true, value: { displayName: squash(b.displayName), legalName: legalName.value, taxCode, address: address.value, invoiceEmail } };
}

export function validatePartyCreate(body: Record<string, unknown> | null): Result<PartyCreate> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const contacts = validateContactList(body.contacts);
  if (!contacts.ok) return contacts;
  if (body.kind === "PERSON") {
    const name = personName(body);
    return name.ok ? { ok: true, value: { kind: "PERSON", name: name.value, contacts: contacts.value } } : name;
  }
  if (body.kind === "ORGANIZATION") {
    const org = orgFields(body);
    return org.ok ? { ok: true, value: { kind: "ORGANIZATION", org: org.value, contacts: contacts.value } } : org;
  }
  return fail("Loại hồ sơ phải là PERSON hoặc ORGANIZATION.");
}

/** Loại hồ sơ KHÔNG đổi được: `kind` lấy từ hồ sơ hiện có. */
export function validatePartyUpdate(body: Record<string, unknown> | null, kind: "PERSON" | "ORGANIZATION"): Result<PartyUpdate> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (typeof body.expectedUpdatedAt !== "string" || !body.expectedUpdatedAt) return fail("Thiếu mốc cập nhật (expectedUpdatedAt) — hãy tải lại trang.");
  if (typeof body.active !== "boolean") return fail("Trạng thái hoạt động phải là true/false.");
  if (kind === "PERSON") {
    const name = personName(body);
    return name.ok ? { ok: true, value: { kind, name: name.value, active: body.active, expectedUpdatedAt: body.expectedUpdatedAt } } : name;
  }
  const org = orgFields(body);
  return org.ok ? { ok: true, value: { kind, org: org.value, active: body.active, expectedUpdatedAt: body.expectedUpdatedAt } } : org;
}

// ---------------------------------------------------------------------------------------------------------------------
// Vai trò theo nơi và quan hệ
// ---------------------------------------------------------------------------------------------------------------------
export interface RoleInput {
  roleTypeCode: string;
  locationId: string | null;
  from: string;
  to: string | null;
}

export function validateRole(body: Record<string, unknown> | null, today: string): Result<RoleInput> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (typeof body.roleTypeCode !== "string" || !CODE_RE.test(body.roleTypeCode)) return fail("Loại vai trò không hợp lệ.");
  let locationId: string | null = null;
  if (body.locationId !== undefined && body.locationId !== null && body.locationId !== "") {
    if (typeof body.locationId !== "string" || !UUID_RE.test(body.locationId)) return fail("Địa điểm không hợp lệ.");
    locationId = body.locationId;
  }
  const period = validatePeriod(body.validFrom, body.validTo, today);
  return period.ok ? { ok: true, value: { roleTypeCode: body.roleTypeCode, locationId, from: period.value.from, to: period.value.to } } : period;
}

export interface RelationshipInput {
  fromPartyId: string;
  toPartyId: string;
  typeCode: string;
  from: string;
  to: string | null;
}

/** `partyId` (từ đường dẫn) phải là một trong hai đầu của quan hệ. */
export function validateRelationship(body: Record<string, unknown> | null, partyId: string, today: string): Result<RelationshipInput> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const { fromPartyId, toPartyId, relationshipTypeCode } = body;
  if (typeof fromPartyId !== "string" || typeof toPartyId !== "string" || !PARTY_ID_RE.test(fromPartyId) || !PARTY_ID_RE.test(toPartyId)) return fail("Hồ sơ của quan hệ không hợp lệ.");
  if (fromPartyId === toPartyId) return fail("Một hồ sơ không thể có quan hệ với chính nó.");
  if (fromPartyId !== partyId && toPartyId !== partyId) return fail("Quan hệ phải có hồ sơ đang xem ở một đầu.");
  if (typeof relationshipTypeCode !== "string" || !CODE_RE.test(relationshipTypeCode)) return fail("Loại quan hệ không hợp lệ.");
  const period = validatePeriod(body.validFrom, body.validTo, today);
  return period.ok ? { ok: true, value: { fromPartyId, toPartyId, typeCode: relationshipTypeCode, from: period.value.from, to: period.value.to } } : period;
}
```

- [ ] **Bước 4: Chạy** `node --test src/modules/parties/rules.test.ts`

Kỳ vọng: toàn bộ test đạt. (lần kiểm khi soạn: 11 tests, 11 đạt, 0 lỗi)

- [ ] **Bước 5: Sửa `src/architecture.test.ts`** — TẠM — T8 gỡ dòng này

Thay đoạn (đúng một chỗ):

```ts
 * Hạn: `staff` chuyển sang STRICT ở kế hoạch N1-B (Task B1); `audit`/`orders` bỏ JOIN thẳng bảng khi chạm ở N1-B (Task B4) và còn wonGuard của orders tới N2;
 * `accounts`, `auth`, `catalog` chưa có SQL riêng đáng kể — chuyển STRICT khi có SQL mới.
 */
const LEGACY = ["accounts", "audit", "auth", "catalog", "orders", "staff"] as const;
```

bằng:

```ts
 * Hạn: `staff` chuyển sang STRICT ở kế hoạch N1-B (Task B1); `audit`/`orders` bỏ JOIN thẳng bảng khi chạm ở N1-B (Task B4) và còn wonGuard của orders tới N2;
 * `accounts`, `auth`, `catalog` chưa có SQL riêng đáng kể — chuyển STRICT khi có SQL mới.
 */
const LEGACY = ["accounts", "audit", "auth", "catalog", "orders", "staff", "parties"] as const;
```

- [ ] **Bước 6: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt, 0 lỗi. (lần kiểm khi soạn: 157 tests, 157 đạt, 0 lỗi)

- [ ] **Bước 7: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 T7: parties — luật thuần (tên, liên hệ, thời hạn, hồ sơ, vai trò, quan hệ)"
```

---

### Task T8: Module `parties`: SQL, API, e2e

Quyền: trong kế hoạch này mọi route `parties` khai `access: "staff"`; **Task B1** đổi sang `"office"` (chặn tài khoản chỉ-FIELD — R-N1-15) và thêm hàm đổi tên hồ sơ cho `staff`. Vai trò theo nơi và quan hệ chỉ ADMIN (ADR-0007). Khoá lạc quan của `PUT`: MỌI câu sửa hồ sơ mang điều kiện "mốc `updated_at` của `pty_party` còn đúng" và câu sửa `pty_party` đứng CUỐI (nó đổi mốc) nên trong một `db.batch()` các câu cùng thấy một trạng thái — không cần bảng của module khác. Nhật ký KHÔNG ghi SĐT/email/MST (chỉ tên và loại). Số điện thoại trùng KHÔNG chặn tạo: `lookup` chỉ để giao diện hỏi "dùng có sẵn hay tạo mới" (ADR-0001 mục 8). Route tĩnh (`meta`, `lookup`) khai TRƯỚC `:id`.

**Files:**
- Tạo: `src/modules/parties/{repository.ts,index.ts}`, `tests/e2e/parties.mjs`
- Sửa: `src/shared/contracts.ts`, `src/index.ts`, `src/architecture.test.ts`, `tests/e2e/run.mjs`

**Interfaces:**
- Consumes: `pty_*`, `v_pty_party_label` (T4); `loc_location` qua view `v_loc_location_label` (ADR-0008); luật từ T7; `auditStatement`.
- Produces: Route `GET /api/parties/meta`, `GET /api/parties/lookup?phone=`, `GET/POST /api/parties`, `GET/PUT /api/parties/:id` (PUT có `expectedUpdatedAt`), `POST /api/parties/:id/contacts` và `…/contacts/:cid/end`, `POST …/roles` và `…/roles/:rid/end`, `POST …/relationships` và `…/relationships/:rid/end`; API công khai cho module khác qua `index.ts`: `newPersonStatements`, `newOrganizationStatements` (trả **câu lệnh chưa chạy**), `findPartiesByPhone`, `splitPersonName`, `composePersonName`; DTO `PartyDto`, `PartyListItemDto`, `ContactPointDto`, `PartyRoleDto`, `PartyRelationshipDto`, `PartyListResponse`, `PartyLookupResponse`, `PartyResponse`, `PartyMetaResponse`.

- [ ] **Bước 1: Tạo/ghi `src/modules/parties/repository.ts`**

```ts
// SQL của các bảng module parties sở hữu (pty_*). Mọi câu đi qua defineSql (ADR-0002 điều 8(b)) và import bằng đuôi .ts để bài kiểm
// kiến trúc nạp được tệp này. Câu SQL TĨNH: tham số tuỳ chọn viết `?N IS NULL OR …`; tham số đánh số ?N để dùng lại một giá trị.
// Đọc địa điểm CHỈ qua view công bố v_loc_location_label (ADR-0008); không đụng bảng loc_* trực tiếp.
import { defineSql } from "../../shared/sql-registry.ts";
import type { ContactInput, OrgFields, PersonName, RelationshipInput, RoleInput } from "./rules.ts";
import { composePersonName } from "./rules.ts";

export type PartyKind = "PERSON" | "ORGANIZATION";

export interface PartyListRow {
  id: string;
  party_kind: PartyKind;
  display_name: string;
  active: number;
  primary_phone: string | null;
  role_codes: string | null;
}
export interface PartyRow {
  id: string;
  party_kind: PartyKind;
  display_name: string;
  active: number;
  created_at: string;
  updated_at: string;
  family_name: string | null;
  middle_name: string | null;
  given_name: string | null;
  legal_name: string | null;
  tax_code: string | null;
  address: string | null;
  invoice_email: string | null;
}
export interface ContactRow { id: string; contact_kind_code: string; value: string; label: string | null; is_primary: number; valid_from_date: string; valid_to_date: string | null }
export interface RoleRow { id: string; role_type_code: string; role_name: string; location_id: string | null; location_name: string | null; valid_from_date: string; valid_to_date: string | null }
export interface RelationshipRow {
  id: string;
  relationship_type_code: string;
  type_name: string;
  from_party_id: string;
  from_name: string;
  to_party_id: string;
  to_name: string;
  valid_from_date: string;
  valid_to_date: string | null;
}
export interface TypeRow { code: string; name: string }

// ---- Đọc ---------------------------------------------------------------------------------------------------------
// ?1 = hôm nay (giờ VN) để tính "vai trò đang hiệu lực".
const LIST_SELECT = `SELECT p.id, p.party_kind, p.display_name, p.active,
  (SELECT c.value FROM pty_contact_point c WHERE c.party_id = p.id AND c.contact_kind_code = 'PHONE' AND c.is_primary = 1 AND c.valid_to_date IS NULL) AS primary_phone,
  (SELECT group_concat(r.role_type_code) FROM pty_party_role r
    WHERE r.party_id = p.id AND r.valid_from_date <= ?1 AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?1)) AS role_codes
  FROM v_pty_party_label p`;

// ?2 loại, ?3 LIKE tên, ?4 LIKE số (chuẩn hoá), ?5 mã vai trò, ?6 địa điểm, ?7 gồm cả đã ngưng, ?8 giới hạn, ?9 vị trí bắt đầu
const LIST = defineSql(
  "parties",
  "list",
  `${LIST_SELECT}
   WHERE (?2 IS NULL OR p.party_kind = ?2)
     AND (?3 IS NULL OR p.display_name LIKE ?3 ESCAPE '\\'
          OR EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.party_id = p.id AND c.valid_to_date IS NULL AND c.value_normalized LIKE ?4 ESCAPE '\\'))
     AND ((?5 IS NULL AND ?6 IS NULL)
          OR EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = p.id AND (?5 IS NULL OR r.role_type_code = ?5) AND (?6 IS NULL OR r.location_id = ?6)
                       AND r.valid_from_date <= ?1 AND (r.valid_to_date IS NULL OR r.valid_to_date >= ?1)))
     AND (?7 = 1 OR p.active = 1)
   ORDER BY p.sort_key COLLATE NOCASE, p.id LIMIT ?8 OFFSET ?9`,
);

// ?2 = số điện thoại đã chuẩn hoá. Chỉ liên hệ đang mở. Không chặn tạo trùng — chỉ để giao diện hỏi "dùng có sẵn hay tạo mới" (ADR-0001 mục 8).
const LOOKUP = defineSql(
  "parties",
  "lookup_phone",
  `${LIST_SELECT}
   WHERE p.id IN (SELECT c.party_id FROM pty_contact_point c WHERE c.contact_kind_code = 'PHONE' AND c.value_normalized = ?2 AND c.valid_to_date IS NULL)
   ORDER BY p.sort_key COLLATE NOCASE, p.id LIMIT 20`,
);

const FIND = defineSql(
  "parties",
  "find",
  `SELECT p.id, p.party_kind, p.display_name, p.active, p.created_at, p.updated_at, pe.family_name, pe.middle_name, pe.given_name,
          o.legal_name, o.tax_code, o.address, o.invoice_email
   FROM pty_party p LEFT JOIN pty_person pe ON pe.party_id = p.id LEFT JOIN pty_organization o ON o.party_id = p.id WHERE p.id = ?1`,
);
const CONTACTS_OF = defineSql(
  "parties",
  "contacts_of",
  `SELECT id, contact_kind_code, value, label, is_primary, valid_from_date, valid_to_date FROM pty_contact_point WHERE party_id = ?1
   ORDER BY (valid_to_date IS NOT NULL), contact_kind_code, is_primary DESC, valid_from_date DESC`,
);
const ROLES_OF = defineSql(
  "parties",
  "roles_of",
  `SELECT r.id, r.role_type_code, t.name AS role_name, r.location_id, l.name AS location_name, r.valid_from_date, r.valid_to_date
   FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code LEFT JOIN v_loc_location_label l ON l.id = r.location_id
   WHERE r.party_id = ?1 ORDER BY (r.valid_to_date IS NOT NULL), r.valid_from_date DESC, r.id`,
);
const RELATIONSHIPS_OF = defineSql(
  "parties",
  "relationships_of",
  `SELECT r.id, r.relationship_type_code, t.name AS type_name, r.from_party_id, f.display_name AS from_name, r.to_party_id, tp.display_name AS to_name,
          r.valid_from_date, r.valid_to_date
   FROM pty_party_relationship r JOIN pty_relationship_type t ON t.code = r.relationship_type_code
     JOIN v_pty_party_label f ON f.id = r.from_party_id JOIN v_pty_party_label tp ON tp.id = r.to_party_id
   WHERE r.from_party_id = ?1 OR r.to_party_id = ?1 ORDER BY (r.valid_to_date IS NOT NULL), r.valid_from_date DESC, r.id`,
);
const ROLE_TYPES = defineSql("parties", "role_types", "SELECT code, name FROM pty_role_type WHERE active = 1 ORDER BY sort_order");
const RELATIONSHIP_TYPES = defineSql("parties", "relationship_types", "SELECT code, name FROM pty_relationship_type WHERE active = 1 ORDER BY sort_order");

export interface ListFilter {
  today: string;
  kind: PartyKind | null;
  q: string | null; // đã escape LIKE và bọc %…%
  phoneLike: string | null; // chỉ chữ số, bọc %…%
  roleCode: string | null;
  locationId: string | null;
  includeInactive: boolean;
  limit: number;
  offset: number;
}

export async function listParties(db: D1Database, f: ListFilter): Promise<{ rows: PartyListRow[]; hasMore: boolean }> {
  const { results } = await db
    .prepare(LIST)
    .bind(f.today, f.kind, f.q, f.phoneLike, f.roleCode, f.locationId, f.includeInactive ? 1 : 0, f.limit + 1, f.offset)
    .all<PartyListRow>();
  return { rows: results.slice(0, f.limit), hasMore: results.length > f.limit };
}

export async function findPartiesByPhone(db: D1Database, normalizedPhone: string, today: string): Promise<PartyListRow[]> {
  const { results } = await db.prepare(LOOKUP).bind(today, normalizedPhone).all<PartyListRow>();
  return results;
}

export function findParty(db: D1Database, id: string): Promise<PartyRow | null> {
  return db.prepare(FIND).bind(id).first<PartyRow>();
}

/** Hồ sơ + liên hệ + vai trò + quan hệ trong MỘT lượt gọi D1 (db.batch). Null nếu không có hồ sơ. */
export async function getPartyDetail(db: D1Database, id: string): Promise<{ party: PartyRow; contacts: ContactRow[]; roles: RoleRow[]; relationships: RelationshipRow[] } | null> {
  const [party, contacts, roles, relationships] = await db.batch([
    db.prepare(FIND).bind(id),
    db.prepare(CONTACTS_OF).bind(id),
    db.prepare(ROLES_OF).bind(id),
    db.prepare(RELATIONSHIPS_OF).bind(id),
  ]);
  const row = (party!.results as PartyRow[])[0];
  if (!row) return null;
  return { party: row, contacts: contacts!.results as ContactRow[], roles: roles!.results as RoleRow[], relationships: relationships!.results as RelationshipRow[] };
}

export async function listRoleTypes(db: D1Database): Promise<TypeRow[]> {
  return (await db.prepare(ROLE_TYPES).all<TypeRow>()).results;
}
export async function listRelationshipTypes(db: D1Database): Promise<TypeRow[]> {
  return (await db.prepare(RELATIONSHIP_TYPES).all<TypeRow>()).results;
}

// ---- Ghi (trả CÂU LỆNH chưa chạy để gộp vào một db.batch() cùng nhật ký — ARCHITECTURE quy tắc 3) ------------------
const INSERT_PARTY = defineSql(
  "parties",
  "insert_party",
  "INSERT INTO pty_party (id, party_kind, display_name, active, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, 1, ?4, ?5, ?4, ?5)",
);
const INSERT_PERSON = defineSql(
  "parties",
  "insert_person",
  `INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5, ?6)`,
);
const INSERT_ORG = defineSql(
  "parties",
  "insert_org",
  `INSERT INTO pty_organization (party_id, legal_name, tax_code, address, invoice_email, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?6, ?7)`,
);
const INSERT_CONTACT = defineSql(
  "parties",
  "insert_contact",
  `INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, label, is_primary, valid_from_date, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?9, ?10)`,
);
const DEMOTE_PRIMARY = defineSql(
  "parties",
  "demote_primary",
  `UPDATE pty_contact_point SET is_primary = 0, updated_at = ?3, updated_by = ?4
   WHERE party_id = ?1 AND contact_kind_code = ?2 AND is_primary = 1 AND valid_to_date IS NULL`,
);
const END_CONTACT = defineSql(
  "parties",
  "end_contact",
  `UPDATE pty_contact_point SET valid_to_date = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND party_id = ?2 AND valid_to_date IS NULL AND ?3 >= valid_from_date`,
);
const INSERT_ROLE = defineSql(
  "parties",
  "insert_role",
  `INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8)`,
);
const END_ROLE = defineSql(
  "parties",
  "end_role",
  `UPDATE pty_party_role SET valid_to_date = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND party_id = ?2 AND valid_to_date IS NULL AND ?3 >= valid_from_date`,
);
const INSERT_RELATIONSHIP = defineSql(
  "parties",
  "insert_relationship",
  `INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, valid_to_date, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8)`,
);
const END_RELATIONSHIP = defineSql(
  "parties",
  "end_relationship",
  `UPDATE pty_party_relationship SET valid_to_date = ?3, updated_at = ?4, updated_by = ?5
   WHERE id = ?1 AND (from_party_id = ?2 OR to_party_id = ?2) AND valid_to_date IS NULL AND ?3 >= valid_from_date`,
);
// Khoá lạc quan: mọi câu sửa hồ sơ mang cùng điều kiện "mốc cập nhật của pty_party còn đúng mốc client đã đọc"; câu sửa pty_party đứng CUỐI
// (nó đổi mốc) nên các câu trước và sau đều thấy cùng một trạng thái trong giao dịch db.batch. Không cần dựa vào bảng của module khác.
const UPDATE_PERSON = defineSql(
  "parties",
  "update_person",
  `UPDATE pty_person SET family_name = ?2, middle_name = ?3, given_name = ?4, updated_at = ?5, updated_by = ?6
   WHERE party_id = ?1 AND (SELECT updated_at FROM pty_party WHERE id = ?1) = ?7`,
);
const UPDATE_ORG = defineSql(
  "parties",
  "update_org",
  `UPDATE pty_organization SET legal_name = ?2, tax_code = ?3, address = ?4, invoice_email = ?5, updated_at = ?6, updated_by = ?7
   WHERE party_id = ?1 AND (SELECT updated_at FROM pty_party WHERE id = ?1) = ?8`,
);
const UPDATE_PARTY = defineSql(
  "parties",
  "update_party",
  "UPDATE pty_party SET display_name = ?2, active = ?3, updated_at = ?4, updated_by = ?5 WHERE id = ?1 AND updated_at = ?6",
);

const contactStatement = (db: D1Database, partyId: string, c: ContactInput, from: string, actorId: string | null, at: string): D1PreparedStatement =>
  db.prepare(INSERT_CONTACT).bind(crypto.randomUUID(), partyId, c.kind, c.value, c.valueNormalized, c.label, c.isPrimary ? 1 : 0, from, at, actorId);

const roleStatement = (db: D1Database, partyId: string, r: RoleInput, actorId: string | null, at: string): D1PreparedStatement =>
  db.prepare(INSERT_ROLE).bind(crypto.randomUUID(), partyId, r.roleTypeCode, r.locationId, r.from, r.to, at, actorId);

/** Tạo hồ sơ cá nhân (+ liên hệ + vai trò ban đầu). API công khai cho module khác (staff tạo tài khoản kèm hồ sơ + vai STAFF). */
export function newPersonStatements(
  db: D1Database,
  input: { name: PersonName; contacts?: ContactInput[]; roles?: RoleInput[]; contactsFrom: string },
  actorId: string | null,
  at: string,
): { partyId: string; statements: D1PreparedStatement[] } {
  const partyId = crypto.randomUUID();
  const { name } = input;
  return {
    partyId,
    statements: [
      db.prepare(INSERT_PARTY).bind(partyId, "PERSON", composePersonName(name), at, actorId),
      db.prepare(INSERT_PERSON).bind(partyId, name.family, name.middle, name.given, at, actorId),
      ...(input.contacts ?? []).map((c) => contactStatement(db, partyId, c, input.contactsFrom, actorId, at)),
      ...(input.roles ?? []).map((r) => roleStatement(db, partyId, r, actorId, at)),
    ],
  };
}

export function newOrganizationStatements(
  db: D1Database,
  input: { org: OrgFields; contacts?: ContactInput[]; contactsFrom: string },
  actorId: string | null,
  at: string,
): { partyId: string; statements: D1PreparedStatement[] } {
  const partyId = crypto.randomUUID();
  const { org } = input;
  return {
    partyId,
    statements: [
      db.prepare(INSERT_PARTY).bind(partyId, "ORGANIZATION", org.displayName, at, actorId),
      db.prepare(INSERT_ORG).bind(partyId, org.legalName, org.taxCode, org.address, org.invoiceEmail, at, actorId),
      ...(input.contacts ?? []).map((c) => contactStatement(db, partyId, c, input.contactsFrom, actorId, at)),
    ],
  };
}

/** Sửa hồ sơ có khoá lạc quan. Kết quả db.batch: phần tử CUỐI (UPDATE pty_party) có changes() = 0 nghĩa là mốc đã cũ (409). */
export function updatePartyStatements(
  db: D1Database,
  id: string,
  v: { kind: "PERSON"; name: PersonName; active: boolean; expectedUpdatedAt: string } | { kind: "ORGANIZATION"; org: OrgFields; active: boolean; expectedUpdatedAt: string },
  actorId: string,
  at: string,
): D1PreparedStatement[] {
  if (v.kind === "PERSON") {
    return [
      db.prepare(UPDATE_PERSON).bind(id, v.name.family, v.name.middle, v.name.given, at, actorId, v.expectedUpdatedAt),
      db.prepare(UPDATE_PARTY).bind(id, composePersonName(v.name), v.active ? 1 : 0, at, actorId, v.expectedUpdatedAt),
    ];
  }
  return [
    db.prepare(UPDATE_ORG).bind(id, v.org.legalName, v.org.taxCode, v.org.address, v.org.invoiceEmail, at, actorId, v.expectedUpdatedAt),
    db.prepare(UPDATE_PARTY).bind(id, v.org.displayName, v.active ? 1 : 0, at, actorId, v.expectedUpdatedAt),
  ];
}

/** Thêm một liên hệ; nếu là liên hệ chính thì hạ liên hệ chính đang mở cùng loại xuống trước (một liên hệ chính mỗi loại). */
export function addContactStatements(db: D1Database, partyId: string, c: ContactInput, from: string, actorId: string, at: string): D1PreparedStatement[] {
  return [...(c.isPrimary ? [db.prepare(DEMOTE_PRIMARY).bind(partyId, c.kind, at, actorId)] : []), contactStatement(db, partyId, c, from, actorId, at)];
}
export const endContactStatement = (db: D1Database, partyId: string, contactId: string, to: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(END_CONTACT).bind(contactId, partyId, to, at, actorId);

export const addRoleStatement = (db: D1Database, partyId: string, r: RoleInput, actorId: string, at: string): D1PreparedStatement => roleStatement(db, partyId, r, actorId, at);
export const endRoleStatement = (db: D1Database, partyId: string, roleId: string, to: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(END_ROLE).bind(roleId, partyId, to, at, actorId);

export const addRelationshipStatement = (db: D1Database, r: RelationshipInput, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(INSERT_RELATIONSHIP).bind(crypto.randomUUID(), r.fromPartyId, r.toPartyId, r.typeCode, r.from, r.to, at, actorId);
export const endRelationshipStatement = (db: D1Database, partyId: string, relationshipId: string, to: string, actorId: string, at: string): D1PreparedStatement =>
  db.prepare(END_RELATIONSHIP).bind(relationshipId, partyId, to, at, actorId);
```

- [ ] **Bước 2: Tạo/ghi `src/modules/parties/index.ts`**

```ts
// Module parties — hồ sơ (cá nhân/tổ chức), liên hệ, vai trò theo nơi, quan hệ (ADR-0001, ADR-0008). Route: /api/parties*.
// Phụ thuộc: locations (khoá ngoại + nhãn nơi qua view công bố) và audit (dấu vết). Module khác CHỈ import từ file này.
// Ghi dữ liệu trả CÂU LỆNH chưa chạy (newPersonStatements…) để module gọi gộp vào một db.batch() — `staff` tạo tài khoản kèm hồ sơ như vậy.
import { auditStatement } from "../audit";
import type {
  ContactPointDto, PartyDto, PartyListItemDto, PartyListResponse, PartyLookupResponse, PartyMetaResponse, PartyRelationshipDto, PartyResponse, PartyRoleDto,
} from "../../shared/contracts";
import { UUID_RE, error, escapeLike, intParam, json, readJson } from "../../shared/http";
import { normalizePhone } from "../../shared/phone";
import { route, type AppModule } from "../../shared/router";
import { vnToday } from "../../shared/vn-date";
import {
  addContactStatements, addRelationshipStatement, addRoleStatement, endContactStatement, endRelationshipStatement, endRoleStatement, findParty, findPartiesByPhone,
  getPartyDetail, listParties, listRelationshipTypes, listRoleTypes, newOrganizationStatements, newPersonStatements, updatePartyStatements,
  type PartyListRow, type PartyRow, type ContactRow, type RelationshipRow, type RoleRow,
} from "./repository";
import {
  PARTY_ID_RE, ROW_ID_RE, composePersonName, splitPersonName, validateContact, validateEndDate, validatePartyCreate, validatePartyUpdate, validateRelationship, validateRole,
} from "./rules";

export { composePersonName, newOrganizationStatements, newPersonStatements, findPartiesByPhone, splitPersonName };
export type { ContactInput, OrgFields, PersonName, RoleInput } from "./rules";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy hồ sơ.");
const STALE = () => error(409, "stale", "Hồ sơ vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
const NOT_OPEN = () => error(409, "not_open", "Dòng này không còn đang hiệu lực (đã đóng hoặc không tồn tại), hoặc ngày kết thúc trước ngày bắt đầu.");

/** Lỗi ràng buộc của CSDL → phản hồi rõ nghĩa; lỗi lạ trả null để ném lên (500 có requestId). */
function constraintProblem(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : "";
  if (/party_role_overlap|pty_party_role_open_uq/.test(m)) return error(409, "role_overlap", "Hồ sơ này đã giữ vai trò đó ở nơi đó trong khoảng thời gian trùng.");
  if (/party_relationship_overlap|UNIQUE constraint failed: pty_party_relationship/.test(m)) return error(409, "relationship_overlap", "Quan hệ này đã có trong khoảng thời gian trùng.");
  if (/FOREIGN KEY constraint failed/.test(m)) return error(400, "invalid_input", "Loại vai trò/quan hệ, địa điểm hoặc hồ sơ liên quan không tồn tại.");
  return null;
}

const toListItem = (r: PartyListRow): PartyListItemDto => ({
  id: r.id,
  kind: r.party_kind,
  displayName: r.display_name,
  active: r.active === 1,
  primaryPhone: r.primary_phone,
  roleCodes: r.role_codes ? [...new Set(r.role_codes.split(","))] : [],
});

const toContact = (c: ContactRow): ContactPointDto => ({
  id: c.id,
  kind: c.contact_kind_code as ContactPointDto["kind"],
  value: c.value,
  label: c.label,
  isPrimary: c.is_primary === 1,
  validFrom: c.valid_from_date,
  validTo: c.valid_to_date,
});
const toRole = (r: RoleRow): PartyRoleDto => ({
  id: r.id,
  roleTypeCode: r.role_type_code,
  roleName: r.role_name,
  locationId: r.location_id,
  locationName: r.location_name,
  validFrom: r.valid_from_date,
  validTo: r.valid_to_date,
});
const toRelationship = (r: RelationshipRow): PartyRelationshipDto => ({
  id: r.id,
  typeCode: r.relationship_type_code,
  typeName: r.type_name,
  fromPartyId: r.from_party_id,
  fromPartyName: r.from_name,
  toPartyId: r.to_party_id,
  toPartyName: r.to_name,
  validFrom: r.valid_from_date,
  validTo: r.valid_to_date,
});

function toDetail(d: { party: PartyRow; contacts: ContactRow[]; roles: RoleRow[]; relationships: RelationshipRow[] }, today: string): PartyDto {
  const p = d.party;
  const roles = d.roles.map(toRole);
  const openRoleCodes = roles.filter((r) => r.validFrom <= today && (r.validTo === null || r.validTo >= today)).map((r) => r.roleTypeCode);
  return {
    id: p.id,
    kind: p.party_kind,
    displayName: p.display_name,
    active: p.active === 1,
    primaryPhone: d.contacts.find((c) => c.contact_kind_code === "PHONE" && c.is_primary === 1 && c.valid_to_date === null)?.value ?? null,
    roleCodes: [...new Set(openRoleCodes)],
    familyName: p.family_name,
    middleName: p.middle_name,
    givenName: p.given_name,
    legalName: p.legal_name,
    taxCode: p.tax_code,
    address: p.address,
    invoiceEmail: p.invoice_email,
    contacts: d.contacts.map(toContact),
    roles,
    relationships: d.relationships.map(toRelationship),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

const KIND_LABEL = { PERSON: "cá nhân", ORGANIZATION: "tổ chức" } as const;
const idParam = (params: Record<string, string>, name: string, re: RegExp): string | null => (re.test(params[name] ?? "") ? params[name]! : null);

async function respondParty(db: D1Database, id: string, status = 200): Promise<Response> {
  const detail = await getPartyDetail(db, id);
  return detail ? json({ party: toDetail(detail, vnToday(new Date())) } satisfies PartyResponse, status) : NOT_FOUND();
}

export const partiesModule: AppModule = {
  name: "parties",
  routes: [
    // ---- Tra cứu (khai TRƯỚC :id để "meta"/"lookup" không bị hiểu là id) ------------------------------------------------
    route("GET", "/api/parties/meta", "staff", async ({ env }) => {
      const [roleTypes, relationshipTypes] = await Promise.all([listRoleTypes(env.DB), listRelationshipTypes(env.DB)]);
      return json({ roleTypes, relationshipTypes } satisfies PartyMetaResponse);
    }),

    route("GET", "/api/parties/lookup", "staff", async ({ env, url }) => {
      const phone = normalizePhone(url.searchParams.get("phone") ?? "");
      if (!phone) return error(400, "invalid_input", "Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
      const rows = await findPartiesByPhone(env.DB, phone, vnToday(new Date()));
      return json({ matches: rows.map(toListItem) } satisfies PartyLookupResponse);
    }),

    route("GET", "/api/parties", "staff", async ({ env, url }) => {
      const kindRaw = url.searchParams.get("kind");
      if (kindRaw && kindRaw !== "PERSON" && kindRaw !== "ORGANIZATION") return error(400, "invalid_input", "Loại hồ sơ lọc không hợp lệ.");
      const role = url.searchParams.get("role") || null;
      if (role && !/^[A-Z][A-Z_]{1,29}$/.test(role)) return error(400, "invalid_input", "Mã vai trò lọc không hợp lệ.");
      const location = url.searchParams.get("location") || null;
      if (location && !UUID_RE.test(location)) return error(400, "invalid_input", "Địa điểm lọc không hợp lệ.");
      const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
      const digits = q.replace(/\D/g, "");
      const limit = intParam(url.searchParams.get("limit"), 30, 1, 100);
      const { rows, hasMore } = await listParties(env.DB, {
        today: vnToday(new Date()),
        kind: (kindRaw as "PERSON" | "ORGANIZATION" | null) || null,
        q: q ? `%${escapeLike(q)}%` : null,
        phoneLike: q && digits.length >= 3 ? `%${digits}%` : null,
        roleCode: role,
        locationId: location,
        includeInactive: url.searchParams.get("includeInactive") === "1",
        limit,
        offset: intParam(url.searchParams.get("offset"), 0, 0, 100000),
      });
      return json({ parties: rows.map(toListItem), hasMore } satisfies PartyListResponse);
    }),

    // ---- Tạo / xem / sửa -----------------------------------------------------------------------------------------------
    route("POST", "/api/parties", "staff", async ({ request, env, staff }) => {
      const parsed = validatePartyCreate(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const now = new Date();
      const at = now.toISOString();
      const today = vnToday(now);
      const made =
        v.kind === "PERSON"
          ? newPersonStatements(env.DB, { name: v.name, contacts: v.contacts, contactsFrom: today }, staff.id, at)
          : newOrganizationStatements(env.DB, { org: v.org, contacts: v.contacts, contactsFrom: today }, staff.id, at);
      const name = v.kind === "PERSON" ? composePersonName(v.name) : v.org.displayName;
      // Không ghi SĐT/email/MST vào nhật ký (chỉ tên và loại) — đặc tả N1 §5.
      await env.DB.batch([...made.statements, auditStatement(env.DB, { staffId: staff.id, action: "party_created", at, targetType: "party", targetId: made.partyId, detail: `${KIND_LABEL[v.kind]} "${name}"` })]);
      return respondParty(env.DB, made.partyId, 201);
    }),

    route("GET", "/api/parties/:id", "staff", async ({ env, params }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      return id ? respondParty(env.DB, id) : NOT_FOUND();
    }),

    route("PUT", "/api/parties/:id", "staff", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      const current = id ? await findParty(env.DB, id) : null;
      if (!id || !current) return NOT_FOUND();
      const parsed = validatePartyUpdate(await readJson(request), current.party_kind);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const at = new Date().toISOString();
      const stmts = updatePartyStatements(env.DB, id, parsed.value, staff.id, at);
      const results = await env.DB.batch([...stmts, auditStatement(env.DB, { staffId: staff.id, action: "party_updated", at, targetType: "party", targetId: id, detail: `${KIND_LABEL[current.party_kind]}` }, "changes() > 0")]);
      if ((results[stmts.length - 1]!.meta.changes ?? 0) === 0) return STALE();
      return respondParty(env.DB, id);
    }),

    // ---- Liên hệ (SALES/ACCOUNTING/ADMIN: như sửa hồ sơ) ------------------------------------------------------------------
    route("POST", "/api/parties/:id/contacts", "staff", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      const detail = id ? await getPartyDetail(env.DB, id) : null;
      if (!id || !detail) return NOT_FOUND();
      const parsed = validateContact(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const c = parsed.value;
      // Chưa có liên hệ đang mở cùng loại thì liên hệ này tự thành liên hệ chính.
      const hasOpen = detail.contacts.some((x) => x.contact_kind_code === c.kind && x.valid_to_date === null);
      if (!hasOpen) c.isPrimary = true;
      const now = new Date();
      const at = now.toISOString();
      await env.DB.batch([
        ...addContactStatements(env.DB, id, c, vnToday(now), staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_contact_changed", at, targetType: "party", targetId: id, detail: c.kind === "PHONE" ? "thêm số điện thoại" : "thêm email" }),
      ]);
      return respondParty(env.DB, id, 201);
    }),

    route("POST", "/api/parties/:id/contacts/:cid/end", "staff", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      const cid = idParam(params, "cid", ROW_ID_RE);
      if (!id || !cid || !(await findParty(env.DB, id))) return NOT_FOUND();
      const now = new Date();
      const to = validateEndDate(await readJson(request), vnToday(now));
      if (!to.ok) return error(400, "invalid_input", to.message);
      const at = now.toISOString();
      const results = await env.DB.batch([
        endContactStatement(env.DB, id, cid, to.value, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_contact_changed", at, targetType: "party", targetId: id, detail: "đóng một liên hệ" }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return NOT_OPEN();
      return respondParty(env.DB, id);
    }),

    // ---- Vai trò theo nơi (chỉ quản trị viên: ADR-0007 "vai trò hồ sơ") ----------------------------------------------------------
    route("POST", "/api/parties/:id/roles", "admin", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id || !(await findParty(env.DB, id))) return NOT_FOUND();
      const now = new Date();
      const parsed = validateRole(await readJson(request), vnToday(now));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const at = now.toISOString();
      try {
        await env.DB.batch([
          addRoleStatement(env.DB, id, parsed.value, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "party_role_added", at, targetType: "party", targetId: id, detail: parsed.value.roleTypeCode }),
        ]);
      } catch (e) {
        const problem = constraintProblem(e);
        if (problem) return problem;
        throw e;
      }
      return respondParty(env.DB, id, 201);
    }),

    route("POST", "/api/parties/:id/roles/:rid/end", "admin", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      const rid = idParam(params, "rid", ROW_ID_RE);
      if (!id || !rid || !(await findParty(env.DB, id))) return NOT_FOUND();
      const now = new Date();
      const to = validateEndDate(await readJson(request), vnToday(now));
      if (!to.ok) return error(400, "invalid_input", to.message);
      const at = now.toISOString();
      const results = await env.DB.batch([
        endRoleStatement(env.DB, id, rid, to.value, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_role_ended", at, targetType: "party", targetId: id }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return NOT_OPEN();
      return respondParty(env.DB, id);
    }),

    // ---- Quan hệ giữa hai hồ sơ (chỉ quản trị viên — đề xuất của đặc tả N1 §7.2, đã duyệt) ------------------------------------------
    route("POST", "/api/parties/:id/relationships", "admin", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      if (!id || !(await findParty(env.DB, id))) return NOT_FOUND();
      const now = new Date();
      const parsed = validateRelationship(await readJson(request), id, vnToday(now));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const at = now.toISOString();
      try {
        await env.DB.batch([
          addRelationshipStatement(env.DB, parsed.value, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "party_relationship_changed", at, targetType: "party", targetId: id, detail: `thêm quan hệ ${parsed.value.typeCode}` }),
        ]);
      } catch (e) {
        const problem = constraintProblem(e);
        if (problem) return problem;
        throw e;
      }
      return respondParty(env.DB, id, 201);
    }),

    route("POST", "/api/parties/:id/relationships/:rid/end", "admin", async ({ request, env, params, staff }) => {
      const id = idParam(params, "id", PARTY_ID_RE);
      const rid = idParam(params, "rid", ROW_ID_RE);
      if (!id || !rid || !(await findParty(env.DB, id))) return NOT_FOUND();
      const now = new Date();
      const to = validateEndDate(await readJson(request), vnToday(now));
      if (!to.ok) return error(400, "invalid_input", to.message);
      const at = now.toISOString();
      const results = await env.DB.batch([
        endRelationshipStatement(env.DB, id, rid, to.value, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "party_relationship_changed", at, targetType: "party", targetId: id, detail: "kết thúc một quan hệ" }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return NOT_OPEN();
      return respondParty(env.DB, id);
    }),
  ],
};
```

- [ ] **Bước 3: Thêm vào CUỐI `src/shared/contracts.ts`** — DTO hồ sơ

```ts
// ---- Hồ sơ (module parties) --------------------------------------------------
export type PartyKind = "PERSON" | "ORGANIZATION";

export interface ContactPointDto {
  id: string;
  kind: "PHONE" | "EMAIL";
  value: string;
  label: string | null;
  isPrimary: boolean;
  /** Ngày dân sự giờ Việt Nam (YYYY-MM-DD). `validTo` null = còn hiệu lực. */
  validFrom: string;
  validTo: string | null;
}

export interface PartyRoleDto {
  id: string;
  roleTypeCode: string;
  roleName: string;
  locationId: string | null;
  locationName: string | null;
  validFrom: string;
  validTo: string | null;
}

export interface PartyRelationshipDto {
  id: string;
  typeCode: string;
  typeName: string;
  fromPartyId: string;
  fromPartyName: string;
  toPartyId: string;
  toPartyName: string;
  validFrom: string;
  validTo: string | null;
}

export interface PartyListItemDto {
  id: string;
  kind: PartyKind;
  displayName: string;
  active: boolean;
  primaryPhone: string | null;
  /** Mã vai trò đang hiệu lực hôm nay (giờ VN). */
  roleCodes: string[];
}

export interface PartyDto extends PartyListItemDto {
  familyName: string | null;
  middleName: string | null;
  givenName: string | null;
  legalName: string | null;
  taxCode: string | null;
  address: string | null;
  invoiceEmail: string | null;
  contacts: ContactPointDto[];
  roles: PartyRoleDto[];
  relationships: PartyRelationshipDto[];
  createdAt: string;
  /** Mốc cập nhật cuối — gửi lại làm `expectedUpdatedAt` khi sửa (khoá lạc quan). */
  updatedAt: string;
}

export interface PartyListResponse { parties: PartyListItemDto[]; hasMore: boolean }
export interface PartyLookupResponse { matches: PartyListItemDto[] }
export interface PartyResponse { party: PartyDto }
export interface PartyMetaResponse {
  roleTypes: { code: string; name: string }[];
  relationshipTypes: { code: string; name: string }[];
}
```

- [ ] **Bước 4: Sửa `src/index.ts`**

Thay đoạn (đúng một chỗ):

```ts
import { locationsModule } from "./modules/locations";
```

bằng:

```ts
import { locationsModule } from "./modules/locations";
import { partiesModule } from "./modules/parties";
```

Thay đoạn (đúng một chỗ):

```ts
auditModule, locationsModule],
```

bằng:

```ts
auditModule, locationsModule, partiesModule],
```

- [ ] **Bước 5: Sửa `src/architecture.test.ts`** — `parties` chuyển từ LEGACY (tạm ở T7) sang STRICT

Thay đoạn (đúng một chỗ):

```ts
const STRICT: readonly { module: string; file: string }[] = [
  { module: "locations", file: "modules/locations/repository.ts" },
];
```

bằng:

```ts
const STRICT: readonly { module: string; file: string }[] = [
  { module: "locations", file: "modules/locations/repository.ts" },
  { module: "parties", file: "modules/parties/repository.ts" },
];
```

Thay đoạn (đúng một chỗ):

```ts
 * Hạn: `staff` chuyển sang STRICT ở kế hoạch N1-B (Task B1); `audit`/`orders` bỏ JOIN thẳng bảng khi chạm ở N1-B (Task B4) và còn wonGuard của orders tới N2;
 * `accounts`, `auth`, `catalog` chưa có SQL riêng đáng kể — chuyển STRICT khi có SQL mới.
 */
const LEGACY = ["accounts", "audit", "auth", "catalog", "orders", "staff", "parties"] as const;
```

bằng:

```ts
 * Hạn: `staff` chuyển sang STRICT ở kế hoạch N1-B (Task B1); `audit`/`orders` bỏ JOIN thẳng bảng khi chạm ở N1-B (Task B4) và còn wonGuard của orders tới N2;
 * `accounts`, `auth`, `catalog` chưa có SQL riêng đáng kể — chuyển STRICT khi có SQL mới.
 */
const LEGACY = ["accounts", "audit", "auth", "catalog", "orders", "staff"] as const;
```

- [ ] **Bước 6: Tạo/ghi `tests/e2e/parties.mjs`**

```js
// Hồ sơ (module parties): tạo/tra cứu/sửa với khoá lạc quan, liên hệ (một liên hệ chính), vai trò theo nơi, quan hệ, nhật ký không lộ dữ liệu cá nhân.
import assert from "node:assert/strict";
import { ACCOUNTS, call, randomPhone, session, vnDate } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const tag = String(Date.now()).slice(-6);
const phone = randomPhone();
const P = (id) => `/api/parties/${id}`;

// --- phải đăng nhập; danh mục tra cứu
assert.equal((await call(null, "GET", "/api/parties")).status, 401);
let r = await call(SALES, "GET", "/api/parties/meta");
assert.equal(r.status, 200);
assert.deepEqual(r.body.roleTypes.map((t) => t.code).sort(), ["ACCOUNTANT", "AGENT", "BOAT_CAPTAIN", "CUSTOMER", "DRIVER", "GUIDE", "SALES", "STAFF"]);
assert.deepEqual(r.body.relationshipTypes.map((t) => t.code), ["CONTACT_OF"]);
const locations = (await call(SALES, "GET", "/api/locations")).body.locations;
const vinpearl = locations.find((l) => l.code === "CANG_VINPEARL");
const pier = locations.find((l) => l.code === "BEN_TAU_NHA_TRANG");
console.log("✓ danh mục vai trò/quan hệ");

// --- tạo cá nhân (fullName được tách) kèm liên hệ; SALES tạo được
r = await call(SALES, "POST", "/api/parties", { kind: "PERSON", fullName: `  Nguyễn   Thử ${tag}  Phong `, contacts: [{ kind: "PHONE", value: phone.replace(/^0/, "+84 "), label: "Zalo" }, { kind: "EMAIL", value: "Phong.Test@Example.com" }] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const A = r.body.party;
assert.equal(A.kind, "PERSON"); assert.equal(A.displayName, `Nguyễn Thử ${tag} Phong`);
assert.equal(A.familyName, "Nguyễn"); assert.equal(A.middleName, `Thử ${tag}`); assert.equal(A.givenName, "Phong");
assert.equal(A.primaryPhone, phone.replace(/^0/, "+84 ")); assert.deepEqual(A.roleCodes, []); assert.equal(A.active, true);
assert.equal(A.contacts.length, 2); assert.ok(A.contacts.every((c) => c.isPrimary && c.validTo === null));
console.log("✓ tạo cá nhân + tách tên + liên hệ chính tự đặt");

// --- đầu vào sai
for (const bad of [{}, { kind: "ROBOT" }, { kind: "PERSON" }, { kind: "PERSON", fullName: "A", contacts: [{ kind: "PHONE", value: "123" }] }, { kind: "ORGANIZATION" }, { kind: "ORGANIZATION", displayName: "X", taxCode: "12" }]) {
  assert.equal((await call(SALES, "POST", "/api/parties", bad)).status, 400, JSON.stringify(bad));
}
assert.equal((await call(SALES, "GET", P("khong-phai-id"))).status, 404);
assert.equal((await call(SALES, "GET", P("00000000-0000-0000-0000-000000000000"))).status, 404);
console.log("✓ đầu vào sai, 404");

// --- tra cứu trùng SĐT: tạo hồ sơ thứ hai cùng số là HỢP LỆ (ADR-0001 mục 8), tra cứu trả cả hai
r = await call(SALES, "POST", "/api/parties", { kind: "PERSON", fullName: `Trần Trùng ${tag}`, contacts: [{ kind: "PHONE", value: phone }] });
assert.equal(r.status, 201);
const B = r.body.party;
r = await call(SALES, "GET", `/api/parties/lookup?phone=${encodeURIComponent(phone.replace(/^0/, "+84 "))}`);
assert.equal(r.status, 200);
assert.deepEqual(r.body.matches.map((m) => m.id).sort(), [A.id, B.id].sort());
assert.equal((await call(SALES, "GET", "/api/parties/lookup?phone=abc")).status, 400);
assert.deepEqual((await call(SALES, "GET", `/api/parties/lookup?phone=${randomPhone()}`)).body.matches, []);
console.log("✓ tra cứu trùng SĐT (không chặn tạo)");

// --- tổ chức (đại lý) + MST
r = await call(SALES, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: `Đại lý Thử ${tag}`, legalName: "Công ty TNHH Thử", taxCode: "0312 345 678", invoiceEmail: "KeToan@Thu.vn", address: "1 Trần Phú" });
assert.equal(r.status, 201, JSON.stringify(r.body));
const ORG = r.body.party;
assert.equal(ORG.kind, "ORGANIZATION"); assert.equal(ORG.taxCode, "0312345678"); assert.equal(ORG.invoiceEmail, "ketoan@thu.vn"); assert.equal(ORG.givenName, null);
console.log("✓ tạo tổ chức");

// --- danh sách + tìm kiếm (tên có dấu/không phân biệt hoa thường, SĐT theo chữ số), lọc loại
r = await call(SALES, "GET", `/api/parties?q=${encodeURIComponent(`thử ${tag}`)}`);
assert.ok(r.body.parties.some((p) => p.id === A.id) && r.body.parties.some((p) => p.id === ORG.id));
r = await call(SALES, "GET", `/api/parties?q=${phone.slice(3)}`);
assert.ok(r.body.parties.some((p) => p.id === A.id) && r.body.parties.some((p) => p.id === B.id), "tìm theo SĐT");
r = await call(SALES, "GET", `/api/parties?q=${encodeURIComponent(`thử ${tag}`)}&kind=ORGANIZATION`);
assert.deepEqual(r.body.parties.map((p) => p.id), [ORG.id]);
assert.equal((await call(SALES, "GET", "/api/parties?kind=ROBOT")).status, 400);
assert.equal((await call(SALES, "GET", "/api/parties?q=%25")).body.parties.length, 0, "ký tự LIKE được escape");
console.log("✓ danh sách + tìm kiếm");

// --- sửa với khoá lạc quan; tên hiển thị ghép lại từ ba phần
const edit = { fullName: `Nguyễn Thử ${tag} Phong Đã Sửa`, active: true, expectedUpdatedAt: A.updatedAt };
r = await call(SALES, "PUT", P(A.id), edit);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.party.displayName, `Nguyễn Thử ${tag} Phong Đã Sửa`); assert.equal(r.body.party.givenName, "Sửa"); assert.equal(r.body.party.middleName, `Thử ${tag} Phong Đã`);
assert.notEqual(r.body.party.updatedAt, A.updatedAt);
r = await call(SALES, "PUT", P(A.id), { ...edit, fullName: "Từ tab cũ" }); // mốc cũ
assert.equal(r.status, 409); assert.equal(r.body.error.code, "stale");
assert.equal((await call(SALES, "GET", P(A.id))).body.party.displayName, `Nguyễn Thử ${tag} Phong Đã Sửa`, "bên thua không để lại thay đổi nào");
assert.equal((await call(SALES, "PUT", P(A.id), { ...edit, expectedUpdatedAt: undefined })).status, 400);
console.log("✓ sửa + khoá lạc quan");

// --- hai request song song cùng mốc: đúng MỘT bên thắng, hồ sơ nhất quán (tên hiển thị khớp ba phần)
const cur = (await call(SALES, "GET", P(A.id))).body.party;
const [x, y] = await Promise.all([
  call(SALES, "PUT", P(A.id), { fullName: `Lê Song ${tag} Một`, active: true, expectedUpdatedAt: cur.updatedAt }),
  call(ADMIN, "PUT", P(A.id), { fullName: `Vũ Song ${tag} Hai`, active: true, expectedUpdatedAt: cur.updatedAt }),
]);
assert.deepEqual([x.status, y.status].sort(), [200, 409], `song song: ${x.status} ${y.status}`);
const after = (await call(SALES, "GET", P(A.id))).body.party;
assert.equal(after.displayName, [after.familyName, after.middleName, after.givenName].filter(Boolean).join(" "), "tên hiển thị khớp ba phần");
assert.equal(after.displayName, (x.status === 200 ? x : y).body.party.displayName);
console.log("✓ song song: một bên thắng, dữ liệu nhất quán");

// --- ngưng (không xoá): mặc định ẩn khỏi danh sách, includeInactive=1 thì hiện
r = await call(SALES, "PUT", P(B.id), { fullName: B.displayName, active: false, expectedUpdatedAt: B.updatedAt });
assert.equal(r.status, 200); assert.equal(r.body.party.active, false);
assert.ok(!(await call(SALES, "GET", `/api/parties?q=${phone.slice(3)}`)).body.parties.some((p) => p.id === B.id));
assert.ok((await call(SALES, "GET", `/api/parties?q=${phone.slice(3)}&includeInactive=1`)).body.parties.some((p) => p.id === B.id));
console.log("✓ ngưng dùng thay cho xoá");

// --- liên hệ: một liên hệ chính đang mở mỗi loại; thêm chính mới thì hạ chính cũ; đóng không xoá
const phone2 = randomPhone();
r = await call(SALES, "POST", `${P(A.id)}/contacts`, { kind: "PHONE", value: phone2 });
assert.equal(r.status, 201);
assert.equal(r.body.party.contacts.filter((c) => c.kind === "PHONE" && c.isPrimary && !c.validTo).length, 1);
assert.equal(r.body.party.primaryPhone, cur.primaryPhone, "liên hệ thêm sau không tự thành chính");
r = await call(SALES, "POST", `${P(A.id)}/contacts`, { kind: "PHONE", value: randomPhone(), isPrimary: true });
assert.equal(r.status, 201);
const primaries = r.body.party.contacts.filter((c) => c.kind === "PHONE" && c.isPrimary && !c.validTo);
assert.equal(primaries.length, 1, "vẫn đúng một liên hệ chính đang mở");
assert.notEqual(r.body.party.primaryPhone, cur.primaryPhone, "chính mới thay chính cũ");
assert.equal((await call(SALES, "POST", `${P(A.id)}/contacts`, { kind: "PHONE", value: "12" })).status, 400);
const toEnd = r.body.party.contacts.find((c) => c.kind === "PHONE" && !c.isPrimary && !c.validTo);
r = await call(SALES, "POST", `${P(A.id)}/contacts/${toEnd.id}/end`, {});
assert.equal(r.status, 200); assert.ok(r.body.party.contacts.find((c) => c.id === toEnd.id).validTo);
assert.equal((await call(SALES, "POST", `${P(A.id)}/contacts/${toEnd.id}/end`, {})).status, 409, "đóng lần hai");
assert.equal((await call(SALES, "POST", `${P(A.id)}/contacts/khong-phai-id/end`, {})).status, 404);
console.log("✓ liên hệ");

// --- vai trò theo nơi: chỉ quản trị viên; trùng đang mở → 409; nơi khác độc lập; đóng lại
const role = { roleTypeCode: "GUIDE", locationId: vinpearl.id };
assert.equal((await call(SALES, "POST", `${P(A.id)}/roles`, role)).status, 403);
r = await call(ADMIN, "POST", `${P(A.id)}/roles`, role);
assert.equal(r.status, 201, JSON.stringify(r.body));
const guide = r.body.party.roles.find((x) => x.roleTypeCode === "GUIDE");
assert.equal(guide.locationName, "Bến cảng Vinpearl"); assert.equal(guide.validTo, null); assert.deepEqual(r.body.party.roleCodes, ["GUIDE"]);
r = await call(ADMIN, "POST", `${P(A.id)}/roles`, role);
assert.equal(r.status, 409); assert.equal(r.body.error.code, "role_overlap");
assert.equal((await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: "GUIDE", locationId: pier.id })).status, 201, "nơi khác độc lập");
assert.equal((await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: "GUIDE", locationId: "00000000-0000-0000-0000-000000000000" })).status, 400, "nơi không tồn tại");
assert.equal((await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: "KHONG_CO" })).status, 400, "loại vai trò không tồn tại");
assert.equal((await call(ADMIN, "POST", `${P(A.id)}/roles`, { roleTypeCode: "DRIVER", validFrom: "2026-02-30" })).status, 400);

// Truy vấn của đợt N1: ai giữ vai HDV ở Bến cảng Vinpearl hôm nay
r = await call(SALES, "GET", `/api/parties?role=GUIDE&location=${vinpearl.id}`);
assert.deepEqual(r.body.parties.map((p) => p.id), [A.id]);
assert.equal((await call(SALES, "GET", `/api/parties?role=DRIVER&location=${vinpearl.id}`)).body.parties.length, 0);
// vai đã kết thúc TRƯỚC hôm nay thì không còn "hôm nay"
r = await call(ADMIN, "POST", `${P(ORG.id)}/roles`, { roleTypeCode: "GUIDE", locationId: vinpearl.id, validFrom: vnDate(-10) });
assert.equal(r.status, 201);
const past = r.body.party.roles[0];
r = await call(ADMIN, "POST", `${P(ORG.id)}/roles/${past.id}/end`, { validTo: vnDate(-1) });
assert.equal(r.status, 200);
assert.deepEqual((await call(SALES, "GET", `/api/parties?role=GUIDE&location=${vinpearl.id}`)).body.parties.map((p) => p.id), [A.id], "vai đã hết hạn không còn trong kết quả hôm nay");
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/roles/${past.id}/end`, {})).status, 409, "đã đóng");
assert.equal((await call(SALES, "POST", `${P(A.id)}/roles/${guide.id}/end`, {})).status, 403);
console.log("✓ vai trò theo nơi + truy vấn HDV @ Bến cảng Vinpearl");

// --- quan hệ: người liên hệ của đại lý
const rel = { fromPartyId: A.id, toPartyId: ORG.id, relationshipTypeCode: "CONTACT_OF" };
assert.equal((await call(SALES, "POST", `${P(ORG.id)}/relationships`, rel)).status, 403);
r = await call(ADMIN, "POST", `${P(ORG.id)}/relationships`, rel);
assert.equal(r.status, 201, JSON.stringify(r.body));
const link = r.body.party.relationships[0];
assert.equal(link.fromPartyId, A.id); assert.equal(link.toPartyId, ORG.id); assert.equal(link.typeName, "Người liên hệ của");
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/relationships`, rel)).status, 409, "trùng đang mở");
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/relationships`, { ...rel, toPartyId: A.id, fromPartyId: A.id })).status, 400, "tự quan hệ");
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/relationships`, { ...rel, fromPartyId: B.id, toPartyId: A.id })).status, 400, "hồ sơ đang xem không ở đầu nào");
assert.ok((await call(SALES, "GET", P(A.id))).body.party.relationships.some((x) => x.id === link.id), "thấy được từ cả hai đầu");
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/relationships/${link.id}/end`, {})).status, 200);
assert.equal((await call(ADMIN, "POST", `${P(ORG.id)}/relationships/${link.id}/end`, {})).status, 409);
console.log("✓ quan hệ");

// --- nhật ký: có dòng theo loại đối tượng "party"; KHÔNG lộ SĐT/email/MST
r = await call(ADMIN, "GET", "/api/audit?limit=100&q=" + encodeURIComponent(""));
const partyLogs = r.body.entries.filter((e) => e.targetType === "party");
for (const a of ["party_created", "party_updated", "party_contact_changed", "party_role_added", "party_role_ended", "party_relationship_changed"]) assert.ok(partyLogs.some((e) => e.action === a), `thiếu ${a}`);
const dump = JSON.stringify(r.body);
for (const secret of [phone, phone.slice(1), "Phong.Test@Example.com", "phong.test@example.com", "0312345678", "ketoan@thu.vn"]) assert.ok(!dump.includes(secret), `nhật ký lộ dữ liệu cá nhân: ${secret}`);
assert.equal(partyLogs.filter((e) => e.action === "party_updated" && e.targetId === A.id).length, 2, "hai lần sửa thành công của A (bên thua khoá lạc quan không ghi)");
console.log("✓ nhật ký, không lộ dữ liệu cá nhân");
console.log("E2E PARTIES OK");
```

- [ ] **Bước 7: Sửa `tests/e2e/run.mjs`**

Thay đoạn (đúng một chỗ):

```js
"admin-race", "locations"];
```

bằng:

```js
"admin-race", "locations", "parties"];
```

- [ ] **Bước 8: Chạy** `npm test`

Kỳ vọng: toàn bộ đạt, 0 lỗi. (lần kiểm khi soạn: 157 tests, 157 đạt, 0 lỗi)

- [ ] **Bước 9: Chạy** `npx tsc --noEmit`

Kỳ vọng: không có lỗi (thoát 0).

- [ ] **Bước 10: Chạy** `npx tsc --noEmit -p web --pretty false`

Kỳ vọng: **LỖI** — đúng 4 lỗi đã biết (thuộc A2, KHÔNG sửa ở kế hoạch này): `web/order-form.ts` (101,5) TS2353 và (124,22) TS2339; `web/order.ts` (44,22) TS2339 và (44,33) TS7006. Nếu có lỗi khác là do bước vừa làm.

- [ ] **Bước 11: Chạy** `npm run test:e2e`

Kỳ vọng: `E2E: 9/9 kịch bản xanh` (thêm `locations`, `parties`). (lần kiểm khi soạn: `E2E: 9/9 kịch bản xanh`)

- [ ] **Bước 12: Commit**

```bash
git add <các tệp vừa tạo/sửa>
git commit -m "N1 T8: module parties — SQL đăng ký, API hồ sơ/liên hệ/vai trò/quan hệ, e2e"
```

---

## Tự rà soát (kế hoạch A ↔ đặc tả)

| Đặc tả | Task |
|---|---|
| §1 (a) địa điểm; (b) hồ sơ, liên hệ, vai trò, quan hệ | T3, T6 (locations); T4, T7, T8 (parties) |
| §1 (c) quyền app + liên kết tài khoản–hồ sơ | T5 (schema, backfill); B1 (mã) — kế hoạch B |
| §1 (d) view công bố, sổ dữ liệu, bài kiểm kiến trúc | T1, T3–T5 |
| §3–§4 danh mục thực thể, quan hệ | T3, T4, T5 (migration + sổ) |
| §5 ngữ nghĩa (tách/ghép tên, liên hệ, vai trò theo ngày VN, MST, số đăng nhập ≠ số liên hệ) | T7 (luật), T4/T5 (test schema, backfill), T8 (e2e, nhật ký không lộ dữ liệu cá nhân) |
| §6 R-N1-4, 6, 7, 8, 9, 10, 11, 12 | T4 (chồng lấn, ngày), T1 (R-N1-6/7/9/11/12 bằng máy), T5 (FK sạch) |
| §7.1 `locations`, `parties` (+ `newPersonStatements` cho `staff`) | T6, T8 |
| §7.2 route địa điểm và hồ sơ; khoá lạc quan `expectedUpdatedAt` | T6, T8 (e2e có ca song song) |
| §8 truy vấn 1–3 (HDV ở Bến cảng Vinpearl; trùng SĐT; người liên hệ của đại lý) | T4 (SQL), T8 (API + e2e) |
| §9 migration mở rộng `0009…0012`, id gieo cố định | T3–T5 |
| §11(c) nền nhánh | T0 |
| §12 sổ dữ liệu | T1, T3–T5 |

**Không thuộc kế hoạch A** (có ở kế hoạch B): đổi `role` → quyền và `full_name` → hồ sơ trên máy chủ, giao diện, trang Hồ sơ/Địa điểm, kiểm toán bất biến, tài liệu, `0013`. Không triển khai sau kế hoạch A: nó chưa có phần chuyển quyền/giao diện.

**Điều chỉnh so với đặc tả khi soạn (đã kiểm chứng, không đổi quyết định nào):**
- Điều 8(b) của ADR-0002 (ranh giới SQL) được hiện thực bằng `EXPLAIN` trên schema "ranh giới" (view công bố → bảng rỗng) thay vì quét chuỗi — đúng tinh thần điều 8 ("kiểm ngữ nghĩa"); Node 22 không có `setAuthorizer` nên không dùng móc của SQLite.
- Route `parties` khai `access: "staff"` ở kế hoạch A và đổi sang `"office"` ở Task B1 (router chưa có `office` cho tới B1).
- Cách viết truy vấn danh sách hồ sơ dùng tham số đánh số `?N` (SQLite/D1 hỗ trợ `?NNN`) để giữ SQL tĩnh.
