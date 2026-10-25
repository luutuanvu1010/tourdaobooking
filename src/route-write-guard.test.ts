// HÀNG RÀO 2 — "mỗi ĐƯỜNG GHI phải hỏi bảng quyền, không được chỉ dựa cổng thô" (kế hoạch docs/superpowers/plans/2026-09-24-hang-rao-quyen-va-va-lo-hong-ho-so.md);
// từ ADR-0019 điều 6 (2026-09-26) phủ thêm MỌI ROUTE — đọc lẫn ghi — sau cổng `office`, `orders`, `admin` (luật (1b) dưới đây).
//
// Bài học 24/9: 8 route ghi của Hồ sơ, 4 của danh mục, 2 của địa điểm không có lời kiểm quyền nào ngoài `access` của router; cổng "office"
// lại được suy từ ô `order.view` (`isOffice`), nên khi ADR-0017 mở xem đơn cho FIELD thì FIELD sửa được hồ sơ quản trị viên (thí nghiệm
// docs/evidence/2026-09-24-lo-hong-ho-so/). `src/route-access.test.ts` chụp MỨC truy cập nên không thấy: mức không đổi. ADR-0019 điều 2: cổng
// chỉ lọc thô — route ĐỌC sau cổng cũng trả tiền, liên hệ khách, hồ sơ, nhật ký…, nên cũng phải hỏi ô của MATRIX trong thân handler.
//
// Luật của bài kiểm này (phân tích tĩnh trên mã đã che chuỗi/chú thích — scripts/source-mask-lib.mjs):
//   (1) Mọi `route("POST|PUT|PATCH|DELETE", path, access, async (…) => {…})` trong src/modules/*/index.ts có access ≠ "public" phải có
//       trong THÂN handler một lời gọi kiểm quyền được công nhận (GUARDS) mà KẾT QUẢ ĐƯỢC DÙNG (`if (!can(…))`, `const v = can(…)`,
//       `… && can(…)`, `=> MATRIX[…]`…); một lời gọi đứng trơ thành câu lệnh riêng (`can(staff, "x");`) KHÔNG được tính (người kiểm độc lập
//       24/9 chứng minh lời gọi chết qua được bản đầu) — HOẶC có mục "cua_ghi" trong docs/quyen-hoan.json: loại "hoãn" (lý do, kế hoạch,
//       hạn ≥ hôm nay, người chịu trách nhiệm) hay "ngoại lệ" (lý do) — "ngoại lệ" CHỈ dành cho thao tác tự phục vụ trên chính tài khoản
//       đang đăng nhập (access "staff", đường dẫn /api/account/*); route khác phải là "hoãn" có hạn (người kiểm độc lập 24/9: "ngoại lệ"
//       bản đầu né được hạn vĩnh viễn).
//   (1b) ADR-0019 điều 6: mọi route — GET lẫn ghi — có access "office", "orders" hay "admin" phải có lời gọi kiểm quyền được dùng kết quả
//       như (1). Route ĐỌC sau ba cổng đó KHÔNG có mục hoãn nào (cua_ghi chỉ nhận đường ghi); đường ghi có mục hoãn còn hạn thì (1)/(2) xét.
//       `GUARDS` KHÔNG thêm tên cho luật này (thêm tên = nới hàng rào). Vì `mayManage` có trong GUARDS, route `/api/staff/:id*` chỉ có
//       `mayManage` vẫn được tính "đã kiểm" dù thiếu `can(…, "admin.manage")` — chỗ hở đó do luật (4) bắt.
//   (2) Mục cho route ĐÃ có kiểm → đỏ ("hoãn thừa"); mục cho route không còn tồn tại → đỏ.
//   (3) Số route bóc được phải bằng số lời gọi `route(` trong tệp: route viết khác khuôn làm bài kiểm đỏ, không im lặng bỏ qua.
//   (4) HÀNG RÀO CỔNG QUẢN TRỊ (ADR-0019 B-5b, siết; cùng bộ bóc route, cơ chế riêng — dòng riêng ở docs/SO-HANG-RAO.md): mọi route access
//       "admin" phải có trong thân handler NGUYÊN VĂN (che chú thích, GIỮ chuỗi để đọc tên ô) một câu `if (… !can(<biến>, "<ô>") …) return …`
//       ở CẤP THÂN handler, với ô viết thẳng thuộc ADMIN_OPS (`admin.manage`, `admin.manage.superadmin`, `feedback.triage`, `settings.ops`).
//       `mayManage`/`canManageAccount` (luật cấp bậc) KHÔNG thay được ô. Không có mục hoãn nào. GIỚI HẠN: canh QUÊN, không canh CỐ Ý —
//       không biết ô có đúng cho route đó không (ô nào trong bốn ô cũng qua), không biết <biến> có phải người gọi không, không canh "đứng trước
//       đọc thân/ghi", `if (!can(…) && false) return` vẫn qua, `if` lồng trong `if` không ngoặc nhọn (`if (a) if (!can(…)) return`) vẫn qua.
// GIỚI HẠN (ghi ở docs/SO-HANG-RAO.md): canh QUÊN, không canh CỐ Ý — chỉ phân biệt "lời gọi đứng trơ thành câu lệnh" với "lời gọi ở vị trí
// biểu thức"; KHÔNG biết kết quả có ảnh hưởng luồng điều khiển (return/throw) hay không, KHÔNG kiểm ô có đúng không. Mọi vị trí biểu thức
// đều được coi là "đã dùng": `void can(…)`, `const u = can(…)` không dùng, `if (can(…)) {}` rỗng, đối số của hàm khác, toán tử phẩy, ngoặc thừa
// (người kiểm độc lập 24/9 chứng minh 8 biến thể). Không đi vào hàm được gọi (hàm kiểm dùng chung phải có tên trong GUARDS; thêm tên = sửa
// hàng rào), chỉ đọc src/modules/*/index.ts (route khai ở tệp khác sẽ không được thấy — `grep -rn 'route("' src` để chắc). Kiểm "đúng ô" và
// "có từ chối thật" là việc của hàng rào 1 và của người kiểm ĐỌC MÃ; "npm test xanh" không phải bằng chứng một lỗ đã vá.
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
  { name: "quyenPhieu", file: "src/modules/feedback/quyen.ts", hoiBang: true }, // ADR-0119: quyền đọc/xử lý phiếu theo tư cách thành viên nhóm; bên trong hỏi can() của MATRIX
  { name: "handlerChangeVerdict", file: "src/modules/dispatch/rules.ts", hoiBang: true },
  { name: "coTheTimDoiTac", file: "src/shared/hoa-hong-hien-thi.ts", hoiBang: true }, // ADR-0141: cổng route nguoi-huong = hàm thuần dùng chung với trang; bên trong hỏi can() (order.create / partner.commission.write) + holdsPartner
  { name: "mayManage", file: "src/modules/accounts/index.ts", hoiBang: false },
  { name: "canManageAccount", file: "src/shared/roles.ts", hoiBang: false }, // ADR-0071: chuyển về src/shared (một nguồn cho máy chủ và giao diện)
];
const GUARD_CALL_RE = new RegExp(`\\b(?:${GUARDS.map((g) => g.name).join("|")})\\s*\\(|\\bMATRIX\\[`, "g");

interface RouteInfo {
  module: string;
  method: string;
  path: string;
  access: string;
  guarded: boolean;
  /** Thân handler `{…}` NGUYÊN VĂN (chưa che) — cho luật (4), cần đọc tên ô trong chuỗi. */
  body: string;
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

/** Luật (4): ô quản trị được công nhận ở route cổng "admin" (ADR-0019 điều 2). Thêm ô = sửa hàng rào (người rà phải thấy). */
// ADR-0075 điều 7: auth.session.viewAll / auth.session.revoke — ô CHỈ Toàn quyền (hẹp hơn admin.manage), cùng khuôn notice.send (ADR-0034).
// ADR-0085: auth.session.policy — chính sách đăng nhập, ô CHỈ Toàn quyền (cùng khuôn hai ô auth.session.* ở trên).
const ADMIN_OPS = ["admin.manage", "admin.manage.superadmin", "feedback.triage", "settings.ops", "notice.send", "auth.session.viewAll", "auth.session.revoke", "auth.session.policy"];
/** Luật (4b) — ADR-0071: ô Quản lý tài khoản được công nhận ở route cổng "accounts". Thêm ô = sửa hàng rào. */
// ADR-0125 đ1: hai ô xác minh phiếu tự khai mở ở cổng accounts — nới có tên (kế hoạch H-4 sự thật 8); ba route /api/parties/xac-minh* hỏi chúng ở đầu thân.
const ACCOUNTS_OPS = ["account.create", "account.view", "account.edit", "party.verify", "party.verify.attachment"];
const denialRe = (ops: readonly string[]) =>
  new RegExp(`!\\s*can\\s*\\(\\s*[A-Za-z_$][\\w$]*(?:\\s*\\.\\s*[A-Za-z_$][\\w$]*)*\\s*,\\s*"(?:${ops.map((o) => o.replace(/\./g, "\\.")).join("|")})"\\s*\\)`, "g");
const ADMIN_DENIAL_RE = denialRe(ADMIN_OPS);
const ACCOUNTS_DENIAL_RE = denialRe(ACCOUNTS_OPS);

/**
 * Luật (4): thân handler NGUYÊN VĂN có một câu `if (… !can(<biến>, "<ô quản trị>") …) return …` (cho phép `{ return`) đứng ở CẤP THÂN handler
 * (độ sâu ngoặc nhọn 1 — `return` trong hàm lồng không rời handler). Lời gọi đúng HAI đối số, ô là chuỗi viết thẳng thuộc ADMIN_OPS, có `!`
 * ngay trước (kết quả sai ⇒ return). CỐ Ý KHÔNG nhận: `mayManage` một mình, biến trung gian (`const ok = can(…); if (!ok) return`), `if (can(…))
 * return`, lời gọi trong chú thích/chuỗi/khuôn mẫu, `if (!can(…)) {}`. Che hai lần trên chính đoạn thân: giữ chuỗi để đọc tên ô, che cả
 * chuỗi để đếm ngoặc và biết lời gọi là MÃ (đoạn thân mở/đóng bằng ngoặc của mã nên che riêng cho cùng kết quả như che cả tệp).
 */
export function hasAdminDenial(rawBody: string, re: RegExp = ADMIN_DENIAL_RE): boolean {
  const code = maskSource(rawBody, { strings: false, comments: true });
  const masked = maskSource(rawBody);
  for (const m of code.matchAll(re)) {
    const at = m.index!;
    const end = at + m[0].length;
    if (!/^!\s*can\s*\(/.test(masked.slice(at))) continue; // chữ trong chuỗi/khuôn mẫu, không phải mã
    let ifAt = -1;
    let open = -1;
    for (const f of masked.slice(0, at).matchAll(/\bif\s*\(/g)) {
      ifAt = f.index!;
      open = f.index! + f[0].length - 1;
    }
    if (ifAt === -1) continue;
    let depth = 0;
    let close = -1;
    for (let k = open; k < masked.length; k++) {
      if (masked[k] === "(") depth++;
      else if (masked[k] === ")" && --depth === 0) {
        close = k;
        break;
      }
    }
    if (close === -1 || end > close) continue; // lời gọi không nằm trong điều kiện của `if` gần nhất
    if (!/^\s*\{?\s*return\b/.test(masked.slice(close + 1))) continue;
    let braces = 0;
    for (let k = 0; k < ifAt; k++) {
      if (masked[k] === "{") braces++;
      else if (masked[k] === "}") braces--;
    }
    if (braces === 1) return true;
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
      out.push({ module: mod, method: hit[1]!, path: hit[2]!, access: hit[3]!, guarded: isGuardedBody(masked.slice(open, i + 1)), body: text.slice(open, i + 1) });
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

/** Cổng chỉ lọc thô (ADR-0019 điều 1–2): sau ba cổng này, route đọc lẫn ghi phải tự hỏi ô của MATRIX. Cổng "staff" (tự phục vụ) và "public" ngoài phạm vi. */
const GATED = new Set(["office", "orders", "admin", "accounts"]); // "accounts" — ADR-0071 (Quản lý tài khoản)

test("hàng rào 2 (ADR-0019): mọi route — đọc lẫn ghi — sau cổng office/orders/admin hỏi bảng quyền trong thân handler; route đọc không có mục hoãn", () => {
  const unguarded = routes
    .filter((r) => GATED.has(r.access) && !r.guarded && !(WRITE_METHODS.has(r.method) && deferredKeys.has(key(r.method, r.path))))
    .map((r) => `${r.method} ${r.path} (${r.module}, access "${r.access}")`);
  assert.deepEqual(
    unguarded,
    [],
    `Route sau cổng ${[...GATED].join("/")} chỉ dựa cổng thô: ${unguarded.join("; ")}. Gọi can(staff, "<ô>") trong thân handler và DÙNG kết quả.`,
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
  const known = ["POST /api/orders", "PUT /api/parties/:id", "PATCH /api/staff/:id", "POST /api/auth/login", "GET /api/orders/dashboard", "GET /api/audit"];
  const have = new Set(routes.map((r) => key(r.method, r.path)));
  for (const k of known) assert.ok(have.has(k), `không bóc được ${k} — bộ bóc route hỏng?`);
  assert.ok(routes.find((r) => key(r.method, r.path) === "POST /api/orders")!.guarded, "POST /api/orders phải được nhận là có kiểm (can(order.create))");
  assert.ok(routes.find((r) => key(r.method, r.path) === "PUT /api/orders/:id/handler")!.guarded, "PUT …/handler phải được nhận là có kiểm (handlerChangeVerdict)");
});

// ---- Luật (4) — hàng rào cổng quản trị (ADR-0019, B-5b). Không có mục hoãn nào: không đọc docs/quyen-hoan.json. ----

test("hàng rào cổng quản trị (ADR-0019): mọi route cổng admin có `if (!can(<người gọi>, \"<ô quản trị>\")) return …` ở cấp thân handler", () => {
  const missing = routes
    .filter((r) => r.access === "admin" && !hasAdminDenial(r.body))
    .map((r) => `${r.method} ${r.path} (${r.module})`);
  assert.deepEqual(
    missing,
    [],
    `Route cổng admin không hỏi ô quản trị bằng chữ viết thẳng: ${missing.join("; ")}. Đầu thân handler phải có ` +
      `if (!can(staff, "<ô>")) return <từ chối>; với ô thuộc ${ADMIN_OPS.join(", ")} — mayManage/canManageAccount (luật cấp bậc) KHÔNG thay được ô.`,
  );
});

test("hàng rào cổng quản trị: bộ đánh giá nhận đúng khuôn, từ chối các khuôn lách (tự kiểm trên đoạn mã mẫu)", () => {
  assert.equal(hasAdminDenial(`{ if (!can(admin, "admin.manage")) return NOT_ADMIN(); }`), true);
  assert.equal(hasAdminDenial(`{ if (!can(ctx.staff, "admin.manage")) return NOT_ADMIN(); }`), true, "biến dạng thành viên (ctx.staff) được nhận");
  assert.equal(hasAdminDenial(`{\n  if (!can(staff, "feedback.triage")) {\n    return error(403);\n  }\n}`), true, "khối `{ return … }` được nhận");
  assert.equal(hasAdminDenial(`{ const db = env.DB; if (!can(staff, "settings.ops")) return F(); }`), true);
  assert.equal(hasAdminDenial(`{ if (!can(staff, "order.view") || !can(staff, "admin.manage.superadmin")) return F(); }`), true, "ô quản trị trong điều kiện ghép");
  assert.equal(hasAdminDenial(`{ const t = await target(ctx); if (!mayManage(admin, t)) return NOT_MANAGER(); }`), false, "chỉ luật cấp bậc (mayManage) — không có ô quản trị");
  assert.equal(hasAdminDenial(`{ if (!can(staff, "order.view")) return F(); }`), false, "ô không phải ô quản trị");
  assert.equal(hasAdminDenial(`{ const ok = can(staff, "admin.manage"); if (!ok) return F(); }`), false, "biến trung gian: CỐ Ý không nhận (viết thẳng trong điều kiện)");
  assert.equal(hasAdminDenial(`{ if (can(staff, "admin.manage")) return F(); }`), false, "không có `!`: kết quả đúng mới return — ngược chiều");
  assert.equal(hasAdminDenial(`{ if (!can(staff, "admin.manage")) {} return F(); }`), false, "khối rỗng");
  assert.equal(hasAdminDenial(`{ if (!can(staff, "admin.manage")) log(); return F(); }`), false, "sau điều kiện không phải return");
  assert.equal(hasAdminDenial(`{ if (!can(staff, "admin.manage", { ownerId: x })) return F(); }`), false, "đúng hai đối số — ô quản trị không có ngữ cảnh");
  assert.equal(hasAdminDenial(`{ xs.map((x) => { if (!can(staff, "admin.manage")) return null; }); return F(); }`), false, "return trong hàm lồng không rời handler");
  assert.equal(hasAdminDenial(`{ if (a) { if (!can(staff, "admin.manage")) return F(); } return G(); }`), false, "không ở cấp thân handler");
  assert.equal(hasAdminDenial(`{ // if (!can(staff, "admin.manage")) return F();\n return G(); }`), false, "trong chú thích");
  assert.equal(hasAdminDenial("{ const s = `if (!can(staff, \"admin.manage\")) return F();`; return G(); }"), false, "trong khuôn mẫu");
  assert.equal(hasAdminDenial(`{ if (x) return y; const v = !can(staff, "admin.manage"); return v; }`), false, "lời gọi sau câu if, không nằm trong điều kiện");
});

// ---- Luật (4b) — ADR-0071: hàng rào cổng Quản lý tài khoản, cùng khuôn luật (4) với ba ô account.*. Không có mục hoãn nào. ----
test("hàng rào cổng accounts (ADR-0071): mọi route cổng accounts có `if (!can(<người gọi>, \"account.*\")) return …` ở cấp thân handler", () => {
  const thuoc = routes.filter((r) => r.access === "accounts");
  const known = ["GET /api/staff", "POST /api/staff", "GET /api/staff/ho-so-khop", "PATCH /api/staff/:id", "PUT /api/staff/:id/permissions", "GET /api/staff/:id/roles", "PUT /api/staff/:id/roles",
    "GET /api/parties/xac-minh", "GET /api/parties/xac-minh/:pid", "POST /api/parties/xac-minh/:pid/xem-so",
    "POST /api/parties/xac-minh/:pid/chap-nhan", "POST /api/parties/xac-minh/:pid/tu-choi"];
  assert.deepEqual(thuoc.map((r) => key(r.method, r.path)).sort(), [...known].sort(), "đúng bảy route Quản lý tài khoản + năm route xác minh phiếu (ADR-0125) ở cổng accounts");
  const missing = thuoc.filter((r) => !hasAdminDenial(r.body, ACCOUNTS_DENIAL_RE)).map((r) => `${r.method} ${r.path} (${r.module})`);
  assert.deepEqual(missing, [], `Route cổng accounts không hỏi ô tài khoản: ${missing.join("; ")}. Đầu thân: if (!can(staff, "<ô>")) return …; ô thuộc ${ACCOUNTS_OPS.join(", ")}.`);
  // Vòng sửa 1 (m-2): ô theo NHÓM đường dẫn — một route xác minh không được "mượn" ô account.* và ngược lại (ACCOUNTS_OPS dùng chung 12 route sẽ cho qua cả hai).
  const NHOM_XAC_MINH = denialRe(["party.verify", "party.verify.attachment"]);
  const NHOM_TAI_KHOAN = denialRe(["account.create", "account.view", "account.edit"]);
  for (const r of thuoc) {
    const xm = r.path.startsWith("/api/parties/xac-minh");
    assert.ok(xm || r.path.startsWith("/api/staff"), `${r.method} ${r.path}: route cổng accounts ngoài hai nhóm đã biết — thêm nhóm có chủ đích`);
    assert.ok(hasAdminDenial(r.body, xm ? NHOM_XAC_MINH : NHOM_TAI_KHOAN), `${r.method} ${r.path}: phải hỏi ${xm ? "party.verify*" : "account.*"}`);
  }
  assert.equal(thuoc.filter((r) => r.path.startsWith("/api/parties/xac-minh")).length, 5, "chống bài rỗng: năm route xác minh");
  assert.equal(hasAdminDenial(`{ if (!can(actor, "account.view")) return F(); }`, denialRe(["party.verify", "party.verify.attachment"])), false, "ô tài khoản không thay ô xác minh");
  assert.equal(hasAdminDenial(`{ if (!can(actor, "account.create")) return F(); }`, ACCOUNTS_DENIAL_RE), true);
  assert.equal(hasAdminDenial(`{ if (!can(actor, "admin.manage")) return F(); }`, ACCOUNTS_DENIAL_RE), false, "ô quản trị không thay ô tài khoản");
  assert.equal(hasAdminDenial(`{ if (!can(actor, "account.create")) return F(); }`), false, "ô tài khoản không thay ô quản trị ở cổng admin");
});

// ADR-0126 đ2 (lát H-5 việc 5): năm route xử lý phiếu xoá ở cổng admin hỏi admin.manage RỒI party.erasure.process (khuôn route đăng chính sách) — ô thứ hai đứng ngay sau ô thứ nhất,
// cùng cấp thân handler. Phá thử: bỏ câu hỏi party.erasure.process ở một route → đỏ.
test("năm route /api/parties/phieu-xoa… hỏi admin.manage rồi party.erasure.process ở đầu thân", () => {
  const thuoc = routes.filter((r) => r.path.startsWith("/api/parties/phieu-xoa"));
  const known = ["GET /api/parties/phieu-xoa", "GET /api/parties/phieu-xoa/:pid", "POST /api/parties/phieu-xoa/:pid/thuc-hien", "POST /api/parties/phieu-xoa/:pid/tu-choi", "POST /api/parties/phieu-xoa/chay-lai"];
  assert.deepEqual(thuoc.map((r) => key(r.method, r.path)).sort(), [...known].sort(), "chống bài rỗng: đúng năm route xử lý phiếu xoá");
  for (const r of thuoc) {
    assert.equal(r.access, "admin", `${r.method} ${r.path}`);
    assert.ok(hasAdminDenial(r.body), `${r.method} ${r.path}: thiếu !can(staff, "admin.manage")`);
    assert.ok(hasAdminDenial(r.body, denialRe(["party.erasure.process"])), `${r.method} ${r.path}: thiếu !can(staff, "party.erasure.process")`);
    const i = r.body.indexOf('"admin.manage"');
    const j = r.body.indexOf('"party.erasure.process"');
    assert.ok(i >= 0 && j > i, `${r.method} ${r.path}: admin.manage phải đứng trước party.erasure.process`);
  }
});

test("hàng rào cổng quản trị: bộ bóc thấy các route cổng admin đã biết và nhận chúng là có ô quản trị (chống bài kiểm rỗng)", () => {
  const known = ["POST /api/staff/:id/reset-pin", "POST /api/staff/:id/unlock", "GET /api/maintenance", "PUT /api/maintenance", "PATCH /api/feedback/:id", "POST /api/parties/:id/roles", "GET /api/audit"];
  for (const k of known) {
    const r = routes.find((x) => key(x.method, x.path) === k);
    assert.ok(r, `không bóc được ${k} — bộ bóc route hỏng?`);
    assert.equal(r.access, "admin", `${k} phải ở cổng admin`);
    assert.ok(hasAdminDenial(r.body), `${k} phải được nhận là có if (!can(…, "<ô quản trị>")) return …`);
  }
});

// ---- Luật (1c) — hàng rào 2 SIẾT cho cổng "staff" (ADR-0049 D3; kế hoạch Task A16, TC-37; ADR-0019 điều 6 câu thay) ------------------------------------------
// Cổng "staff" chỉ đòi ĐĂNG NHẬP. Route nghiệp vụ ở cổng này (vd route tài xế `…/cuoc-cua-toi*`) PHẢI hỏi bảng quyền trong thân (can() / hàm trong GUARDS, dùng
// kết quả) — đúng như ba cổng office / orders / admin. Ngoại lệ DUY NHẤT: route TỰ PHỤC VỤ đã có hôm nay (ảnh chụp 2026-09-30), mỗi mục một lý do ở
// TU_PHUC_VU_STAFF. THÊM MỤC = NỚI hàng rào (Hiến pháp Điều 9.4) — đổi tệp này, người kiểm soi; route `/api/account/*` (SELF_SERVICE) luôn là tự phục vụ.
const TU_PHUC_VU_STAFF: Record<string, string> = {
  "GET /api/auth/me": "phiên đăng nhập của CHÍNH MÌNH (tên, quyền để màn chọn trang) — không dữ liệu người khác",
  "GET /api/bang-tin": "bắt tay Bảng tin — chỉ nhận tin gửi cho CHÍNH MÌNH; nhãn nhận tin tính bằng can() trong hàm dựng nhãn (tat-ca / cho-nhan / nguoi:<mình>)",
  "GET /api/feedback/mine": "góp ý / báo lỗi CỦA CHÍNH MÌNH (ADR-0038) — không đọc góp ý người khác",
  "GET /api/locations": "tên địa điểm danh mục — không nhạy cảm, mọi tài khoản đăng nhập (kể cả người làm hiện trường) cần đọc",
  "GET /api/thong-bao": "hộp thông báo gửi cho CHÍNH MÌNH (ADR-0034) — lọc theo người nhận ở câu SQL",
  "GET /api/thong-bao/tom-tat": "số tin chưa đọc của CHÍNH MÌNH (ADR-0034)",
  "GET /api/thong-bao/moi-nhat": "tin mới nhất gửi cho CHÍNH MÌNH — Web Push (ADR-0036)",
};

test("hàng rào 2 (1c — ADR-0049 D3): mọi route cổng staff KHÔNG thuộc TU_PHUC_VU_STAFF / tự phục vụ /api/account/* hỏi bảng quyền trong thân handler", () => {
  const staff = routes.filter((r) => r.access === "staff");
  assert.ok(staff.length >= 30, `chống bài rỗng: ${staff.length} route cổng staff`);
  const thieu = staff
    .filter((r) => !r.path.startsWith(SELF_SERVICE.prefix) && TU_PHUC_VU_STAFF[key(r.method, r.path)] === undefined && !r.guarded)
    .map((r) => `${r.method} ${r.path} (${r.module})`);
  assert.deepEqual(thieu, [], `Route nghiệp vụ cổng staff chỉ dựa "đã đăng nhập": ${thieu.join("; ")}. Gọi can(staff, "<ô>") trong thân và DÙNG kết quả.`);
});

test("hàng rào 2 (1c): TU_PHUC_VU_STAFF không thừa — mỗi mục là route cổng staff CÓ THẬT, KHÔNG gọi can() (đã hỏi bảng thì bỏ khỏi danh sách), có lý do", () => {
  for (const [k, lyDo] of Object.entries(TU_PHUC_VU_STAFF)) {
    const r = routes.find((x) => key(x.method, x.path) === k);
    assert.ok(r, `TU_PHUC_VU_STAFF: ${k} không còn là route`);
    assert.equal(r!.access, "staff", `${k}: không phải cổng staff`);
    assert.equal(r!.guarded, false, `${k}: đã hỏi bảng quyền — bỏ khỏi danh sách ngoại lệ (siết)`);
    assert.ok(lyDo.trim().length >= 20, `${k}: thiếu lý do`);
  }
});
