// Hàng rào K-A-3 (kiểm toán toàn Nền tảng 2026-10-12; Hiến chương 5.4 "một công thức, một nơi"): hoa hồng và giá vốn của một dòng dịch vụ chỉ được TÍNH ở MỘT tệp,
// `src/shared/hoa-hong-dong.ts` (`lamTronNuaLen`, `hoaHongDong`, `giaVonDong`, `tinhDongDoiTac`). Trước bài này chỉ `src/buildlines-guard.test.ts` canh `buildLines`;
// người kiểm cấy `Math.round(bp * thanhTien / 10000)` vào `billing/rules.ts` mà không bài nào đỏ. Cùng khuôn buildlines-guard: quét MÃ CHẠY THẬT (`src/**` và `web/**`,
// bỏ `*.test.ts`), che chú thích/chuỗi, bảng "chỗ đã rà" kèm số lời gọi — thêm chỗ mới = sửa hàng rào này, có người rà.
//  (1) Phép NHÂN/CHIA với 10000 (hay 10_000) và lời gọi `lamTronNuaLen(` chỉ được ở tệp nguồn; chỗ khác chỉ khi đã rà là KHÔNG phải công thức tiền (`PHAN_VAN_DA_RA`, kèm lý do).
//  (2) `hoaHongDong(`, `giaVonDong(`, `tinhDongDoiTac(` chỉ được GỌI ở các tệp đã rà (`GOI_HAM`).
// GIỚI HẠN (đọc trước khi tin): đây là lưới chống NHẦM/QUÊN, không chống cố ý lách. Bài KHÔNG thấy: hằng đặt tên (`const PHAN_VAN = 10_000` rồi nhân/chia với tên),
// 10000 truyền làm đối số cho hàm khác, dạng viết khác (`1e4`, `10 ** 4`, `0.0001`), công thức theo phần trăm (`/ 100`), đặt bí danh khi nhập (`import { giaVonDong as gv }`),
// viết lại tay phép làm tròn nửa lên (`Math.floor((2 * tu + mau) / (2 * mau))`), và mã ngoài `src/` + `web/` (`scripts/`, `tests/`). Bài cũng không biết đối số
// truyền vào có ĐÚNG hay không — đó là việc của bài hành vi (`src/modules/pricing/rules.test.ts`, `src/so-vang-so-dai-ly.test.ts`) và của người rà.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/** Tệp nguồn duy nhất của công thức (hoa hồng, giá vốn, làm tròn nửa lên). */
const NGUON = "src/shared/hoa-hong-dong.ts";

/**
 * (1) Chỗ đã rà NGOÀI tệp nguồn có phép nhân/chia với 10000 hay lời gọi `lamTronNuaLen(`: tệp → số chỗ (+ lý do vì sao KHÔNG phải công thức tiền thứ hai).
 * Chỗ nào thật sự tính hoa hồng / giá vốn / làm tròn tiền thì KHÔNG được thêm vào đây: đưa về `hoa-hong-dong.ts`.
 */
const PHAN_VAN_DA_RA: Record<string, { soCho: number; lyDo: string }> = {
  "src/shared/money.ts": { soCho: 1, lyDo: "vndShort (rút gọn số tiền «8,78tr» để HIỂN THỊ): cắt số tiền theo bậc 10.000 đồng, không phải tỷ lệ phần vạn và không ra số tiền được lưu hay cộng sổ" },
};

/**
 * (2) Chỗ GỌI đã rà của từng hàm: tên hàm → (tệp → số lời gọi). Nhập lại / tái xuất (`export { … }`) không phải lời gọi nên không tính.
 * `hoa-hong-dong.ts` tự gọi hai hàm lẻ bên trong `tinhDongDoiTac`; dòng đối tác của đơn đi qua `orders/thuong-mai.ts` (DTO), `pricing` chỉ tái xuất.
 */
const GOI_HAM: Record<string, Record<string, number>> = {
  hoaHongDong: { [NGUON]: 1 },
  giaVonDong: { [NGUON]: 1 },
  tinhDongDoiTac: { "src/modules/orders/thuong-mai.ts": 1 },
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

/** Phép nhân/chia dính liền 10000 / 10_000, ở bên nào cũng được (`x * 10000`, `x / 10_000`, `10000 * x`). So sánh (`<= 10_000`), đối số (`timeout(10_000)`) và gán KHÔNG khớp. */
const PHEP_PHAN_VAN = /(?:[*/]\s*10_?000\b|(?<![\w.])10_?000\s*[*/])/g;
const LAM_TRON = /\blamTronNuaLen\s*\(/g;

interface Cho { file: string; line: number; text: string }

/** Mọi vị trí khớp `re` trên mã đã che chú thích/chuỗi. `boQuaDinhNghia`: bỏ chỗ ngay sau `function ` (chính định nghĩa hàm, không phải lời gọi). */
function timCho(source: string, file: string, re: RegExp, boQuaDinhNghia = false): Cho[] {
  const masked = maskSource(source, { strings: true, comments: true });
  const out: Cho[] = [];
  const g = new RegExp(re.source, "g");
  for (let m = g.exec(masked); m; m = g.exec(masked)) {
    if (boQuaDinhNghia && /function\s+$/.test(masked.slice(Math.max(0, m.index - 20), m.index))) continue;
    out.push({ file, line: masked.slice(0, m.index).split("\n").length, text: m[0] });
  }
  return out;
}

const quet = (): { file: string; source: string }[] =>
  [...walk(join(ROOT, "src")), ...walk(join(ROOT, "web"))].map((abs) => ({ file: relative(ROOT, abs).split(sep).join("/"), source: readFileSync(abs, "utf8") }));

const dem = (cho: Cho[]): Record<string, number> => {
  const byFile: Record<string, number> = {};
  for (const c of cho) byFile[c.file] = (byFile[c.file] ?? 0) + 1;
  return byFile;
};
const viTri = (cho: Cho[]): string => cho.map((c) => `${c.file}:${c.line} «${c.text.trim()}»`).join("; ");

test("bộ quét K-A-3: bắt phép nhân/chia phần vạn và lời gọi, bỏ qua so sánh, đối số, chú thích, chuỗi và định nghĩa hàm", () => {
  const phanVan = (src: string): number => timCho(src, "mau.ts", PHEP_PHAN_VAN).length;
  assert.equal(phanVan("const h = Math.round((bp * thanhTien) / 10000);"), 1);
  assert.equal(phanVan("const h = Math.round(bp * thanhTien / 10_000);"), 1);
  assert.equal(phanVan("const h = Math.floor(10_000 * x);"), 1);
  assert.equal(phanVan("const h = tt * (bp / 10000);"), 1);
  assert.equal(phanVan("return bp <= 10_000 ? ok : loi;"), 0, "so sánh trần 100% không phải công thức");
  assert.equal(phanVan("AbortSignal.timeout(10_000);"), 0);
  assert.equal(phanVan("intParam(sp.get('trang'), 1, 1, 10_000);"), 0);
  assert.equal(phanVan("const TRAN = 10000;"), 0);
  assert.equal(phanVan("const x = n * 100_000;"), 0, "100_000 không phải 10_000");
  assert.equal(phanVan("// Math.round(bp * tt / 10000) — ví dụ trong chú thích"), 0);
  assert.equal(phanVan('const m = "bp * tt / 10000";'), 0);
  assert.equal(timCho("const t = lamTronNuaLen(a * b, 10_000);", "mau.ts", LAM_TRON).length, 1);
  assert.equal(timCho("export const lamTronNuaLen = (tu: number, mau: number) => 0;", "mau.ts", LAM_TRON).length, 0, "định nghĩa dạng const không phải lời gọi");
  const goi = (src: string): number => timCho(src, "mau.ts", /\bhoaHongDong\s*\(/, true).length;
  assert.equal(goi("const h = hoaHongDong({ kind });"), 1);
  assert.equal(goi("export function hoaHongDong(v: V): number { return 0; }"), 0, "chính định nghĩa");
  assert.equal(goi("export { hoaHongDong, giaVonDong };"), 0, "tái xuất không phải lời gọi");
  assert.equal(goi("// hoaHongDong(x) — chú thích"), 0);
});

test("K-A-3 (1): phép nhân/chia với 10000 và lời gọi lamTronNuaLen chỉ ở tệp nguồn — chỗ khác phải nằm trong PHAN_VAN_DA_RA kèm lý do", () => {
  const tatCa = quet();
  const taiNguon = tatCa.filter((t) => t.file === NGUON).flatMap((t) => [...timCho(t.source, t.file, PHEP_PHAN_VAN), ...timCho(t.source, t.file, LAM_TRON, true)]);
  assert.ok(taiNguon.length > 0, `tự kiểm bộ quét: phải thấy công thức ở ${NGUON} (nếu không, bộ quét đang mù)`);
  const ngoai = tatCa.filter((t) => t.file !== NGUON).flatMap((t) => [...timCho(t.source, t.file, PHEP_PHAN_VAN), ...timCho(t.source, t.file, LAM_TRON, true)]);
  const daRa = Object.fromEntries(Object.entries(PHAN_VAN_DA_RA).map(([f, v]) => [f, v.soCho]));
  const thucTe = dem(ngoai);
  for (const [f, v] of Object.entries(PHAN_VAN_DA_RA)) assert.ok(v.lyDo.trim().length > 0, `${f}: chỗ được miễn phải ghi lý do`);
  assert.deepEqual(
    thucTe,
    daRa,
    `Công thức tiền thứ hai? Phép nhân/chia với 10000 hoặc lamTronNuaLen( ngoài ${NGUON} khác danh sách đã rà (Hiến chương 5.4: hoa hồng / giá vốn tính ở MỘT nơi). Chỗ lệch: ${viTri(ngoai.filter((c) => thucTe[c.file] !== daRa[c.file]))}`,
  );
});

test("K-A-3 (2): hoaHongDong( / giaVonDong( / tinhDongDoiTac( chỉ được gọi ở các tệp đã rà (thêm chỗ gọi mới = sửa GOI_HAM, có người rà)", () => {
  const tatCa = quet();
  const thucTe: Record<string, Record<string, number>> = {};
  const lech: Cho[] = [];
  for (const ten of Object.keys(GOI_HAM)) {
    const re = new RegExp(`\\b${ten}\\s*\\(`);
    const cho = tatCa.flatMap((t) => timCho(t.source, t.file, re, true));
    thucTe[ten] = dem(cho);
    lech.push(...cho.filter((c) => thucTe[ten]![c.file] !== GOI_HAM[ten]![c.file]));
  }
  assert.ok(Object.keys(thucTe["tinhDongDoiTac"]!).length > 0 && Object.keys(thucTe["hoaHongDong"]!).length > 0, "tự kiểm bộ quét: phải thấy các lời gọi hiện có");
  assert.deepEqual(
    thucTe,
    GOI_HAM,
    `Chỗ gọi hoaHongDong / giaVonDong / tinhDongDoiTac khác danh sách đã rà. Dòng đối tác của đơn đi qua MỘT đường (tinhDongDoiTac ← orders/thuong-mai.ts); gọi thêm chỗ khác là dựng công thức thứ hai. Chỗ lệch: ${viTri(lech)}`,
  );
});
