// QUÉT TĨNH «giờ xấu nhất trong ngày» — lớp PHỤ của hàng rào ở tests/audit/dong-ho-gio-xau.mjs (lớp CHÍNH chặn lúc chạy trong khung thử; bài ghim: src/khung-thu-dong-ho-gio-xau.test.ts).
// Bài này canh chỗ lớp chính KHÔNG với tới: bài có hàm gieo riêng (dieu-phoi.test.ts), gọi thẳng `w.call("POST", …)`, và kịch bản e2e (tests/e2e/*.mjs, đồng hồ thật của máy chủ).
// LUẬT: trong MỘT khối `{ … }` (một lời gọi / một dòng dữ liệu) mà vừa có ngày tính từ giờ thật (`ngayThat(k)`, `inDays(k)`, `vnDay(k)`, `vnDate(k)`… với k ≤ 1) vừa có giờ đón / bắt đầu
// VIẾT SẴN trong 00:00–05:59 (khoá gio, bd, pickupTime, pickup_time, gioDon, time) thì đỏ: ngày mai trước 06:30 hay hôm nay đều lọt mốc tối thiểu 6 giờ của ADR-0049 ở một giờ nào đó trong ngày
// (công thức và lý do: đầu tests/audit/dong-ho-gio-xau.mjs). Giờ KẾT THÚC (khối đứng sau khoá `ketThuc`) không tính — mốc chỉ xét giờ đón / bắt đầu.
// GIỚI HẠN ĐÃ BIẾT (ghi ở docs/SO-HANG-RAO.md): chỉ thấy GIỜ VIẾT SẴN và ngày gọi hàm trong CÙNG khối. KHÔNG lần theo dữ liệu qua hàm trợ giúp / biến / tham số (bản cũ của
// tu-choi.test.ts đỏ chính vì thế: ngày ở một nơi, giờ 05:00 ở hàm khác — bài `giới hạn` dưới đây ghim điều đó), không thấy giờ tính lúc chạy, giờ viết dạng tham số vị trí
// (`leg(ngay, "05:00")`). Lớp chính (chặn lúc chạy) mới là hàng rào cho bài dùng khung thử; lớp này chỉ là lưới phụ rẻ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEN_HAM_CO_SAN = ["ngayThat", "inDays", "vnDay", "vnDate", "vnNgay"];
const KHOA_GIO = "gio|bd|pickupTime|pickup_time|gioDon|time";

/** NGOẠI LỆ CÓ TÊN: mỗi dòng một tệp, kèm LÝ DO. Tệp không còn phát hiện nào thì dòng cũ (bài dưới bắt) — gỡ dòng. Không thêm dòng cho bài thật mà chưa chắc nó an toàn: đổi sang ngày thật + 2. */
const NGOAI_LE: { tep: string; lyDo: string }[] = [
  { tep: "src/khung-thu-dong-ho-gio-xau.test.ts", lyDo: "Bài canh của chính hàng rào giờ xấu nhất: CỐ Ý gieo ngày mai lúc 04:29–05:30 để thấy hàng rào ném lỗi (assert.rejects) — bài còn lại trong tệp dùng ngày kia." },
  { tep: "src/quet-gio-xau-tinh.test.ts", lyDo: "Chuỗi mẫu của bài thử bộ quét này (chữ trong ngoặc kép, không chạy gieo gì)." },
];

interface PhatHien { ngay: string; gio: string }

/** Bỏ chú thích (không bỏ `https://`); chữ trong chú thích không được tính. Có thể bỏ nhầm phần cuối dòng có `//` trong chuỗi — sai theo hướng bỏ sót, không báo oan. */
const boChuThich = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:\\"'`])\/\/.*$/gm, "$1");

/** Tên hàm «ngày tính từ giờ thật» định nghĩa trong các tệp: một biểu thức mũi tên / một hàm có `Date.now()` và dùng tham số. Cộng với danh sách có sẵn. */
export function tenHamNgay(...cacTep: string[]): string[] {
  const ten = new Set(TEN_HAM_CO_SAN);
  for (const t of cacTep) {
    const s = boChuThich(t);
    for (const m of s.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*\(\s*(\w+)\s*(?::\s*number)?\s*(?:=\s*-?\d+)?\s*\)\s*(?::\s*string)?\s*=>[^\n]*Date\.now\(\)[^\n]*/g)) {
      if (new RegExp(`\\b${m[2]}\\b`).test(m[0].slice(m[0].indexOf("=>")))) ten.add(m[1]!);
    }
    for (const m of s.matchAll(/function\s+(\w+)\s*\(\s*(\w+)\s*(?::\s*number)?\s*(?:=\s*-?\d+)?\s*\)\s*(?::\s*string)?\s*\{[^}]*Date\.now\(\)[^}]*\}/g)) {
      if (new RegExp(`\\b${m[2]}\\b`).test(m[0].slice(m[0].indexOf("{")))) ten.add(m[1]!);
    }
  }
  return [...ten].sort();
}

/** Khối `{ … }` bao quanh vị trí `i` (khối trong cùng): chỉ số `{` và `}`; null nếu không có. Đếm ngoặc, không hiểu chuỗi — đủ cho dữ liệu thử. */
function khoiBaoQuanh(s: string, i: number): { dau: number; cuoi: number } | null {
  let sau = 0;
  let dau = -1;
  for (let j = i - 1; j >= 0; j--) {
    if (s[j] === "}") sau++;
    else if (s[j] === "{") {
      if (sau === 0) { dau = j; break; }
      sau--;
    }
  }
  if (dau < 0) return null;
  let trong = 0;
  for (let j = dau; j < s.length; j++) {
    if (s[j] === "{") trong++;
    else if (s[j] === "}" && --trong === 0) return { dau, cuoi: j };
  }
  return null;
}

/** Các chỗ trong `text` mà MỘT khối có cả ngày gần (k ≤ 1) lẫn giờ đón / bắt đầu 00:00–05:59 viết sẵn. */
export function quetGioXau(text: string, tenHam: string[]): PhatHien[] {
  const s = boChuThich(text);
  const ngayGan = new RegExp(`\\b(?:${tenHam.join("|")})\\(\\s*(-?\\d+)\\s*\\)`, "g");
  const ra: PhatHien[] = [];
  for (const m of s.matchAll(new RegExp(`\\b(${KHOA_GIO})\\s*:\\s*(["'\`])(0[0-5]:[0-5]\\d)\\2`, "g"))) {
    const khoi = khoiBaoQuanh(s, m.index!);
    if (!khoi) continue;
    if (/\b(?:ketThuc|kt)\s*:\s*$/.test(s.slice(Math.max(0, khoi.dau - 30), khoi.dau))) continue; // giờ KẾT THÚC: mốc không xét
    const noi = s.slice(khoi.dau, khoi.cuoi + 1);
    for (const n of noi.matchAll(ngayGan)) {
      if (Number(n[1]) <= 1) ra.push({ ngay: n[0].replace(/\s+/g, ""), gio: `${m[1]}: ${m[3]}` });
    }
  }
  return ra;
}

// ---- Bộ quét chạy được và bắt được ca mẫu (chuỗi mẫu — không dùng tệp thật) ---------------------------------------------------------------------------------
const TEN = tenHamNgay();
const phatHien = (code: string) => quetGioXau(code, TEN).map((p) => `${p.ngay} | ${p.gio}`);

test("quét tĩnh giờ xấu nhất — bắt ngày gần + giờ sớm trong cùng một khối (ngày mai 05:30, hôm nay 03:00, hôm qua)", () => {
  assert.deepEqual(phatHien('await don(w, { ngay: inDays(1), gio: "05:30" });'), ["inDays(1) | gio: 05:30"]);
  assert.deepEqual(phatHien("taoChuyen(w, { batDau: { ngay: ngayThat(0), gio: '03:00' } })"), ["ngayThat(0) | gio: 03:00"]);
  assert.deepEqual(phatHien('{ pickupDate: vnDate(-1), pickupTime: "04:45" }'), ["vnDate(-1) | pickupTime: 04:45"]);
  assert.deepEqual(phatHien('chuyenSan(w, { ngay: vnDay( 1 ), bd: `05:00`, kt: "07:00" })'), ["vnDay(1) | bd: 05:00"], "khoảng trắng và dấu nháy ngược");
});

test("quét tĩnh giờ xấu nhất — KHÔNG báo oan: ngày kia trở đi, giờ từ 06:00, giờ KẾT THÚC, chữ trong chú thích, hàm lạ", () => {
  assert.deepEqual(phatHien('don(w, { ngay: inDays(2), gio: "05:30" })'), [], "k = 2: luôn cách ≥ 24 giờ");
  assert.deepEqual(phatHien('don(w, { ngay: inDays(1), gio: "06:30" })'), [], "giờ từ 06:00 không thuộc diện giờ sớm");
  assert.deepEqual(phatHien('taoChuyen(w, { batDau: { ngay: inDays(1), gio: "23:30" }, ketThuc: { ngay: inDays(1), gio: "01:00" } })'), [], "01:00 là giờ KẾT THÚC");
  assert.deepEqual(phatHien('// don(w, { ngay: inDays(1), gio: "05:30" })\n/* { ngay: ngayThat(0), bd: "05:00" } */'), [], "chú thích");
  assert.deepEqual(phatHien('don(w, { ngay: homNay(1), gio: "05:30" })'), [], "hàm không phải hàm ngày tương đối");
  assert.deepEqual(phatHien('const a = { ngay: inDays(1) }; const b = { gio: "05:30" };'), [], "hai khối khác nhau");
});

test("quét tĩnh giờ xấu nhất — nhận ra hàm ngày tương đối mới qua ĐỊNH NGHĨA (mũi tên và function), không chỉ danh sách có sẵn", () => {
  const ten = tenHamNgay(
    "const daysFromNow = (n: number) => new Date(Date.now() + n * 86400e3).toISOString().slice(0, 10);",
    "export function ngayTuGio(days = 0) {\n  return new Date(Date.now() + 7 * 3600_000 + days * 86400_000).toISOString().slice(0, 10);\n}",
    "const khongPhaiHam = (n: number) => n + 1;",
  );
  assert.ok(ten.includes("daysFromNow") && ten.includes("ngayTuGio"), ten.join());
  assert.ok(!ten.includes("khongPhaiHam"));
  assert.deepEqual(quetGioXau('{ ngay: daysFromNow(1), gio: "05:00" }', ten).length, 1);
  assert.deepEqual(quetGioXau('{ ngay: ngayTuGio(0), pickupTime: "01:00" }', ten).length, 1);
});

test("quét tĩnh giờ xấu nhất — GIỚI HẠN ĐÃ BIẾT: không lần theo dữ liệu qua biến / hàm trợ giúp (đây là lý do lớp CHÍNH chặn lúc chạy mới là hàng rào)", () => {
  // Đúng hình bản cũ của tu-choi.test.ts (13–14/10/2026): ngày ở một nơi, giờ 05:00 / 05:30 ở hàm khác. Bộ quét KHÔNG thấy — khung thử mới thấy lúc chạy.
  const banCu = [
    "const ngay = ngayThat(1);",
    'const a = await chuyenSan(w, { taiXe: DRIVER_PARTNER, ngay, bd: "12:30", kt: "15:00", gio: "13:00" });',
    "async function chuyenNguon(w: any, ngay: string) {",
    '  const s = await chuyenSan(w, { taiXe: DRIVER, ngay, bd: "05:00", kt: "07:00", gio: "05:30", noiDon: "Khách sạn Nguồn" });',
    "}",
  ].join("\n");
  assert.deepEqual(phatHien(banCu), [], "bộ quét tĩnh bó tay với dữ liệu đi qua biến — ghi ở sổ hàng rào");
});

// ---- Quét thật mã trong kho ---------------------------------------------------------------------------------------------------------------------------------
const tepQuet = () =>
  [...globSync("src/**/*.test.ts", { cwd: GOC }), ...globSync("tests/e2e/*.mjs", { cwd: GOC }), ...globSync("tests/audit/*.mjs", { cwd: GOC })]
    .map((f) => f.split("\\").join("/"))
    .sort();
const docTep = (f: string) => readFileSync(join(GOC, f), "utf8");

test("quét tĩnh giờ xấu nhất — mã trong kho (bài src, e2e, khung thử) không có ngày gần + giờ sớm viết sẵn trong cùng một khối, ngoài ngoại lệ có tên", () => {
  const tep = tepQuet();
  assert.ok(tep.length > 200, `quét đủ tệp (${tep.length})`);
  const noiDung = new Map(tep.map((f) => [f, docTep(f)] as const));
  const ten = tenHamNgay(...noiDung.values());
  for (const co of ["ngayThat", "inDays", "vnDate"]) assert.ok(ten.includes(co), `phải thấy hàm ngày ${co}`);
  const loi: string[] = [];
  const coPhatHien = new Set<string>();
  for (const [f, text] of noiDung) {
    const ph = quetGioXau(text, ten);
    if (ph.length) coPhatHien.add(f);
    if (ph.length && !NGOAI_LE.some((n) => n.tep === f)) {
      loi.push(`${f}: ${[...new Set(ph.map((p) => `${p.ngay} cùng ${p.gio}`))].join("; ")}`);
    }
  }
  assert.deepEqual(
    loi,
    [],
    "Bài gieo ngày tính từ giờ thật (k ≤ 1) cùng giờ đón / bắt đầu trước 06:00 → xanh ban ngày, ĐỎ theo giờ trong ngày (mốc tối thiểu 6 giờ, ADR-0049). Sửa: dùng ngày thật + 2 hoặc giờ từ 06:30 " +
      "(công thức: đầu tests/audit/dong-ho-gio-xau.mjs). Ngoại lệ phải có tên + lý do ở NGOAI_LE.",
  );
  for (const n of NGOAI_LE) {
    assert.ok(n.lyDo.trim().length >= 30, `${n.tep}: ngoại lệ phải có LÝ DO rõ`);
    assert.ok(tep.includes(n.tep), `${n.tep}: tệp ngoại lệ không còn trong phạm vi quét — gỡ dòng`);
    assert.ok(coPhatHien.has(n.tep), `${n.tep}: ngoại lệ THỪA (tệp không còn phát hiện nào) — gỡ dòng`);
  }
  assert.equal(new Set(NGOAI_LE.map((n) => n.tep)).size, NGOAI_LE.length, "mỗi tệp một dòng ngoại lệ");
});
