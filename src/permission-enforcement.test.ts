// HÀNG RÀO 1 — "mỗi ô của bản đồ quyền phải được MÁY CHỦ hỏi" (kế hoạch docs/superpowers/plans/2026-09-24-hang-rao-quyen-va-va-lo-hong-ho-so.md).
//
// Bài học 24/9: `src/shared/permissions.test.ts` khoá GIÁ TRỊ từng ô của MATRIX, nên ai cũng tin bảng đang được thi hành — nhưng 13/25 ô
// không có nơi nào trong src/modules gọi `can(…, "<ô>")`, tức bảng chỉ là chữ trên tường cho các ô đó (Hiến pháp P16: hàng rào chỉ có
// hiệu lực khi có cơ chế cưỡng chế; hàng rào giả chiếm chỗ hàng rào thật). Route Hồ sơ chỉ dựa cổng thô `access: "office"` → SALES đổi
// tên hồ sơ quản trị viên (F-01).
//
// Luật của bài kiểm này:
//   (1) Mỗi ô của MATRIX phải xuất hiện trên ít nhất một dòng của src/modules/**/*.ts (ngoài *.test.ts, đã che chú thích) có `can(` hoặc
//       `MATRIX[` — HOẶC có mục trong docs/quyen-hoan.json (thao_tac) với lý do, kế hoạch, hạn ≥ hôm nay (giờ VN), người chịu trách nhiệm.
//   (2) Mục hoãn cho ô ĐÃ được hỏi → đỏ ("hoãn thừa"): danh sách hoãn chỉ được co lại, không phình ra âm thầm.
//   (3) Hết hạn → đỏ: đây là "dừng dây chuyền" — vá hoặc chủ dự án gia hạn bằng một diff vào docs/quyen-hoan.json.
// Chỉ đếm src/modules (máy chủ): lời gọi ở web/ hay src/shared/handler-view.ts là ẩn/hiện giao diện, KHÔNG phải thi hành (ADR-0007 điều 3).
// Ô truyền qua BIẾN (`can(x, op)`) không đếm được bằng cách này — muốn được tính thì viết chuỗi ô tường minh, hoặc khai hoãn có lý do.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { MATRIX, type OperationCode } from "./shared/permissions.ts";
import { isISODate, vnToday } from "./shared/vn-date.ts";

const SRC = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(SRC, "..");
const DEFERRALS_FILE = "docs/quyen-hoan.json";

interface OpDeferral {
  ma: string;
  ly_do?: string;
  ke_hoach?: string;
  han?: string;
  nguoi_chiu_trach_nhiem?: string;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

/** Ô → các chỗ máy chủ hỏi ("tệp:dòng"). Chỉ dòng có `can(` hoặc `MATRIX[` và chứa nguyên văn "<ô>" (chuỗi được GIỮ, chú thích bị che). */
function enforcementSites(): Map<OperationCode, string[]> {
  const ops = Object.keys(MATRIX) as OperationCode[];
  const sites = new Map<OperationCode, string[]>(ops.map((op) => [op, []]));
  for (const file of walk(join(SRC, "modules"))) {
    const lines = maskSource(readFileSync(file, "utf8"), { strings: false, comments: true }).split("\n");
    lines.forEach((line, i) => {
      if (!/\bcan\s*\(|\bMATRIX\[/.test(line)) return;
      for (const op of ops) if (line.includes(`"${op}"`)) sites.get(op)!.push(`${relative(ROOT, file)}:${i + 1}`);
    });
  }
  return sites;
}

function loadDeferrals(): OpDeferral[] {
  const raw = JSON.parse(readFileSync(join(ROOT, DEFERRALS_FILE), "utf8")) as { thao_tac?: unknown };
  assert.ok(Array.isArray(raw.thao_tac), `${DEFERRALS_FILE}: thiếu mảng "thao_tac"`);
  return raw.thao_tac as OpDeferral[];
}

const sites = enforcementSites();
const deferrals = loadDeferrals();
const deferred = new Set(deferrals.map((d) => d.ma));
const today = vnToday(new Date());

test("hàng rào 1: mọi ô của MATRIX được máy chủ hỏi, trừ ô đã khai hoãn trong docs/quyen-hoan.json", () => {
  const dead = [...sites.entries()].filter(([op, where]) => where.length === 0 && !deferred.has(op)).map(([op]) => op);
  assert.deepEqual(
    dead,
    [],
    `Ô không được máy chủ hỏi ở đâu và cũng không có trong ${DEFERRALS_FILE}: ${dead.join(", ")}. ` +
      `Hoặc gọi can(staff, "<ô>") ở route/luật của module, hoặc thêm mục hoãn (lý do, kế hoạch, hạn, người chịu trách nhiệm).`,
  );
});

test("hàng rào 1: danh sách hoãn (thao_tac) không thừa, không cũ, đủ trường, còn hạn", () => {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const d of deferrals) {
    const tag = `thao_tac "${d.ma}"`;
    if (seen.has(d.ma)) problems.push(`${tag}: trùng mục`);
    seen.add(d.ma);
    if (!(d.ma in MATRIX)) {
      problems.push(`${tag}: không còn là ô của MATRIX — gỡ mục`);
      continue;
    }
    const where = sites.get(d.ma as OperationCode) ?? [];
    if (where.length > 0) problems.push(`${tag}: HOÃN THỪA — ô đã được hỏi ở ${where.join(", ")}; gỡ mục để danh sách co lại`);
    for (const k of ["ly_do", "ke_hoach", "han", "nguoi_chiu_trach_nhiem"] as const) {
      if (typeof d[k] !== "string" || d[k]!.trim() === "") problems.push(`${tag}: thiếu "${k}"`);
    }
    if (typeof d.han === "string" && !isISODate(d.han)) problems.push(`${tag}: "han" phải là ngày YYYY-MM-DD (giờ Việt Nam)`);
    else if (typeof d.han === "string" && d.han < today) {
      problems.push(`${tag}: HẾT HẠN HOÃN (${d.han} < ${today}) — vá theo "${d.ke_hoach ?? "?"}" hoặc chủ dự án gia hạn có ghi lý do`);
    }
  }
  assert.deepEqual(problems, []);
});

test("hàng rào 1: bản đồ quyền có ô nào đó thật sự được hỏi (chống bài kiểm rỗng)", () => {
  // Nếu regex/che chuỗi hỏng, mọi ô sẽ thành "không hỏi" và bài kiểm trên chỉ đỏ vì thiếu mục hoãn — khó đọc. Kiểm thẳng một ô chắc chắn có.
  assert.ok((sites.get("order.modify") ?? []).length >= 1, "order.modify phải được hỏi ở src/modules/orders/index.ts — bộ quét hỏng?");
  assert.ok((sites.get("order.money.edit") ?? []).length >= 1, "order.money.edit được đọc qua MATRIX[…] ở dispatch — bộ quét hỏng?");
});
