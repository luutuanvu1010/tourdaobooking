// Hàng rào «cỡ chỉ dẫn» (đề xuất docs/superpowers/specs/2026-11-03-rut-gon-claude-md.md, bước 1). Hai việc, cả hai chỉ SIẾT:
//   (1) Cỡ ba tệp CLAUDE.md (gốc, src/, web/) tính theo BYTE không vượt trần. Trần chỉ được HẠ, không bao giờ nâng. Tệp nhỏ hơn trần quá DUNG_SAI thì
//       cũng đỏ, để người rút gọn phải hạ trần (bánh cóc, cùng kiểu src/ratchet-confirm-alert.test.ts). Tệp dài làm AI tuân thủ kém hơn (tài liệu Claude Code,
//       FRAMEWORK §4.6); đếm dòng không bắt được tệp phình vì dòng rất dài.
//   (2) Mọi đường dẫn viết trong dấu `…` của ba tệp phải trỏ tới tệp có thật, trừ danh sách loại trừ có lý do (chống chỉ dẫn treo).
// Giới hạn đã biết: chỉ kiểm đường dẫn bắt đầu bằng thư mục gốc đã liệt kê, không chứa * < > …; tên rút gọn không có đuôi phải ghi vào LOAI_TRU.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const ROOT = join(import.meta.dirname, "..");
const TEP = ["CLAUDE.md", "src/CLAUDE.md", "web/CLAUDE.md"] as const;

/** Trần byte (2026-11-03: 30.638 / 10.236 / 32.355 byte). CHỈ HẠ khi rút gọn; có dung sai nhỏ để sửa số đếm, tên tệp (N9). */
const TRAN_BYTE: Record<(typeof TEP)[number], number> = { "CLAUDE.md": 31000, "src/CLAUDE.md": 10500, "web/CLAUDE.md": 33000 };
/** Tệp nhỏ hơn trần quá chừng này thì đỏ: hạ trần cho sát. */
const DUNG_SAI = 2500;

/** Đường dẫn được phép không có thật trong cây git, kèm lý do. Mỗi mục phải còn được nhắc ở một trong ba tệp (bài dưới kiểm). */
const LOAI_TRU: Record<string, string> = {
  "public/js/": "sản phẩm build, bị gitignore (npm run build:web)",
  "public/sw.js": "sản phẩm build, bị gitignore (npm run build:web)",
  "docs/design/van-chuyen-dieu-phoi/project/07": "viết tắt của tệp «07 Bieu mau don - chang don.dc.html» (tên có dấu cách)",
  "docs/design/van-chuyen-dieu-phoi/project/08": "viết tắt của tệp «08 Chinh sach dieu phoi.dc.html» (tên có dấu cách)",
};

const DANG_DUONG_DAN = /^(docs|src|web|playbook|scripts|tests|migrations|public|\.claude)\/[A-Za-z0-9._/-]*$/;

/** Các đường dẫn cần kiểm trong một đoạn văn: chữ trong dấu `…`, bỏ hậu tố :dòng, bỏ mẫu glob / chỗ trống. Thuần, không I/O. */
export function duongDanCanKiem(noiDung: string): string[] {
  const ra = new Set<string>();
  for (const m of noiDung.matchAll(/`([^`\n]+)`/g)) {
    const s = (m[1] ?? "").trim().replace(/:\d+(-\d+)?$/, "");
    if (!DANG_DUONG_DAN.test(s) || /[*<>…]/.test(s)) continue;
    ra.add(s);
  }
  return [...ra].sort();
}

const doc = (ten: string): string => readFileSync(join(ROOT, ten), "utf8");

test("cỡ ba tệp CLAUDE.md không vượt trần và trần sát cỡ thật (chỉ được hạ)", () => {
  for (const ten of TEP) {
    const byte = Buffer.byteLength(doc(ten), "utf8");
    const tran = TRAN_BYTE[ten];
    assert.ok(byte <= tran, `${ten}: ${byte} byte > trần ${tran}. Chuyển bớt chữ sang tài liệu / quy tắc theo vùng thay vì nâng trần (đề xuất 2026-11-03-rut-gon-claude-md).`);
    assert.ok(byte >= tran - DUNG_SAI, `${ten}: ${byte} byte nhỏ hơn trần ${tran} quá ${DUNG_SAI} byte. Hạ TRAN_BYTE cho sát (bánh cóc, không nâng lại).`);
  }
});

test("đường dẫn viết trong ba tệp CLAUDE.md đều trỏ tới tệp có thật (trừ danh sách loại trừ)", () => {
  const treo: string[] = [];
  let tong = 0;
  for (const ten of TEP) {
    for (const p of duongDanCanKiem(doc(ten))) {
      tong++;
      if (p in LOAI_TRU) continue;
      if (!existsSync(join(ROOT, p))) treo.push(`${ten} → ${p}`);
    }
  }
  assert.ok(tong >= 150, `chỉ thấy ${tong} đường dẫn để kiểm: bộ trích có thể hỏng (đã biết ≥ 200 ngày 2026-11-03)`);
  assert.deepEqual(treo, [], `chỉ dẫn treo (tệp không còn): sửa chữ trong CLAUDE.md hoặc, nếu là sản phẩm build / viết tắt, thêm vào LOAI_TRU kèm lý do:\n${treo.join("\n")}`);
});

test("mỗi mục loại trừ còn được nhắc trong ba tệp (hết nhắc thì xoá mục)", () => {
  const tatCa = new Set<string>();
  for (const ten of TEP) for (const p of duongDanCanKiem(doc(ten))) tatCa.add(p);
  const thua = Object.keys(LOAI_TRU).filter((p) => !tatCa.has(p));
  assert.deepEqual(thua, [], `mục LOAI_TRU không còn được nhắc, xoá đi: ${thua.join(", ")}`);
});

test("bộ trích đường dẫn: bắt mục thiếu, bỏ glob, bỏ hậu tố dòng", () => {
  const mau = "xem `docs/a.md` và `docs/nhat-ky/*.md`, `src/x.ts:12-30`, `<tên>/y`, `lệnh chạy`, `docs/…`";
  assert.deepEqual(duongDanCanKiem(mau), ["docs/a.md", "src/x.ts"]);
  assert.deepEqual(duongDanCanKiem("không có gì"), []);
});
