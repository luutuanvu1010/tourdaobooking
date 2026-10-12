// Hàng rào K-A-3 (kiểm toán toàn Nền tảng 2026-10-12; Hiến chương 5.4 "một công thức, một nơi"): hoa hồng và giá vốn của một dòng dịch vụ chỉ được TÍNH ở MỘT tệp,
// `src/shared/hoa-hong-dong.ts` (`lamTronNuaLen`, `hoaHongDong`, `giaVonDong`, `tinhDongDoiTac`). Trước bài này chỉ `src/buildlines-guard.test.ts` canh `buildLines`;
// người kiểm cấy `Math.round(bp * thanhTien / 10000)` vào `billing/rules.ts` mà không bài nào đỏ. Cùng khuôn buildlines-guard: quét MÃ CHẠY THẬT (`src/**` và `web/**`,
// bỏ `*.test.ts`), che chú thích/chuỗi, bảng "chỗ đã rà" kèm số lời gọi — thêm chỗ mới = sửa hàng rào này, có người rà.
//  (1) Phép NHÂN/CHIA với 10000 (hay 10_000; kể cả `/ (10000)`, `/=`, `*=`, `10000n`), phép nhân/chia với biến tỷ lệ phần vạn tên tận cùng `Bp` / `_bp` (`rateBp`, `costRateBp`,
//      `rate_bp`, `tyLeBp`) và lời gọi `lamTronNuaLen(` chỉ được ở tệp nguồn; chỗ khác chỉ khi đã rà là KHÔNG phải công thức tiền (`PHAN_VAN_DA_RA`, kèm lý do).
//  (1b) Cùng hai loại phép nhân/chia ấy viết TRONG CHUỖI (câu SQL: `CAST(x * 1250 / 10000 AS INTEGER)`): quét riêng nội dung chuỗi/khuôn, bảng riêng `CHUOI_DA_RA` (hôm nay rỗng).
//  (2) `hoaHongDong(`, `giaVonDong(`, `tinhDongDoiTac(` chỉ được GỌI ở các tệp đã rà (`GOI_HAM`).
// GIỚI HẠN (đọc trước khi tin): đây là lưới chống NHẦM/QUÊN, không chống cố ý lách. Bài KHÔNG thấy (một dòng mỗi khe):
//  - 10000 viết dạng khác: `1e4`, `10 ** 4`, `0.0001`, `BigInt(10000)`, `/ ((10000))` (hai lớp ngoặc), `(10000) * x` (ngoặc bao con số ở bên trái).
//  - Công thức theo phần trăm: `/ 100`, `/ 100 / 100` — trên tiền hay trên tỷ lệ.
//  - Hằng đặt tên khác quy ước: `const PHAN_VAN = 10_000` rồi nhân/chia với tên (kể cả trong SQL: `/ ${PHAN_VAN}`).
//  - 10000 truyền làm đối số cho hàm khác: `chia(x, 10_000)`.
//  - Viết lại tay phép làm tròn nửa lên: `Math.floor((2 * tu + mau) / (2 * mau))`, `(2 * x * bp + 10000) / 20000`.
//  - Biến tỷ lệ tên trần `bp` hoặc tên không theo quy ước `…Bp` / `…_bp` (`bp * tien`, `tyLe * tien`); truy cập bằng khoá chuỗi (`r["rate_bp"] * x`, `row[col] * x`).
//  - Biến tỷ lệ bị bọc nên không còn đứng liền dấu phép tính: `((rateBp))`, `rateBp as number`, `Number(rateBp)`; trong SQL `CAST(rate_bp AS …)`, `IFNULL(rate_bp, 0)`, khuôn `${tyLeBp}`
//    hay `/ ${10000}`. (Nếu công thức có `/ 10000` viết liền thì vẫn bị bắt ở mẫu 10000.)
//  - SQL ghép từ nhiều mảnh chuỗi: chỉ bị bắt khi phép tính và con số 10000 còn nằm trong CÙNG một mảnh.
//  - Ngược chiều (báo NHẦM, đỏ to): viết `rateBp / 100` để HIỂN THỊ phần trăm cũng làm bài đỏ — đưa việc đó vào một hàm ở tệp nguồn, hoặc thêm vào `PHAN_VAN_DA_RA` kèm lý do.
//  - Đặt bí danh khi nhập (`import { giaVonDong as gv }`) hay gán lại hàm (`const f = hoaHongDong`).
//  - Mã ngoài `src/` + `web/`: `scripts/`, `tests/`, và SQL ở `migrations/` (trigger).
//  - Đối số truyền vào hàm công thức có ĐÚNG hay không — việc của bài hành vi (`src/modules/pricing/rules.test.ts`, `src/so-vang-so-dai-ly.test.ts`) và của người rà.
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
 * (1) Chỗ đã rà NGOÀI tệp nguồn có phép nhân/chia với 10000 / biến `…Bp` hay lời gọi `lamTronNuaLen(` TRONG MÃ: tệp → số chỗ (+ lý do vì sao KHÔNG phải công thức tiền thứ hai).
 * Chỗ nào thật sự tính hoa hồng / giá vốn / làm tròn tiền thì KHÔNG được thêm vào đây: đưa về `hoa-hong-dong.ts`.
 */
const PHAN_VAN_DA_RA: Record<string, { soCho: number; lyDo: string }> = {
  "src/shared/money.ts": { soCho: 1, lyDo: "vndShort (rút gọn số tiền «8,78tr» để HIỂN THỊ): cắt số tiền theo bậc 10.000 đồng, không phải tỷ lệ phần vạn và không ra số tiền được lưu hay cộng sổ" },
};

/** (1b) Chỗ đã rà NGOÀI tệp nguồn có phép nhân/chia với 10000 / biến `…Bp` viết TRONG CHUỖI (câu SQL, khuôn chữ). Hôm nay không có chỗ nào; thêm = có người rà và ghi lý do. */
const CHUOI_DA_RA: Record<string, { soCho: number; lyDo: string }> = {};

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

/**
 * Phép nhân/chia dính liền 10000 / 10_000, ở bên nào cũng được (`x * 10000`, `x / 10_000`, `10000 * x`), kể cả `x / (10000)`, `y /= 10000`, `y *= 10_000`, `x * 10000n` (BigInt).
 * So sánh (`<= 10_000`), đối số (`timeout(10_000)`) và gán KHÔNG khớp.
 */
const PHEP_PHAN_VAN = /(?:[*/]=?\s*\(?\s*10_?000n?\b|(?<![\w.])10_?000n?\s*[*/])/g;
/**
 * Phép nhân/chia với biến tỷ lệ phần vạn có tên tận cùng `Bp` / `BP` (sau chữ thường hay số) hoặc `_bp` / `_BP`: `rateBp * x`, `x * costRateBp`, `rate_bp / 10000`, `v.rateBp! * x`,
 * `(v.rateBp ?? 0) * x`, `x * row.tyLeBp`. CHỈ cấm khi nằm cạnh một phép `*` / `/` — tên đứng một mình (cột, tham số, DTO) là hợp lệ. Tên trần `bp` KHÔNG khớp (xem GIỚI HẠN).
 */
const TEN_BP = "[A-Za-z_$][\\w$]*(?:[a-z0-9]B[pP]|_[bB][pP])";
const PHEP_BP = new RegExp(`(?:(?<![\\w$])${TEN_BP}\\b\\s*(?:!|\\?\\?\\s*[\\w$.]+)?\\s*\\)?\\s*[*/]|[*/]=?\\s*\\(?\\s*(?:[\\w$]+[?!]?\\.)*${TEN_BP}\\b)`, "g");
const LAM_TRON = /\blamTronNuaLen\s*\(/g;

interface Cho { file: string; line: number; text: string }

/**
 * Chỉ NỘI DUNG chuỗi / khuôn chữ (không phải mã, không phải chú thích): mọi ký tự khác thành khoảng trắng, giữ ký tự xuống dòng — chỉ số và số dòng khớp với tệp gốc.
 * Phần `${…}` trong khuôn là MÃ nên không vào đây (bản quét mã đã thấy nó). Mượn `maskSource`: ký tự nào bản che-chuỗi đổi mà bản giữ-chuỗi không đổi thì thuộc chuỗi.
 */
function chiChuoi(source: string): string {
  const khongChuoi = maskSource(source, { strings: true, comments: true });
  const giuChuoi = maskSource(source, { strings: false, comments: true });
  const out: string[] = new Array(source.length);
  for (let i = 0; i < source.length; i++) out[i] = khongChuoi[i] === giuChuoi[i] ? (giuChuoi[i] === "\n" ? "\n" : " ") : giuChuoi[i]!;
  return out.join("");
}

/**
 * Mọi vị trí khớp `re`. `phan`: "ma" = mã đã che chú thích/chuỗi; "chuoi" = nội dung chuỗi (chú thích bị bỏ). `boQuaDinhNghia`: bỏ chỗ ngay sau `function ` (chính định nghĩa hàm, không phải lời gọi).
 */
function timCho(source: string, file: string, re: RegExp, boQuaDinhNghia = false, phan: "ma" | "chuoi" = "ma"): Cho[] {
  const masked = phan === "ma" ? maskSource(source, { strings: true, comments: true }) : chiChuoi(source);
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

/** Công thức tiền viết TRONG MÃ: phép phần vạn, biến `…Bp` nhân/chia, lời gọi `lamTronNuaLen(`. */
const choTrongMa = (t: { file: string; source: string }): Cho[] => [
  ...timCho(t.source, t.file, PHEP_PHAN_VAN),
  ...timCho(t.source, t.file, PHEP_BP),
  ...timCho(t.source, t.file, LAM_TRON, true),
];
/** Công thức tiền viết TRONG CHUỖI (câu SQL): phép phần vạn và biến `…Bp` nhân/chia. */
const choTrongChuoi = (t: { file: string; source: string }): Cho[] => [
  ...timCho(t.source, t.file, PHEP_PHAN_VAN, false, "chuoi"),
  ...timCho(t.source, t.file, PHEP_BP, false, "chuoi"),
];

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
  assert.equal(phanVan("const h = Math.round(x / (10000));"), 1, "10000 trong ngoặc");
  assert.equal(phanVan("let y = tt; y /= 10000;"), 1, "phép gán chia");
  assert.equal(phanVan("let y = tt; y *= 10_000;"), 1, "phép gán nhân");
  assert.equal(phanVan("const h = (a * b) / 10000n;"), 1, "BigInt");
  assert.equal(phanVan("const h = 10000n * a;"), 1, "BigInt, 10000 ở bên trái");
  assert.equal(phanVan("return bp <= 10_000 ? ok : loi;"), 0, "so sánh trần 100% không phải công thức");
  assert.equal(phanVan("AbortSignal.timeout(10_000);"), 0);
  assert.equal(phanVan("intParam(sp.get('trang'), 1, 1, 10_000);"), 0);
  assert.equal(phanVan("const TRAN = 10000;"), 0);
  assert.equal(phanVan("let y = 10000; y += 10000;"), 0, "phép cộng không phải nhân/chia");
  assert.equal(phanVan("const x = n * 100_000;"), 0, "100_000 không phải 10_000");
  assert.equal(phanVan("const x = n / 100000;"), 0, "100000 không phải 10000");
  assert.equal(phanVan("// Math.round(bp * tt / 10000) — ví dụ trong chú thích"), 0);
  assert.equal(phanVan('const m = "bp * tt / 10000";'), 0, "bản quét MÃ không thấy chuỗi");
  assert.equal(timCho("const t = lamTronNuaLen(a * b, 10_000);", "mau.ts", LAM_TRON).length, 1);
  assert.equal(timCho("export const lamTronNuaLen = (tu: number, mau: number) => 0;", "mau.ts", LAM_TRON).length, 0, "định nghĩa dạng const không phải lời gọi");
  const goi = (src: string): number => timCho(src, "mau.ts", /\bhoaHongDong\s*\(/, true).length;
  assert.equal(goi("const h = hoaHongDong({ kind });"), 1);
  assert.equal(goi("export function hoaHongDong(v: V): number { return 0; }"), 0, "chính định nghĩa");
  assert.equal(goi("export { hoaHongDong, giaVonDong };"), 0, "tái xuất không phải lời gọi");
  assert.equal(goi("// hoaHongDong(x) — chú thích"), 0);
});

test("bộ quét K-A-3: biến tỷ lệ `…Bp` / `…_bp` chỉ bị bắt khi đứng cạnh phép nhân/chia; tên đứng một mình, tên trần `bp` và chuỗi thì không", () => {
  const bp = (src: string): number => timCho(src, "mau.ts", PHEP_BP).length;
  assert.equal(bp("const t = rateBp * tien;"), 1);
  assert.equal(bp("const t = tien * costRateBp;"), 1);
  assert.equal(bp("const t = rate_bp / 10000;"), 1);
  assert.equal(bp("const t = tyLeBp * tien;"), 1);
  assert.equal(bp("const t = row.rate_bp * tien;"), 1, "truy cập thuộc tính, tên ở bên trái");
  assert.equal(bp("const t = tien * (row.tyLeBp);"), 1, "truy cập thuộc tính, tên ở bên phải, trong ngoặc");
  assert.equal(bp("const t = row?.tyLeBp * tien;"), 1, "truy cập tuỳ chọn");
  assert.equal(bp("return lamTronNuaLen(v.rateBp! * v.thanhTien, d);"), 1, "dấu ! của TypeScript chen giữa tên và phép nhân");
  assert.equal(bp("const t = (v.rateBp ?? 0) * tien;"), 1, "ngoặc và ?? chen giữa");
  assert.equal(bp("let t = tien; t *= rateBp;"), 1, "phép gán nhân");
  assert.equal(bp("const t = RATE_BP * tien;"), 1, "chữ hoa");
  assert.equal(bp("const { rateBp, costRateBp } = r;"), 0, "tên đứng một mình");
  assert.equal(bp("return { rateBp: 1250, rate_bp: null };"), 0);
  assert.equal(bp("if (a.rateBp === b.rateBp) return;"), 0);
  assert.equal(bp("const ok = rateBp <= 10_000 ? 1 : 0;"), 0, "so sánh");
  assert.equal(bp("const n = nhanTyLeBp(rateBp, 2);"), 0, "đối số hàm");
  assert.equal(bp("const t = bp * tien;"), 0, "tên trần `bp` — GIỚI HẠN đã ghi");
  assert.equal(bp("const t = rateBpMoi * tien;"), 0, "tên không tận cùng bằng Bp");
  assert.equal(bp("// const t = rateBp * tien; — ví dụ trong chú thích"), 0);
  assert.equal(bp('const m = "rateBp * tien";'), 0, "bản quét MÃ không thấy chuỗi");
});

test("bộ quét K-A-3: nội dung chuỗi / khuôn chữ (SQL) — bắt công thức trong chuỗi, bỏ qua mã, chú thích và con số không phải phép nhân/chia", () => {
  const chuoi = (src: string): number => timCho(src, "mau.ts", PHEP_PHAN_VAN, false, "chuoi").length;
  const chuoiBp = (src: string): number => timCho(src, "mau.ts", PHEP_BP, false, "chuoi").length;
  assert.equal(chuoi('const A = defineSql("billing", "v9", "SELECT CAST(due_snapshot * 1250 / 10000 AS INTEGER) FROM bil_x");'), 1, "chia 10000 trong câu SQL");
  assert.equal(chuoi("const A = defineSql(\"billing\", \"v9\", `SELECT CAST(x*10000/y AS INTEGER) FROM bil_x`);"), 1, "nhân 10000 dính liền, trong khuôn chữ");
  assert.equal(chuoi("const A = `SELECT x /10000.0 FROM t`;"), 1, "chia 10000.0");
  assert.equal(chuoi("const A = `SELECT x FROM t LIMIT 10000`;"), 0, "LIMIT 10000 không phải phép nhân/chia");
  assert.equal(chuoi("const A = `SELECT COUNT(*) FROM t WHERE n > 10000`;"), 0);
  assert.equal(chuoi("const h = Math.round(bp * tt / 10000);"), 0, "phần MÃ không vào bản quét chuỗi (đã có bản quét mã)");
  assert.equal(chuoi("const m = `a ${bp * tt / 10000} b`;"), 0, "phần ${…} của khuôn là mã");
  assert.equal(chuoi('// "bp * tt / 10000" — ví dụ trong chú thích'), 0, "chuỗi nằm trong chú thích");
  assert.equal(chuoiBp('const A = defineSql("billing", "v9", "SELECT rate_bp * due_snapshot FROM bil_x");'), 1, "cột rate_bp nhân trong SQL");
  assert.equal(chuoiBp('const A = defineSql("billing", "v9", "SELECT due_snapshot * cost_rate_bp FROM bil_x");'), 1);
  assert.equal(chuoiBp('const A = defineSql("billing", "v9", "SELECT rate_bp, cost_rate_bp FROM bil_x");'), 0, "cột đứng một mình");
  assert.equal(chuoiBp('const A = defineSql("billing", "v9", "SELECT * FROM bil_x WHERE rate_bp > 0");'), 0, "SELECT * và so sánh");
  assert.equal(chuoiBp("const t = rateBp * tien;"), 0, "phần MÃ không vào bản quét chuỗi");
  assert.equal(chiChuoi('a "bc" // "de"\nf').length, 'a "bc" // "de"\nf'.length, "cùng độ dài với tệp gốc");
  assert.equal(chiChuoi('a "bc" `d${e}f`\n').split("\n").length, 2, "giữ ký tự xuống dòng");
  assert.equal(chiChuoi('x = "abc";').trim(), "abc", "chỉ còn nội dung chuỗi");
});

test("K-A-3 (1): phép nhân/chia với 10000, biến `…Bp` nhân/chia và lời gọi lamTronNuaLen chỉ ở tệp nguồn — chỗ khác phải nằm trong PHAN_VAN_DA_RA kèm lý do", () => {
  const tatCa = quet();
  const taiNguon = tatCa.filter((t) => t.file === NGUON).flatMap(choTrongMa);
  assert.ok(taiNguon.length > 0, `tự kiểm bộ quét: phải thấy công thức ở ${NGUON} (nếu không, bộ quét đang mù)`);
  const nguonBp = tatCa.filter((t) => t.file === NGUON).flatMap((t) => timCho(t.source, t.file, PHEP_BP)).map((c) => c.text);
  assert.ok(
    nguonBp.some((x) => /\brateBp\b/.test(x)) && nguonBp.some((x) => /\bcostRateBp\b/.test(x)),
    `tự kiểm bộ quét: phải thấy CẢ HAI phép nhân với biến tỷ lệ ở ${NGUON} (hoa hồng \`rateBp\` và giá vốn \`costRateBp\`); thấy: ${JSON.stringify(nguonBp)}`,
  );
  const ngoai = tatCa.filter((t) => t.file !== NGUON).flatMap(choTrongMa);
  const daRa = Object.fromEntries(Object.entries(PHAN_VAN_DA_RA).map(([f, v]) => [f, v.soCho]));
  const thucTe = dem(ngoai);
  for (const [f, v] of Object.entries(PHAN_VAN_DA_RA)) assert.ok(v.lyDo.trim().length > 0, `${f}: chỗ được miễn phải ghi lý do`);
  assert.deepEqual(
    thucTe,
    daRa,
    `Công thức tiền thứ hai? Phép nhân/chia với 10000, biến \`…Bp\`/\`…_bp\` hoặc lamTronNuaLen( ngoài ${NGUON} khác danh sách đã rà (Hiến chương 5.4: hoa hồng / giá vốn tính ở MỘT nơi). Chỗ lệch: ${viTri(ngoai.filter((c) => thucTe[c.file] !== daRa[c.file]))}`,
  );
});

test("K-A-3 (1b): phép nhân/chia với 10000 hay biến `…Bp` viết TRONG CHUỖI (câu SQL) chỉ ở tệp nguồn — chỗ khác phải nằm trong CHUOI_DA_RA kèm lý do", () => {
  const ngoai = quet().filter((t) => t.file !== NGUON).flatMap(choTrongChuoi);
  const daRa = Object.fromEntries(Object.entries(CHUOI_DA_RA).map(([f, v]) => [f, v.soCho]));
  const thucTe = dem(ngoai);
  for (const [f, v] of Object.entries(CHUOI_DA_RA)) assert.ok(v.lyDo.trim().length > 0, `${f}: chỗ được miễn phải ghi lý do`);
  assert.deepEqual(
    thucTe,
    daRa,
    `Công thức hoa hồng / giá vốn thứ hai trong CÂU SQL hay chuỗi? Phép nhân/chia với 10000 hoặc biến \`…Bp\`/\`…_bp\` nằm trong chuỗi ngoài ${NGUON} khác danh sách đã rà (Hiến chương 5.4: tính ở MỘT nơi, rồi ghi con số vào sổ). Chỗ lệch: ${viTri(ngoai.filter((c) => thucTe[c.file] !== daRa[c.file]))}`,
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
