// HÀNG RÀO 2 — "mỗi ĐƯỜNG GHI phải hỏi bảng quyền, không được chỉ dựa cổng thô" (kế hoạch docs/superpowers/plans/2026-09-24-hang-rao-quyen-va-va-lo-hong-ho-so.md).
//
// Bài học 24/9: 8 route ghi của Hồ sơ, 4 của danh mục, 2 của địa điểm không có lời kiểm quyền nào ngoài `access` của router; cổng "office"
// lại được suy từ ô `order.view` (`isOffice`), nên khi ADR-0017 mở xem đơn cho FIELD thì FIELD sửa được hồ sơ quản trị viên (thí nghiệm
// docs/evidence/2026-09-24-lo-hong-ho-so/). `src/route-access.test.ts` chụp MỨC truy cập nên không thấy: mức không đổi. (Các route
// `/api/staff/:id*` có `mayManage` và `PUT /api/maintenance` có `isAllowedPhone` — kiểm thật, nhưng không qua ô `admin.manage` của MATRIX;
// việc đó là của hàng rào 1.)
//
// Luật của bài kiểm này (phân tích tĩnh trên mã đã che chuỗi/chú thích — scripts/source-mask-lib.mjs):
//   (1) Mọi `route("POST|PUT|PATCH|DELETE", path, access, async (…) => {…})` trong src/modules/*/index.ts có access ≠ "public" phải có
//       trong THÂN handler một lời gọi kiểm quyền được công nhận (GUARDS) mà KẾT QUẢ ĐƯỢC DÙNG (`if (!can(…))`, `const v = can(…)`,
//       `… && can(…)`, `=> MATRIX[…]`…); một lời gọi đứng trơ thành câu lệnh riêng (`can(staff, "x");`) KHÔNG được tính (người kiểm độc lập
//       24/9 chứng minh lời gọi chết qua được bản đầu) — HOẶC có mục "cua_ghi" trong docs/quyen-hoan.json: loại "hoãn" (lý do, kế hoạch,
//       hạn ≥ hôm nay, người chịu trách nhiệm) hay "ngoại lệ" (lý do) — "ngoại lệ" CHỈ dành cho thao tác tự phục vụ trên chính tài khoản
//       đang đăng nhập (access "staff", đường dẫn /api/account/*); route khác phải là "hoãn" có hạn (người kiểm độc lập 24/9: "ngoại lệ"
//       bản đầu né được hạn vĩnh viễn).
//   (2) Mục cho route ĐÃ có kiểm → đỏ ("hoãn thừa"); mục cho route không còn tồn tại → đỏ.
//   (3) Số route bóc được phải bằng số lời gọi `route(` trong tệp: route viết khác khuôn làm bài kiểm đỏ, không im lặng bỏ qua.
// GIỚI HẠN (ghi ở docs/SO-HANG-RAO.md): canh QUÊN, không canh CỐ Ý — không kiểm ô có đúng không, không kiểm `if (can(…)) {}` rỗng, không đi
// vào hàm được gọi (hàm kiểm dùng chung phải có tên trong GUARDS; thêm tên = sửa hàng rào), chỉ đọc src/modules/*/index.ts (route khai ở
// tệp khác sẽ không được thấy — `grep -rn 'route("' src` để chắc). Kiểm "đúng ô" là việc của hàng rào 1 và của người kiểm đọc mã.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { isISODate, vnToday } from "./shared/vn-date.ts";

const SRC = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(SRC, "..");
const DEFERRALS_FILE = "docs/quyen-hoan.json";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
/** "Ngoại lệ" (không hạn) chỉ cho thao tác tự phục vụ trên chính tài khoản đang đăng nhập. */
const SELF_SERVICE = { access: "staff", prefix: "/api/account/" };

/**
 * Hàm kiểm quyền được công nhận — mỗi hàm phải trả lời "NGƯỜI GỌI có được làm không". `hoiBang` = hàm đó (hoặc hàm nó gọi trong cùng tệp)
 * hỏi MATRIX qua `can()`/`MATRIX[`; `mayManage`/`canManageAccount` là luật CẤP BẬC (ADR-0014 điều 8) đi kèm ô `admin.manage` — ô đó đang
 * hoãn ở hàng rào 1. KHÔNG đưa `checkAssignee` vào đây: nó kiểm NGƯỜI ĐƯỢC GIAO có đủ điều kiện, không kiểm người gọi.
 */
const GUARDS: { name: string; file: string; hoiBang: boolean }[] = [
  { name: "can", file: "src/shared/permissions.ts", hoiBang: true },
  { name: "canRead", file: "src/modules/feedback/index.ts", hoiBang: true },
  { name: "handlerChangeVerdict", file: "src/modules/dispatch/rules.ts", hoiBang: true },
  { name: "mayManage", file: "src/modules/accounts/index.ts", hoiBang: false },
  { name: "canManageAccount", file: "src/modules/staff/rules.ts", hoiBang: false },
];
const GUARD_CALL_RE = new RegExp(`\\b(?:${GUARDS.map((g) => g.name).join("|")})\\s*\\(|\\bMATRIX\\[`, "g");

interface RouteInfo {
  module: string;
  method: string;
  path: string;
  access: string;
  guarded: boolean;
}
interface RouteDeferral {
  method: string;
  path: string;
  loai: "hoãn" | "ngoại lệ";
  ly_do?: string;
  ke_hoach?: string;
  han?: string;
  nguoi_chiu_trach_nhiem?: string;
}

const key = (method: string, path: string) => `${method} ${path}`;

/**
 * Thân handler (đã che chuỗi/chú thích) có ít nhất một lời gọi kiểm quyền mà KẾT QUẢ ĐƯỢC DÙNG: ký tự khác khoảng trắng đứng ngay trước
 * lời gọi không phải là `;`, `{`, `}` (đầu câu lệnh). `if (!can(`, `= can(`, `&& can(`, `return can(`, `=> MATRIX[` đều được tính; `can(…);` trơ thì không.
 */
export function isGuardedBody(body: string): boolean {
  for (const m of body.matchAll(GUARD_CALL_RE)) {
    let k = m.index! - 1;
    while (k >= 0 && /\s/.test(body[k]!)) k--;
    const before = k >= 0 ? body[k]! : "{";
    if (before !== ";" && before !== "{" && before !== "}") return true;
  }
  return false;
}

function collectRoutes(): RouteInfo[] {
  const out: RouteInfo[] = [];
  for (const mod of readdirSync(join(SRC, "modules")).sort()) {
    const file = join(SRC, "modules", mod, "index.ts");
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    const masked = maskSource(text); // che chuỗi + chú thích; cùng độ dài nên chỉ số dùng chung với `text`
    const declared = (masked.match(/\broute\(/g) ?? []).length;
    let found = 0;
    for (const hit of text.matchAll(/route\(\s*"(GET|POST|PUT|PATCH|DELETE)",\s*"([^"]+)",\s*"([^"]+)"/g)) {
      found++;
      const tag = `${mod}: route ${hit[1]} ${hit[2]}`;
      const start = hit.index! + hit[0].length;
      const nextRoute = masked.indexOf("route(", start);
      const limit = nextRoute === -1 ? masked.length : nextRoute;
      const arrow = masked.indexOf("=>", start);
      assert.ok(arrow !== -1 && arrow < limit, `${tag}: không thấy handler dạng mũi tên trước route kế tiếp`);
      const open = masked.indexOf("{", arrow);
      assert.ok(open !== -1 && open < limit, `${tag}: handler không có thân {…}`);
      let depth = 0;
      let i = open;
      for (; i < masked.length; i++) {
        if (masked[i] === "{") depth++;
        else if (masked[i] === "}" && --depth === 0) break;
      }
      assert.equal(depth, 0, `${tag}: ngoặc nhọn không cân — bộ che chuỗi/chú thích không hiểu tệp này`);
      out.push({ module: mod, method: hit[1]!, path: hit[2]!, access: hit[3]!, guarded: isGuardedBody(masked.slice(open, i + 1)) });
    }
    assert.equal(found, declared, `${mod}/index.ts: có ${declared} lời gọi route( nhưng chỉ bóc được ${found} theo khuôn route("METHOD", "path", "access", …)`);
  }
  return out;
}

function loadDeferrals(): RouteDeferral[] {
  const raw = JSON.parse(readFileSync(join(ROOT, DEFERRALS_FILE), "utf8")) as { cua_ghi?: unknown };
  assert.ok(Array.isArray(raw.cua_ghi), `${DEFERRALS_FILE}: thiếu mảng "cua_ghi"`);
  return raw.cua_ghi as RouteDeferral[];
}

const routes = collectRoutes();
const deferrals = loadDeferrals();
const deferredKeys = new Set(deferrals.map((d) => key(d.method, d.path)));
const today = vnToday(new Date());

test("hàng rào 2: mọi đường ghi (access ≠ public) hỏi bảng quyền, trừ mục đã khai trong docs/quyen-hoan.json", () => {
  const unguarded = routes
    .filter((r) => WRITE_METHODS.has(r.method) && r.access !== "public" && !r.guarded && !deferredKeys.has(key(r.method, r.path)))
    .map((r) => `${r.method} ${r.path} (${r.module}, access "${r.access}")`);
  assert.deepEqual(
    unguarded,
    [],
    `Đường ghi chỉ dựa cổng thô, không hỏi bảng quyền và không có trong ${DEFERRALS_FILE} (cua_ghi): ${unguarded.join("; ")}. ` +
      `Gọi can(staff, "<ô>") (hay một hàm trong GUARDS) trong thân handler và DÙNG kết quả, hoặc thêm mục hoãn có hạn.`,
  );
});

test("hàng rào 2: danh sách hoãn/ngoại lệ (cua_ghi) không thừa, không cũ, đủ trường, còn hạn; ngoại lệ chỉ cho tự phục vụ", () => {
  const byKey = new Map(routes.map((r) => [key(r.method, r.path), r]));
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const d of deferrals) {
    const k = key(d.method, d.path);
    const tag = `cua_ghi "${k}"`;
    if (seen.has(k)) problems.push(`${tag}: trùng mục`);
    seen.add(k);
    const r = byKey.get(k);
    if (!r) {
      problems.push(`${tag}: route không còn tồn tại — gỡ mục`);
      continue;
    }
    if (!WRITE_METHODS.has(r.method) || r.access === "public") problems.push(`${tag}: không phải đường ghi cần kiểm (public hoặc GET) — gỡ mục`);
    if (r.guarded) problems.push(`${tag}: HOÃN THỪA — handler đã hỏi bảng quyền; gỡ mục để danh sách co lại`);
    if (typeof d.ly_do !== "string" || d.ly_do.trim() === "") problems.push(`${tag}: thiếu "ly_do"`);
    if (d.loai === "ngoại lệ") {
      if (r.access !== SELF_SERVICE.access || !r.path.startsWith(SELF_SERVICE.prefix)) {
        problems.push(`${tag}: "ngoại lệ" chỉ dành cho thao tác tự phục vụ (access "${SELF_SERVICE.access}", đường dẫn ${SELF_SERVICE.prefix}*) — route này phải là "hoãn" có hạn`);
      }
    } else if (d.loai === "hoãn") {
      for (const f of ["ke_hoach", "han", "nguoi_chiu_trach_nhiem"] as const) {
        if (typeof d[f] !== "string" || d[f]!.trim() === "") problems.push(`${tag}: thiếu "${f}"`);
      }
      if (typeof d.han === "string" && !isISODate(d.han)) problems.push(`${tag}: "han" phải là ngày YYYY-MM-DD`);
      else if (typeof d.han === "string" && d.han < today) problems.push(`${tag}: HẾT HẠN HOÃN (${d.han} < ${today}) — vá hoặc chủ dự án gia hạn có ghi lý do`);
    } else problems.push(`${tag}: "loai" phải là "hoãn" hoặc "ngoại lệ"`);
  }
  assert.deepEqual(problems, []);
});

test("hàng rào 2: các hàm kiểm quyền được công nhận có thật, và hàm 'hỏi bảng' thật sự gọi can()/MATRIX", () => {
  for (const g of GUARDS) {
    const file = join(ROOT, g.file);
    assert.ok(existsSync(file), `GUARDS: ${g.file} không tồn tại (${g.name})`);
    const masked = maskSource(readFileSync(file, "utf8"));
    const defined = new RegExp(`\\b(function\\s+${g.name}\\s*\\(|(const|let)\\s+${g.name}\\s*=)`).test(masked);
    assert.ok(defined, `GUARDS: không thấy định nghĩa ${g.name} trong ${g.file}`);
    if (g.hoiBang && g.name !== "can") assert.ok(/\bcan\s*\(|\bMATRIX\[/.test(masked), `GUARDS: ${g.file} không gọi can()/MATRIX — ${g.name} không còn hỏi bảng?`);
  }
});

test("hàng rào 2: lời gọi kiểm quyền phải được DÙNG — lời gọi trơ không tính (tự kiểm trên đoạn mã mẫu)", () => {
  assert.equal(isGuardedBody(`{ can(staff, "x"); return json({}); }`), false, "lời gọi trơ thành câu lệnh riêng không được tính");
  assert.equal(isGuardedBody(`{\n  can(staff, "x")\n  return json({}); }`), false, "lời gọi trơ không dấu chấm phẩy cũng không tính");
  assert.equal(isGuardedBody(`{ if (!can(staff, "x")) return FORBIDDEN(); }`), true);
  assert.equal(isGuardedBody(`{ const ok = can(staff, "x"); if (!ok) return FORBIDDEN(); }`), true);
  assert.equal(isGuardedBody(`{ const v = a && mayManage(admin, t); }`), true);
  assert.equal(isGuardedBody(`{ const n = staff.permissions.some((p) => MATRIX["x"][p] === "assigned"); }`), true);
  assert.equal(isGuardedBody(`{ return handlerChangeVerdict(staff, o, c, id); }`), true);
  assert.equal(isGuardedBody(`{ if (!checkAssignee(t)) return; }`), false, "checkAssignee kiểm người được giao, không phải người gọi — không trong GUARDS");
});

test("hàng rào 2: bộ bóc route nhìn thấy các route đã biết (chống bài kiểm rỗng)", () => {
  const known = ["POST /api/orders", "PUT /api/parties/:id", "PATCH /api/staff/:id", "POST /api/auth/login"];
  const have = new Set(routes.map((r) => key(r.method, r.path)));
  for (const k of known) assert.ok(have.has(k), `không bóc được ${k} — bộ bóc route hỏng?`);
  assert.ok(routes.find((r) => key(r.method, r.path) === "POST /api/orders")!.guarded, "POST /api/orders phải được nhận là có kiểm (can(order.create))");
  assert.ok(routes.find((r) => key(r.method, r.path) === "PUT /api/orders/:id/handler")!.guarded, "PUT …/handler phải được nhận là có kiểm (handlerChangeVerdict)");
});
