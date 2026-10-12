// HÀNG RÀO "GIAO DIỆN HỎI BẢNG QUYỀN" (ADR-0072 mục 4a; luật web/CLAUDE.md chủ duyệt 2026-10-01; nguyên nhân gốc:
// docs/superpowers/specs/2026-10-01-han-che-quan-tri-hcns/NGUYEN-NHAN-GOC-GIAO-DIEN-HOI-MA-QUYEN.md).
// Giao diện ẩn/hiện theo `can(staff, "<thao tác>")` — CÙNG bảng với máy chủ. `hasPermission` chỉ để hỏi DANH TÍNH ("người này là hướng dẫn viên / tài xế /
// đối tác"), không để hỏi "được làm việc gì". Hỏi thẳng mã quyền văn phòng/quản trị là kiểu lỗi đã che suốt từ ADR-0014 tới ADR-0071 (trang hỏi "có phải
// Quản trị" trong khi máy chủ hỏi bảng quyền — lộ ra ngay khi có tài khoản chỉ Toàn quyền hoặc chỉ Nhân sự).
//
// Quét: MỌI tệp `web/**/*.ts` + MỌI tệp `src/shared/*.ts` mà web/ import (theo import thật, đệ quy; bỏ *.test.ts, *.d.ts), trên bản ĐÃ CHE CHÚ THÍCH (giữ chuỗi
// vì mã quyền là chuỗi). ĐỎ khi gặp:
//   (1) `hasPermission(…)` có đối số là chuỗi mã thuộc NHOM_CAM;
//   (2) `permissions.includes("<mã thuộc NHOM_CAM>")` (kể cả tham số tên `permissions` đứng trần, không chỉ `.permissions`).
// Ngoại lệ: CHO_PHEP (tệp + khuôn dòng + mã + lý do) — chỉ cho câu hỏi DANH TÍNH / luật đã có ADR định nghĩa bằng mã. Mục cho phép không còn khớp → đỏ.
// Giới hạn: canh QUÊN, không canh CỐ Ý — không bắt mã đi qua biến trung gian (`const m = "ADMIN"; hasPermission(s, m)`), hàm bọc tự viết, hay so mảng bằng cách khác.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const NHOM_CAM = ["ADMIN", "SUPER_ADMIN", "HR", "SALES", "ACCOUNTING", "INTERN"] as const;

/** Ngoại lệ có lý do — mỗi dòng một câu hỏi danh tính hoặc luật mà ADR định nghĩa thẳng bằng mã (không phải ô MATRIX). */
const CHO_PHEP: { file: string; khuon: RegExp; ma: string; lyDo: string }[] = [
  {
    file: "src/shared/maintenance.ts",
    khuon: /hasPermission\(\{ permissions \}, "SUPER_ADMIN"\)/,
    ma: "SUPER_ADMIN",
    lyDo: "ADR-0071 điều 3a định nghĩa miễn trừ bảo trì là GIỮ mã Toàn quyền; hàm chạy ở máy chủ (web/ chỉ lấy hằng MAINTENANCE_CODE của tệp)",
  },
  {
    file: "src/shared/assignee-pick.ts",
    khuon: /permissions\.includes\("ADMIN"\) \|\| permissions\.includes\("SUPER_ADMIN"\)/,
    ma: "ADMIN",
    lyDo: "nhãn danh tính cạnh tên người phụ trách (\"Quản trị\") — không quyết ai được làm gì",
  },
  {
    file: "src/shared/assignee-pick.ts",
    khuon: /permissions\.includes\("ADMIN"\) \|\| permissions\.includes\("SUPER_ADMIN"\)/,
    ma: "SUPER_ADMIN",
    lyDo: "như trên",
  },
  {
    file: "src/shared/permissions.ts",
    khuon: /^export const holdsIntern = .*who\.permissions\.includes\("INTERN"\);$/,
    ma: "INTERN",
    lyDo: "ADR-0100 Đ2 định nghĩa luật giá của Thực tập thẳng bằng MÃ quyền (\"có quyền Thực tập là áp\", như `holdsPartner` với PARTNER); `chiGiaDanhMuc` chỉ để form khoá ô đơn giá / giảm giá cho khỏi gõ rồi bị từ chối — máy chủ mới là nơi quyết",
  },
];

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Bộ dò (thuần, có ca tự kiểm bên dưới)

interface Trung {
  readonly line: number;
  readonly ma: string;
  readonly text: string;
}

/** Vị trí `)` khép ngoặc mở ở `mo` (bản đã che chú thích; chuỗi có ngoặc hiếm và chỉ làm lệch phạm vi đối số, không im lặng bỏ qua cả lời gọi). */
function dongNgoac(src: string, mo: number): number {
  let sau = 0;
  for (let i = mo; i < src.length; i++) {
    if (src[i] === "(") sau++;
    else if (src[i] === ")" && --sau === 0) return i;
  }
  return src.length;
}

const lineAt = (src: string, i: number): number => src.slice(0, i).split("\n").length;

function doTim(nguon: string): Trung[] {
  const che = maskSource(nguon, { strings: false, comments: true });
  const dong = nguon.split("\n");
  const out: Trung[] = [];
  const them = (i: number, ma: string) => {
    const line = lineAt(che, i);
    out.push({ line, ma, text: dong[line - 1]!.trim() });
  };
  for (const m of che.matchAll(/\bhasPermission\s*\(/g)) {
    const mo = m.index + m[0].length - 1;
    const doiSo = che.slice(mo, dongNgoac(che, mo) + 1);
    for (const c of doiSo.matchAll(/["'`]([A-Z_]+)["'`]/g)) if ((NHOM_CAM as readonly string[]).includes(c[1]!)) them(m.index, c[1]!);
  }
  for (const m of che.matchAll(/\bpermissions\s*\.\s*includes\s*\(\s*["'`]([A-Z_]+)["'`]\s*\)/g)) {
    if ((NHOM_CAM as readonly string[]).includes(m[1]!)) them(m.index, m[1]!);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Tập tệp quét: web/**/*.ts + src/shared/*.ts mà web/ import (đệ quy)

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return walk(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}

const SHARED = join(ROOT, "src", "shared") + sep;

/** Đường dẫn import tương đối → tệp .ts có thật (web/ import không đuôi; src/shared/ import kèm `.ts`). */
function giaiImport(tu: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const goc = resolve(dirname(tu), spec);
  for (const c of [goc, `${goc}.ts`, join(goc, "index.ts")]) if (existsSync(c) && statSync(c).isFile() && c.endsWith(".ts")) return c;
  return null;
}

function tepQuet(): string[] {
  const web = walk(join(ROOT, "web"));
  const da = new Set<string>(web);
  const hang = [...web];
  while (hang.length) {
    const f = hang.pop()!;
    const src = maskSource(readFileSync(f, "utf8"), { strings: false, comments: true });
    for (const m of src.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g)) {
      const t = giaiImport(f, m[1]!);
      if (!t || !t.startsWith(SHARED) || t.endsWith(".test.ts") || t.endsWith(".d.ts") || da.has(t)) continue;
      da.add(t);
      hang.push(t);
    }
  }
  return [...da].map((p) => relative(ROOT, p).split(sep).join("/")).sort();
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

test("tự kiểm bộ dò (chống bài rỗng): mẫu sai bị bắt, chú thích và câu hỏi danh tính không bị bắt", () => {
  assert.deepEqual(doTim(`if (hasPermission(staff, "ADMIN")) mo();`).map((t) => t.ma), ["ADMIN"]);
  assert.deepEqual(doTim(`const x = hasPermission(\n  staff,\n  'SUPER_ADMIN',\n);`).map((t) => [t.ma, t.line]), [["SUPER_ADMIN", 1]]);
  assert.deepEqual(doTim(`const a = hasPermission(s, "ADMIN") || hasPermission(s, "HR");`).map((t) => t.ma), ["ADMIN", "HR"]);
  assert.deepEqual(doTim(`s.permissions.includes("SALES") && 1`).map((t) => t.ma), ["SALES"]);
  assert.deepEqual(doTim(`(permissions) => permissions.includes("ACCOUNTING")`).map((t) => t.ma), ["ACCOUNTING"]);
  assert.deepEqual(doTim(`hasPermission(s, "INTERN")`).map((t) => t.ma), ["INTERN"]);
  assert.deepEqual(doTim(`// hasPermission(staff, "ADMIN")\n/* s.permissions.includes("ADMIN") */`), []);
  assert.deepEqual(doTim(`hasPermission(staff, "FIELD"); hasPermission(w, "DRIVER"); s.permissions.includes("PARTNER"); can(staff, "admin.manage");`), []);
  assert.deepEqual(doTim(`const msg = "Quản trị"; hasPermission(staff, code);`), [], "đối số biến — ngoài phạm vi (canh quên, không canh cố ý)");
});

test("tập tệp quét: đủ web/ và đi theo import thật vào src/shared (không quét rỗng)", () => {
  const tep = tepQuet();
  for (const f of ["web/shell.ts", "web/account.ts", "web/staff.ts", "web/help.ts", "src/shared/permissions.ts", "src/shared/dashboard-review.ts", "src/shared/maintenance.ts", "src/shared/roles.ts", "src/shared/assignee-pick.ts"]) {
    assert.ok(tep.includes(f), `thiếu ${f} trong tập quét — bộ giải import hỏng?`);
  }
  assert.ok(!tep.some((f) => f.startsWith("src/modules/") || f.endsWith(".test.ts")), "không được quét src/modules hay tệp test");
  assert.ok(tep.filter((f) => f.startsWith("src/shared/")).length >= 20, `chỉ ${tep.filter((f) => f.startsWith("src/shared/")).length} tệp src/shared — nghi bộ giải import hỏng`);
});

test("giao diện ẩn/hiện hỏi bảng quyền can(), không hỏi thẳng mã quyền văn phòng/quản trị; mỗi mục cho phép còn khớp", () => {
  const all = tepQuet().flatMap((file) => doTim(readFileSync(join(ROOT, file), "utf8")).map((t) => ({ file, ...t })));
  const lot = all.filter((t) => !CHO_PHEP.some((c) => c.file === t.file && c.ma === t.ma && c.khuon.test(t.text)));
  assert.deepEqual(
    lot.map((t) => `${t.file}:${t.line} hỏi mã "${t.ma}": ${t.text.slice(0, 140)}`),
    [],
    'giao diện phải hỏi can(staff, "<thao tác>") — cùng bảng quyền với máy chủ; hasPermission chỉ để hỏi danh tính (web/CLAUDE.md, ADR-0072 mục 4a). Câu hỏi danh tính thật cần mã này thì thêm vào CHO_PHEP kèm lý do.',
  );
  for (const c of CHO_PHEP) assert.ok(all.some((t) => t.file === c.file && t.ma === c.ma && c.khuon.test(t.text)), `mục cho phép thừa (không còn dòng nào khớp): ${c.file} ${c.ma} ${c.khuon}`);
});
