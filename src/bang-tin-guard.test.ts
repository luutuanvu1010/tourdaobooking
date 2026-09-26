// HÀNG RÀO BẢNG TIN (ADR-0022, Task 5) — "mọi đường ghi đơn đều báo" (DP-2, docs/superpowers/sdd/2026-09-25-bang-tin-ke-hoach/global-constraints.md).
//
// Bài học: baoThayDoi bắn-và-quên (router bọc waitUntil) nên quên gọi KHÔNG làm hỏng phản hồi HTTP — không test hành vi nào bắt được, chỉ
// đọc mã mới bắt được. Hàng rào này phân tích TĨNH trên mã đã che chuỗi/chú thích (scripts/source-mask-lib.mjs), cùng cách với
// src/route-write-guard.test.ts:
//   (1) Mọi route("POST|PUT|PATCH|DELETE", "/api/orders...", …) khai ở src/modules/orders/index.ts hoặc src/modules/dispatch/index.ts phải có
//       trong thân handler ĐÚNG MỘT lời gọi `baoThayDoi(`, đứng SAU lời `return` áp chót (kế cuối) và TRƯỚC lời `return` cuối cùng của thân.
//       Chỉ tính return/lời gọi ở CẤP THÂN HANDLER: return hay lời gọi nằm trong hàm lồng (arrow có khối `{}`, hoặc `function` khai bên
//       trong — ví dụ callback `(orderId, at) => { …; return handler ? [handler] : []; }` của `POST /api/orders`) bị loại, xác định bằng
//       ĐỘ SÂU NGOẶC NHỌN so với thân (mỗi `{` được gán cờ "có phải mở thân hàm không" khi mở ra, return/lời gọi bên trong một khung có cờ
//       đó — hoặc bên trong một khung lồng sâu hơn nó — bị loại). Route không có mặt và không nằm trong MIEN (rỗng hôm nay) → đỏ.
//   (2) Mục MIEN trỏ tới route không tồn tại → đỏ.
//   (3) Số route ghi /api/orders bóc được phải bằng số đếm trực tiếp `route("POST|PUT|PATCH|DELETE", "/api/orders…"` trên bản che CHỈ chú
//       thích (giữ chuỗi) của từng tệp — route viết khác khuôn (bộ bóc bỏ lọt) sẽ làm hai số này lệch, không im lặng bỏ qua.
//   (4) "{" không khớp được với if/for/while/switch/catch/do hay `function` (ví dụ khuôn tắt `foo(a) { … }`) làm hàng rào ĐỎ có chủ đích
//       ("chưa hiểu khuôn này") thay vì đoán — canh CHẶT hơn là đoán sai và bỏ lọt một return/lời gọi lồng.
// GIỚI HẠN (ghi ở docs/SO-HANG-RAO.md): canh QUÊN, không canh CỐ Ý — chỉ nhìn VỊ TRÍ văn bản của `return`/`baoThayDoi(`, không chạy mã, nên
// không chứng minh lời gọi CHỈ chạy trên nhánh thành công (một `if` bao ngoài dòng gọi vẫn qua được bài kiểm này); không thấy route ghi đơn
// khai ở tệp/module khác (`grep -rn 'route("' src` để chắc — hai tệp này là nơi duy nhất khai `/api/orders*` hôm nay). Chứng minh hành vi
// "chỉ nhánh thành công" là việc của e2e Task 7 (DP-1), không phải hàng rào tĩnh này.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const SRC = fileURLToPath(new URL(".", import.meta.url));
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const FILES = ["modules/orders/index.ts", "modules/dispatch/index.ts"];
const ORDERS_PREFIX = "/api/orders";
const CALL_RE = /\bbaoThayDoi\s*\(/g;
const BLOCK_KEYWORDS = /\b(if|for|while|switch|catch|do)\s*$/;
const FUNCTION_KEYWORD = /\bfunction\s*[\w$*]*\s*$/;

/** Không có mục nào hôm nay — mọi route ghi /api/orders* đều tự gọi đúng chỗ. Mục trỏ route không tồn tại phải làm bài kiểm đỏ (tự kiểm dưới). */
const MIEN: { route: string; lyDo: string }[] = [];

interface RouteInfo {
  file: string;
  method: string;
  path: string;
  /** Thân handler `{…}` đã che chuỗi/chú thích (maskSource), khớp cặp ngoặc với ký tự cuối. */
  body: string;
}

function lineOf(text: string, pos: number): number {
  return text.slice(0, pos).split("\n").length;
}

/**
 * "{" tại `pos` có mở THÂN HÀM (không tính chính "{" mở đầu thân handler, gọi cho vị trí đó trả false qua nhánh `j < 0`) không.
 * Quyết định bằng ký tự liền trước, bỏ khoảng trắng: "=>" → hàm mũi tên; ")" → lùi về "(" khớp cặp rồi soi từ khoá ngay trước "(":
 * if/for/while/switch/catch/do → khối lệnh (không phải hàm); `function` (có/không tên, có/không `*`) → hàm; còn lại (khuôn tắt của
 * phương thức, IIFE, hay bất cứ gì hàng rào chưa nghĩ tới) → THROW, không đoán (canh chặt hơn đoán sai).
 */
function isFunctionBraceStart(body: string, pos: number): boolean {
  let j = pos - 1;
  while (j >= 0 && /\s/.test(body[j]!)) j--;
  if (j < 0) return false; // "{" mở đầu thân handler chính nó
  if (body[j] === ">" && body[j - 1] === "=") return true; // "=> {"
  if (body[j] !== ")") return false; // else/try/finally/do (không ngoặc)/khối lệnh độc lập/khuôn đối tượng — không phải hàm
  let depth = 1;
  let k = j - 1;
  for (; k >= 0; k--) {
    if (body[k] === ")") depth++;
    else if (body[k] === "(" && --depth === 0) break;
  }
  if (k < 0) throw new Error(`ngoặc "(" không khớp trước vị trí ${pos} — mã không cân, hoặc bộ che có lỗi`);
  const window = body.slice(Math.max(0, k - 60), k);
  if (BLOCK_KEYWORDS.test(window)) return false;
  if (FUNCTION_KEYWORD.test(window)) return true;
  throw new Error(`"){" ở vị trí ${pos} không khớp khối lệnh đã biết (if/for/while/switch/catch/do) hay hàm (function) — hàng rào CHƯA HIỂU KHUÔN NÀY, cần xem lại thủ công (không đoán).`);
}

/** Khoảng `[mởNgoặc, đóngNgoặc]` của mọi khung được `isFunctionBraceStart` nhận là hàm — vị trí nằm NGHIÊM NGẶT giữa hai mốc này là "trong hàm lồng". */
function nestedFunctionRanges(body: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const stack: Array<{ start: number; isFunction: boolean }> = [];
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "{") stack.push({ start: i, isFunction: isFunctionBraceStart(body, i) });
    else if (c === "}") {
      const frame = stack.pop();
      if (frame?.isFunction) ranges.push([frame.start, i]);
    }
  }
  return ranges;
}

const isNested = (ranges: Array<[number, number]>, pos: number): boolean => ranges.some(([s, e]) => pos > s && pos < e);

/** Vị trí các lời `return` ở CẤP THÂN HANDLER (bỏ qua return trong hàm lồng). `body` phải đã che chuỗi/chú thích. */
function handlerLevelReturnPositions(body: string): number[] {
  const ranges = nestedFunctionRanges(body);
  const out: number[] = [];
  for (const m of body.matchAll(/\breturn\b/g)) if (!isNested(ranges, m.index!)) out.push(m.index!);
  return out;
}

/** Vị trí các lời gọi `baoThayDoi(` ở CẤP THÂN HANDLER (bỏ qua lời gọi trong hàm lồng — một callback gọi nó không tính). */
function handlerLevelCallPositions(body: string): number[] {
  const ranges = nestedFunctionRanges(body);
  const out: number[] = [];
  for (const m of body.matchAll(CALL_RE)) if (!isNested(ranges, m.index!)) out.push(m.index!);
  return out;
}

/**
 * Thân (đã che chuỗi/chú thích) có ĐÚNG MỘT lời gọi `baoThayDoi(` ở cấp handler, và vị trí của nó nằm giữa return áp chót và return cuối
 * cùng (cũng ở cấp handler) không. Thân không có return nào ở cấp handler → không đạt. Chỉ có MỘT return ở cấp handler → lấy mốc "đầu thân"
 * (0) làm "áp chót" (không có return lỗi nào đứng trước để so).
 */
function danhGiaThan(maskedBody: string): boolean {
  const calls = handlerLevelCallPositions(maskedBody);
  if (calls.length !== 1) return false;
  const returns = handlerLevelReturnPositions(maskedBody);
  if (returns.length === 0) return false;
  const cuoi = returns[returns.length - 1]!;
  const apChot = returns.length >= 2 ? returns[returns.length - 2]! : 0;
  return calls[0]! > apChot && calls[0]! < cuoi;
}

/** Bản tiện cho tự kiểm: nhận mã NGUYÊN (chưa che), tự `maskSource` rồi đánh giá — test viết được chuỗi mẫu bình thường (kể cả chú thích/chuỗi). */
function kiemThan(rawBody: string): boolean {
  return danhGiaThan(maskSource(rawBody));
}

const routeKey = (r: { method: string; path: string }): string => `${r.method} ${r.path}`;

function collectRoutes(): RouteInfo[] {
  const out: RouteInfo[] = [];
  for (const rel of FILES) {
    const file = join(SRC, rel);
    const text = readFileSync(file, "utf8");
    const masked = maskSource(text);
    let relevantDeclared = 0;
    for (const m of masked.matchAll(/\broute\(/g)) {
      const pos = m.index!;
      const header = /^route\(\s*"(GET|POST|PUT|PATCH|DELETE)",\s*"([^"]+)",\s*"([^"]+)"/.exec(text.slice(pos, pos + 400));
      assert.ok(header, `${rel}:${lineOf(text, pos)}: route( không khớp khuôn route("METHOD", "path", "access", …) — bộ bóc không hiểu, không im lặng bỏ qua`);
      const method = header![1]!;
      const path = header![2]!;
      const tag = `${method} ${path} (${rel}:${lineOf(text, pos)})`;
      const start = pos + header![0].length;
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
      if (WRITE_METHODS.has(method) && path.startsWith(ORDERS_PREFIX)) {
        relevantDeclared++;
        out.push({ file: rel, method, path, body: masked.slice(open, i + 1) });
      }
    }
    // Đối chiếu độc lập (không dùng lại vòng lặp trên): đếm trực tiếp trên bản che CHỈ chú thích (giữ chuỗi, để path/method còn đọc được).
    const commentMasked = maskSource(text, { strings: false });
    const methodsPattern = [...WRITE_METHODS].join("|");
    const targetedCount = (commentMasked.match(new RegExp(`route\\(\\s*"(?:${methodsPattern})",\\s*"${ORDERS_PREFIX}[^"]*"`, "g")) ?? []).length;
    assert.equal(
      relevantDeclared,
      targetedCount,
      `${rel}: bóc được ${relevantDeclared} route ghi /api/orders nhưng đếm trực tiếp ra ${targetedCount} — route viết khác khuôn, không im lặng bỏ qua`,
    );
  }
  return out;
}

const routes = collectRoutes();
const knownKeys = new Set(routes.map(routeKey));
const mienKeys = new Set(MIEN.map((m) => m.route));

test("hàng rào bảng tin: mục miễn (MIEN) chỉ trỏ tới route ghi /api/orders đang có thật", () => {
  const problems = MIEN.filter((m) => !knownKeys.has(m.route)).map((m) => `MIEN "${m.route}": route không tồn tại trong danh sách route ghi /api/orders — gỡ mục`);
  assert.deepEqual(problems, []);
});

test("hàng rào bảng tin: mọi đường ghi đơn (POST|PUT|PATCH|DELETE /api/orders…) gọi ctx.baoThayDoi đúng một lần, giữa return áp chót và return cuối", () => {
  const bad: string[] = [];
  for (const r of routes) {
    if (mienKeys.has(routeKey(r))) continue;
    try {
      if (!danhGiaThan(r.body)) {
        bad.push(
          `${r.method} ${r.path} (${r.file}): thiếu lời gọi baoThayDoi(...), gọi không đúng đúng-một-lần, hoặc gọi sai vị trí ` +
            `(phải đứng sau return áp chót và trước return cuối cùng của thân, bỏ qua return/lời gọi trong hàm lồng)`,
        );
      }
    } catch (e) {
      bad.push(`${r.method} ${r.path} (${r.file}): ${(e as Error).message}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("hàng rào bảng tin: bộ bóc route nhìn thấy 8 route ghi đơn đã biết (chống bài kiểm rỗng)", () => {
  const expected = [
    "POST /api/orders",
    "PUT /api/orders/:id",
    "PUT /api/orders/:id/trip",
    "PUT /api/orders/:id/booker",
    "POST /api/orders/:id/status",
    "PUT /api/orders/:id/handler",
    "POST /api/orders/:id/handler-cancel",
    "POST /api/orders/:id/handler-money-edit",
  ];
  for (const k of expected) assert.ok(knownKeys.has(k), `không bóc được ${k} — bộ bóc route hỏng?`);
});

// --- Ca tự kiểm của bộ bóc/bộ đánh giá (như src/route-write-guard.test.ts) ---

test("hàng rào bảng tin: tự kiểm — MIEN trỏ route không tồn tại làm bài kiểm đỏ", () => {
  const gia = [{ route: "POST /api/khong-ton-tai", lyDo: "chỉ để tự kiểm" }];
  const problems = gia.filter((m) => !knownKeys.has(m.route));
  assert.equal(problems.length, 1, "mục MIEN trỏ route không tồn tại phải bị bắt");
});

test("hàng rào bảng tin: tự kiểm — lời gọi đứng TRƯỚC return áp chót bị bắt (đỏ)", () => {
  assert.equal(kiemThan(`{ baoThayDoi(x); if (!ok) return FORBIDDEN(); return OK(); }`), false);
});

test("hàng rào bảng tin: tự kiểm — lời gọi đúng vị trí (giữa áp chót và cuối) được nhận (xanh)", () => {
  assert.equal(kiemThan(`{ if (!ok) return FORBIDDEN(); baoThayDoi(x); return OK(); }`), true);
});

test("hàng rào bảng tin: tự kiểm — return trong else/try-catch vẫn ở cấp handler; lời gọi trước nó bị bắt", () => {
  const body = `{
    try {
      if (!ok) { return FORBIDDEN(); } else { baoThayDoi(x); }
    } catch (e) {
      return ERR();
    }
    return OK();
  }`;
  // baoThayDoi đứng ở else — TRƯỚC return ERR() (áp chót, trong catch) — không đạt.
  assert.equal(kiemThan(body), false);
});

test("hàng rào bảng tin: tự kiểm — lời gọi trong chú thích không tính (không thấy lời gọi nào)", () => {
  assert.equal(kiemThan(`{ if (!ok) return FORBIDDEN();\n// baoThayDoi(x);\n return OK(); }`), false);
});

test("hàng rào bảng tin: tự kiểm — lời gọi nằm trong chuỗi không tính (không thấy lời gọi nào)", () => {
  assert.equal(kiemThan('{ if (!ok) return FORBIDDEN(); const s = "gọi baoThayDoi(x) ở đây"; return OK(); }'), false);
});

test("hàng rào bảng tin: tự kiểm — hàm lồng (arrow) có return đứng SAU lời gọi không bị coi là return cuối/áp chót", () => {
  assert.equal(kiemThan(`{ if (!ok) return FORBIDDEN(); baoThayDoi(x); const f = (a) => { return a; }; return OK(); }`), true);
});

test("hàng rào bảng tin: tự kiểm — hàm lồng khai bằng `function` (không chỉ arrow) cũng bị loại", () => {
  assert.equal(kiemThan(`{ if (!ok) return FORBIDDEN(); baoThayDoi(x); function f(a) { return a; } return OK(); }`), true);
});

test("hàng rào bảng tin: tự kiểm — lời gọi chỉ đứng TRONG một callback (hàm lồng) không tính, coi như thiếu (đỏ)", () => {
  assert.equal(kiemThan(`{ if (!ok) return FORBIDDEN(); const f = (a) => { baoThayDoi(a); return a; }; return OK(); }`), false);
});

test("hàng rào bảng tin: tự kiểm — gọi hai lần ở cấp handler cũng không đạt (đúng MỘT lần)", () => {
  assert.equal(kiemThan(`{ if (!ok) return FORBIDDEN(); baoThayDoi(x); baoThayDoi(y); return OK(); }`), false);
});

test("hàng rào bảng tin: tự kiểm — thiếu lời gọi thì không đạt", () => {
  assert.equal(kiemThan(`{ if (!ok) return FORBIDDEN(); return OK(); }`), false);
});

test("hàng rào bảng tin: tự kiểm — chỉ MỘT return ở cấp handler, lời gọi trước nó thì đạt (không có return lỗi nào đứng trước)", () => {
  assert.equal(kiemThan(`{ baoThayDoi(x); return OK(); }`), true);
});

test('hàng rào bảng tin: tự kiểm — "){" khớp method-shorthand (không if/for/while/switch/catch/do, không function) làm hàng rào ĐỎ có chủ đích, không đoán', () => {
  const body = `{ if (!ok) return FORBIDDEN(); baoThayDoi(x); const o = { foo(a) { return a; } }; return OK(); }`;
  assert.throws(() => kiemThan(body), /CHƯA HIỂU KHUÔN NÀY/);
});
