// Hàng rào DK-T2-01 (kiểm toán điểm khuất 2026-09-24, CRITICAL): `buildLines(item, counts, unitPrices = {})` lùi về GIÁ NIÊM YẾT khi thiếu đối số
// thứ ba. Chính lỗi đó (`recomputeService` gọi `buildLines(snap, newPax)`) làm mọi đơn có giá thoả thuận bị tính lại theo giá niêm yết khi HDV
// lưu số khách. Test này quét MÃ CHẠY THẬT (`src/**` và `web/**`, bỏ `*.test.ts`), che chú thích/chuỗi, và:
//  (1) mọi lời gọi `buildLines(` phải có ĐÚNG 3 đối số, đối số thứ ba không được là `{}`/`undefined`/`null` (cách lách "truyền cho có");
//  (2) chỉ được gọi ở các chỗ đã rà (`ALLOWED`) — thêm chỗ gọi mới = sửa hàng rào này, có người rà xem đơn giá truyền vào là ĐÚNG nguồn
//      (dịch vụ ĐÃ LƯU phải đi qua `service-rules.ts:storedServiceLines`, không tự gọi `buildLines`).
// Giới hạn: không biết đối số thứ ba có ĐÚNG giá hay không (vd truyền nhầm bảng giá niêm yết) — đó là việc của test hành vi
// (`src/modules/orders/gia-thoa-thuan.test.ts`, `money-edit-plan.test.ts`, e2e `dispatch.mjs` khối DK-T2-01) và người rà.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/** Chỗ gọi đã rà: tệp → số lời gọi. */
const ALLOWED: Record<string, number> = {
  "src/modules/orders/service-rules.ts": 2, // catalogService (lập/sửa NHÁP: đơn giá người dùng gửi) + storedServiceLines (dịch vụ ĐÃ LƯU: đơn giá đã thoả thuận)
  "src/shared/service-form.ts": 1, // xem trước tiền trên form (đơn giá đang gõ)
};
const DEFINITION = "src/shared/order-lines.ts";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

/** Tách đối số của lời gọi bắt đầu ngay sau dấu `(` ở vị trí `open` (trên mã đã che chuỗi/chú thích). */
function argsAt(masked: string, original: string, open: number): string[] {
  const args: string[] = [];
  let depth = 0;
  let start = open + 1;
  for (let i = open + 1; i < masked.length; i++) {
    const ch = masked[i];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (depth === 0) {
        const last = original.slice(start, i).trim();
        if (last !== "") args.push(last); // rỗng = không đối số, hoặc dấu phẩy thừa cuối danh sách
        return args;
      }
      depth--;
    } else if (ch === "," && depth === 0) {
      args.push(original.slice(start, i).trim());
      start = i + 1;
    }
  }
  throw new Error("không tìm thấy ngoặc đóng của lời gọi buildLines");
}

function findCalls(): { file: string; line: number; args: string[] }[] {
  const calls: { file: string; line: number; args: string[] }[] = [];
  for (const abs of [...walk(join(ROOT, "src")), ...walk(join(ROOT, "web"))]) {
    const file = relative(ROOT, abs);
    const original = readFileSync(abs, "utf8");
    const masked = maskSource(original, { strings: true, comments: true });
    const re = /\bbuildLines\s*\(/g;
    for (let m = re.exec(masked); m; m = re.exec(masked)) {
      const before = masked.slice(Math.max(0, m.index - 20), m.index);
      if (file === DEFINITION && /function\s+$/.test(before)) continue; // chính định nghĩa
      const line = masked.slice(0, m.index).split("\n").length;
      calls.push({ file, line, args: argsAt(masked, original, m.index + m[0].length - 1) });
    }
  }
  return calls;
}

test("hàng rào DK-T2-01: mọi lời gọi buildLines trong mã chạy thật truyền ĐỦ đơn giá (đối số thứ ba thật, không phải {}/undefined/null)", () => {
  const calls = findCalls();
  assert.ok(calls.length > 0, "tự kiểm bộ quét: phải thấy ít nhất một lời gọi buildLines");
  const bad = calls
    .filter((c) => c.args.length !== 3 || /^(\{\s*\}|undefined|null|void\s+0)$/.test(c.args[2]!))
    .map((c) => `${c.file}:${c.line} buildLines(${c.args.join(", ")})`);
  assert.deepEqual(bad, [], `Gọi buildLines thiếu đơn giá → sẽ lùi về GIÁ NIÊM YẾT (lỗi DK-T2-01). Dịch vụ ĐÃ LƯU hãy dùng storedServiceLines: ${bad.join("; ")}`);
});

test("hàng rào DK-T2-01: buildLines chỉ được gọi ở các chỗ đã rà (thêm chỗ mới = sửa ALLOWED, có người rà nguồn đơn giá)", () => {
  const byFile: Record<string, number> = {};
  for (const c of findCalls()) byFile[c.file] = (byFile[c.file] ?? 0) + 1;
  assert.deepEqual(byFile, ALLOWED, "Chỗ gọi buildLines khác danh sách đã rà. Dịch vụ ĐÃ LƯU (sửa sau xác nhận, overlay đọc) phải đi qua service-rules.ts:storedServiceLines.");
});

// ĐỔI CÓ CHỦ ĐÍCH 15/11 (phí đưa đón Đợt C, Task 5; trang ghép 2026-10-28 §6 «cập nhật ba bài canh nguồn dòng tiền cho nguồn dòng mới»): dòng phí đưa đón (`line_kind = 'TRANSFER_FEE'`)
// là nguồn dòng tiền thứ hai của `order_item`. Nó KHÔNG BAO GIỜ đi qua `buildLines` / `storedServiceLines` (không có giá danh mục, không loại khách); sau xác nhận nó chỉ được tính lại ở
// MỘT hàm: `soLuongPhiSauSua` (số lượng mới) gọi từ `phiHieuLuc` (src/modules/orders/money-adjustment.ts), và mọi bề mặt đọc phí hiện hành đi qua `phiHieuLuc`. Thêm chỗ gọi mới = sửa
// bảng dưới, có người rà (vd một chỗ tự nhân số khách × đơn giá phí theo luật riêng là lỗi «hai luật một con số»).
const PHI_DA_RA: Record<string, Record<string, number>> = {
  soLuongPhiSauSua: { "src/modules/orders/money-adjustment.ts": 1 }, // trong phiHieuLuc
  phiHieuLuc: {
    "src/modules/orders/money-adjustment.ts": 2, // tienHieuLuc (danh sách / phải thu / sửa số khách / lịch sử) + applyAdjustmentToOrder (chi tiết đơn, biên nhận)
    "src/modules/orders/gia-dai-ly.ts": 1, // công nợ đại lý (ghepGiaDaiLy)
  },
};
function choGoi(ten: string): Record<string, number> {
  const byFile: Record<string, number> = {};
  for (const abs of [...walk(join(ROOT, "src")), ...walk(join(ROOT, "web"))]) {
    const file = relative(ROOT, abs);
    const masked = maskSource(readFileSync(abs, "utf8"), { strings: true, comments: true });
    const re = new RegExp(String.raw`\b${ten}\s*(?:<[^>()]*>)?\s*\(`, "g");
    for (let m = re.exec(masked); m; m = re.exec(masked)) {
      if (/function\s+$/.test(masked.slice(Math.max(0, m.index - 20), m.index))) continue; // chính định nghĩa
      byFile[file] = (byFile[file] ?? 0) + 1;
    }
  }
  return byFile;
}

test("hàng rào phí đưa đón (Đợt C): tính lại dòng phí sau xác nhận chỉ ở soLuongPhiSauSua / phiHieuLuc, đúng các chỗ đã rà; phiHieuLuc không gọi buildLines", () => {
  for (const [ten, cho] of Object.entries(PHI_DA_RA)) assert.deepEqual(choGoi(ten), cho, `Chỗ gọi ${ten} khác danh sách đã rà`);
  const src = maskSource(readFileSync(join(ROOT, "src/modules/orders/money-adjustment.ts"), "utf8"), { strings: true, comments: true });
  const than = src.slice(src.indexOf("export function phiHieuLuc"), src.indexOf("export function tienHieuLuc"));
  assert.ok(than.length > 0, "tự kiểm: tìm thấy thân phiHieuLuc");
  assert.doesNotMatch(than, /\b(?:buildLines|storedServiceLines|recomputeService)\s*\(/, "dòng phí không đi qua đường tính dòng dịch vụ");
  assert.match(than, /\bthanhTienDong\s*\(/, "thành tiền dòng phí qua thanhTienDong");
});
