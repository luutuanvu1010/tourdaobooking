// HÀNG RÀO ĐỌC MÃ NGUỒN — đổi thông tin đăng nhập phải kết thúc phiên TRONG CÙNG LÔ (ADR-0075 điều 4–5).
//   (1) Mọi lời gọi `setPinStatement(` / `touchCredentialsStatement(` trong src/modules (trừ định nghĩa, trừ tệp test) nằm trong một NHÓM câu lệnh —
//       mảng `[ … ]` (thường là đối số của `db.batch([`) hoặc đối số của `.push(` — và nhóm đó phải chứa `endOtherSessionsStatement` /
//       `endAllSessionsStatement` / `endAllSessionsIfSuspendedStatement`. Nhóm không phân tích được (câu lệnh gán vào biến rồi mới vào lô…) → ĐỎ, không bỏ qua.
//   (2) Nhóm có `endOtherSessionsStatement` (bốn route tự phục vụ giữ phiên hiện tại) phải có `markSessionReissuedStatement` — phiên giữ lại không bị
//       màn sổ phiên coi là "Đã đổi thông tin đăng nhập" (quyết định của điều phối, Task 5).
//   (3) Không còn `newSessionCookie` ở đâu trong src (cấp phiên mới chỉ qua issueLoginSession; cấp lại cookie qua reissueSessionCookie).
//   (5) Trong nhóm đó, câu kết thúc phiên đứng SAU mọi chuỗi "changes() > 0" (không chen vào chuỗi changes() — `changes()` đọc câu ngay trước).
//   (4) Chống bài rỗng: đếm đúng số chỗ đổi thông tin đăng nhập; thêm chỗ mới → đỏ, xem lại rồi mới sửa con số.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = new URL("../..", import.meta.url).pathname;
const SELF = new URL(import.meta.url).pathname;
const CALLS = /\b(setPinStatement|touchCredentialsStatement)\s*\(/g;
const ENDS = /\b(endOtherSessionsStatement|endAllSessionsStatement|endAllSessionsIfSuspendedStatement)\s*\(/;
/** Số chỗ đổi thông tin đăng nhập hôm nay (2026-10-01): accounts/index.ts — ngưng, đổi PIN, gỡ mọi Face ID, gỡ một Face ID, đặt PIN bằng Face ID, đặt lại PIN, quản trị gỡ Face ID. */
const SO_CHO = 7;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });
}

type Group = { open: "[" | "(" | "{"; start: number; end: number };
/**
 * Quét mã: trả mọi nhóm ngoặc (vị trí mở/đóng), bỏ qua chuỗi, chú thích, regex; template `${…}` được quét như mã. Lệch ngoặc → ném lỗi (bài đỏ, không bỏ qua).
 */
function groupsOf(src: string, file: string): Group[] {
  const out: Group[] = [];
  const stack: { ch: string; at: number; tpl?: boolean }[] = [];
  const pair: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  let i = 0;
  let lastSig = ""; // ký tự có nghĩa gần nhất (để đoán `/` là regex hay phép chia)
  const regexBefore = /[(,=:[!&|?{};+\-*%<>~^]|^$/;
  const skipTemplate = () => { // đang ở trong template (sau ` hoặc sau } đóng ${): đọc tới ` hoặc ${
    while (i < src.length) {
      const c = src[i]!;
      if (c === "\\") { i += 2; continue; }
      if (c === "`") { i++; return; }
      if (c === "$" && src[i + 1] === "{") { stack.push({ ch: "{", at: i + 1, tpl: true }); i += 2; return; }
      i++;
    }
    throw new Error(`${file}: template không đóng`);
  };
  while (i < src.length) {
    const c = src[i]!;
    if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i) + 2; continue; }
    if (c === '"' || c === "'") {
      i++;
      while (i < src.length && src[i] !== c) i += src[i] === "\\" ? 2 : 1;
      i++; lastSig = "a"; continue;
    }
    if (c === "`") { i++; skipTemplate(); lastSig = "a"; continue; }
    if (c === "/" && (regexBefore.test(lastSig) || /\breturn\s*$/.test(src.slice(Math.max(0, i - 8), i)))) {
      i++;
      let inClass = false;
      while (i < src.length && (inClass || src[i] !== "/")) {
        if (src[i] === "\\") i++;
        else if (src[i] === "[") inClass = true;
        else if (src[i] === "]") inClass = false;
        else if (src[i] === "\n") throw new Error(`${file}: không phân tích được regex ở vị trí ${i}`);
        i++;
      }
      i++; lastSig = "a"; continue;
    }
    if (c === "(" || c === "[" || c === "{") stack.push({ ch: c, at: i });
    else if (c === ")" || c === "]" || c === "}") {
      const top = stack.pop();
      if (!top || top.ch !== pair[c]) throw new Error(`${file}: lệch ngoặc ở vị trí ${i}`);
      out.push({ open: top.ch as Group["open"], start: top.at, end: i });
      if (top.tpl) { i++; skipTemplate(); lastSig = "a"; continue; }
    }
    if (!/\s/.test(c)) lastSig = c;
    i++;
  }
  if (stack.length) throw new Error(`${file}: còn ${stack.length} ngoặc chưa đóng`);
  return out;
}

const files = walk(join(SRC, "modules")).filter((f) => !f.endsWith(".test.ts"));
const sites: { file: string; fn: string; group: string; inPatchStaff: boolean }[] = [];
const loi: string[] = [];
for (const file of files) {
  const src = readFileSync(file, "utf8");
  if (!CALLS.test(src)) continue;
  CALLS.lastIndex = 0;
  const groups = groupsOf(src, relative(SRC, file));
  // thân `patchStaffStatements` (ngưng tài khoản): từ dòng khai tới khai báo cấp tệp kế tiếp (dòng bắt đầu bằng chữ, không thụt lề)
  const psStart = src.indexOf("function patchStaffStatements(");
  const psEnd = psStart < 0 ? -1 : (() => { const m = /\n(?=[A-Za-z/])/g; m.lastIndex = src.indexOf("\n}", psStart) + 1; return m.exec(src)?.index ?? src.length; })();
  for (const m of src.matchAll(CALLS)) {
    const at = m.index!;
    const lineStart = src.lastIndexOf("\n", at) + 1;
    const head = src.slice(lineStart, at);
    // định nghĩa (function setPinStatement( / const touchCredentialsStatement = () và dòng import/export — không phải lời gọi
    if (/\bfunction\s+$/.test(head) || /^\s*(export\s+)?(const|let)\s+$/.test(head) || /^\s*(import|export)\b/.test(head)) continue;
    const where = `${relative(SRC, file)}:${src.slice(0, at).split("\n").length}`;
    // nhóm trong cùng chứa lời gọi (bỏ qua chính dấu ngoặc của lời gọi)
    const inner = groups.filter((g) => g.start < at && g.end > at).sort((a, b) => b.start - a.start)[0];
    if (!inner) { loi.push(`${where}: lời gọi ${m[1]} không nằm trong nhóm nào`); continue; }
    const before = src.slice(Math.max(0, inner.start - 8), inner.start);
    const isArray = inner.open === "[";
    const isPush = inner.open === "(" && /\.push\s*$/.test(before);
    if (!isArray && !isPush) {
      loi.push(`${where}: ${m[1]} không ở trong mảng [ … ] hay .push( … ) — bài không phân tích được lô này, viết lại để câu lệnh nằm thẳng trong lô`);
      continue;
    }
    sites.push({ file: where, fn: m[1]!, group: src.slice(inner.start, inner.end + 1), inPatchStaff: psStart >= 0 && at > psStart && at < psEnd });
  }
}

test("phân tích được mọi chỗ đổi thông tin đăng nhập (không bỏ qua chỗ nào)", () => {
  assert.deepEqual(loi, []);
  assert.equal(sites.length, SO_CHO, `tìm thấy ${sites.length} chỗ đổi thông tin đăng nhập, kỳ vọng ${SO_CHO} — chỗ mới: xem lại có kết thúc phiên trong cùng lô chưa rồi sửa SO_CHO\n${sites.map((s) => s.file).join("\n")}`);
});

test("mỗi lô đổi PIN / đổi Face ID / ngưng tài khoản có câu kết thúc phiên (ADR-0075 điều 4–5)", () => {
  const thieu = sites.filter((s) => !ENDS.test(s.group)).map((s) => `${s.file} (${s.fn})`);
  assert.deepEqual(thieu, [], "lô đổi thông tin đăng nhập thiếu endOtherSessionsStatement / endAllSessionsStatement / endAllSessionsIfSuspendedStatement");
});

test("câu kết thúc phiên đứng SAU mọi câu điều kiện `changes() > 0` của cùng lô (không chen vào chuỗi changes() — ADR-0075 điều 4–5)", () => {
  // `changes()` của SQLite đọc số dòng của câu NGAY TRƯỚC: chèn câu kết thúc phiên vào giữa chuỗi thì câu nhật ký / touch phía sau đọc nhầm số dòng của nó.
  // So vị trí trong văn bản nhóm: vị trí NHỎ NHẤT của câu kết thúc phiên phải lớn hơn vị trí LỚN NHẤT của chuỗi "changes() > 0".
  const ENDS_ALL = new RegExp(ENDS.source, "g");
  const sai = sites.flatMap((s) => {
    const ends = [...s.group.matchAll(ENDS_ALL)].map((m) => m.index!);
    const conds = [...s.group.matchAll(/changes\(\) > 0/g)].map((m) => m.index!);
    if (ends.length === 0 || conds.length === 0) return [];
    return Math.min(...ends) > Math.max(...conds) ? [] : [`${s.file} (${s.fn})`];
  });
  assert.deepEqual(sai, [], "câu kết thúc phiên đứng trước một câu changes() > 0 trong cùng lô — chuyển nó xuống CUỐI lô");
  // chống bài rỗng: phải có lô thật sự mang cả hai (hôm nay 4 lô có nhật ký passkey_removed "changes() > 0")
  assert.ok(sites.filter((s) => /changes\(\) > 0/.test(s.group) && ENDS.test(s.group)).length >= 4, "không thấy lô nào có cả changes() > 0 lẫn câu kết thúc phiên");
});

test("ngưng tài khoản (patchStaffStatements) chỉ kết thúc phiên CÓ ĐIỀU KIỆN 'đã ngưng' — không dùng câu vô điều kiện", () => {
  const ngung = sites.filter((s) => s.inPatchStaff && s.fn === "touchCredentialsStatement");
  assert.equal(ngung.length, 1, `phải tìm thấy đúng một chỗ touchCredentialsStatement trong patchStaffStatements: ${ngung.map((s) => s.file).join(", ")}`);
  const g = ngung[0]!.group;
  assert.match(g, /\bendAllSessionsIfSuspendedStatement\s*\(/, "lô ngưng tài khoản phải dùng endAllSessionsIfSuspendedStatement");
  assert.doesNotMatch(g, /\bend(All|Other)SessionsStatement\s*\(/, "lô ngưng tài khoản KHÔNG được dùng câu kết thúc phiên vô điều kiện (câu chốt thua vẫn đăng xuất)");
});

test("lô giữ phiên hiện tại (endOtherSessionsStatement) đánh dấu phiên được cấp lại (markSessionReissuedStatement)", () => {
  const thieu = sites.filter((s) => /\bendOtherSessionsStatement\s*\(/.test(s.group) && !/\bmarkSessionReissuedStatement\s*\(/.test(s.group)).map((s) => s.file);
  assert.deepEqual(thieu, []);
});

test("không còn newSessionCookie ở đâu trong src", () => {
  const con = walk(SRC).filter((f) => f !== SELF && readFileSync(f, "utf8").includes("newSessionCookie")).map((f) => relative(SRC, f));
  assert.deepEqual(con, []);
});

test("bộ quét: nhận nhóm trong chuỗi/regex/template, báo lệch ngoặc", () => {
  const g = groupsOf("const a = [x(`${[1]}`), \"]\", /[)]/, f(1)];", "mau");
  assert.ok(g.some((x) => x.open === "[" && x.start === 10));
  assert.throws(() => groupsOf("const a = [1, (2];", "mau"), /lệch ngoặc/);
  assert.throws(() => groupsOf("f(1", "mau"), /chưa đóng/);
});
