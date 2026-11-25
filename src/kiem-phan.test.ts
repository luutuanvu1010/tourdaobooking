// ADR-0179 Đ1.2–Đ1.3: bảng chia phần của lượt kiểm trên GitHub và máy gom "không bỏ bài nào". Hàm THUẦN (không chạy node --test hay wrangler).
// Đột biến đã quan sát (sổ hàng rào): bỏ một tệp khỏi phần ⇒ đỏ; bỏ audit ở một phần e2e ⇒ đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

type Bang = { rieng: string[]; test: string[][]; e2e: string[][]; khung: string[][] };
type Man = { khoa: string; trang: string; bo: string };
type ToanBo = { tests: string[]; e2e: string[]; manKhung?: Man[]; daChuyen?: string[] };
type Lib = {
  TEP_DO_GIO: string;
  BUOC_RIENG: string[];
  SO_PHAN_TEST: number;
  SO_PHAN_E2E: number;
  SO_MAY_E2E: number;
  SO_MANH_KHUNG: number;
  danhSachTest: () => string[];
  bangChia: (o?: { tests?: string[]; e2e?: string[]; soPhanTest?: number; soPhanE2e?: number; kichThuoc?: (f: string) => number; thoiGianTest?: Record<string, number>; manKhung?: Man[]; soManhKhung?: number }) => Bang;
  kiemBangChia: (bang: Bang, toanBo: ToanBo) => string[];
  phanE2e: (k: number) => string[];
  phanCuaMay: (r: number) => number[];
  trangDaKhaiKhuon: () => string[];
  gomKetQua: (bang: Bang, baoCao: unknown[], toanBo: ToanBo) => { ok: boolean; loi: string[]; baiDo: string[]; tong: { soTep: number; soBai: number; soBoQua: number; soKichBan: number }; giayE2e: Record<string, number>; giayTep: Record<string, number>; giayTuong: Record<string, number> };
  tepChoLau: (kq: { giayTep: Record<string, number>; giayTuong: Record<string, number> }) => { tep: string; giayTuong: number; giayBai: number }[];
  TEP_DIEU_KHIEN: string[];
};
const lib = (await import(new URL("../scripts/kiem-phan.mjs", import.meta.url).href)) as Lib;
const { ALL, THOI_GIAN: THOI_GIAN_E2E } = (await import(new URL("../tests/e2e/danh-sach.mjs", import.meta.url).href)) as { ALL: string[]; THOI_GIAN: Record<string, number> };

const TESTS = ["src/a.test.ts", "src/b.test.ts", "src/c.test.ts", "src/d.test.ts", "src/e.test.ts", "src/claude-guard-thoi-gian.test.ts"];
const E2E = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];
const MAN: Man[] = [{ khoa: "m1", trang: "/a", bo: "SALES" }, { khoa: "m2", trang: "/b", bo: "ADMIN" }, { khoa: "m3", trang: "/b", bo: "SALES" }];
const toanBo: ToanBo = { tests: TESTS, e2e: E2E, manKhung: MAN, daChuyen: ["/a", "/b"] };
const bangNho = () => lib.bangChia({ tests: TESTS, e2e: E2E, soPhanTest: 4, soPhanE2e: 6, kichThuoc: () => 1, manKhung: MAN, soManhKhung: 2 });
const dem = (tests: number, skipped = 0, todo = 0) => ({ tests, pass: tests, fail: 0, skipped, todo });

/** Báo cáo đủ và xanh cho bảng nhỏ — từng ca sửa đúng một chỗ. */
function baoCaoDu(bang: Bang): any[] {
  return [
    { loai: "rieng", buoc0: { ok: true, doi: [] }, typecheck: { ok: true }, doGio: { ok: true, tep: [lib.TEP_DO_GIO], dem: dem(3) } },
    ...bang.khung.map((khoa, i) => ({ loai: "khung", manh: i + 1, soManh: bang.khung.length, ok: true, maThoat: 0, khoa: [...khoa], trang: [...new Set(khoa.map((k) => MAN.find((m) => m.khoa === k)!.trang))], soMan: khoa.length, soO: khoa.length * 79, khongDat: 0 })),
    ...bang.test.map((tep, i) => ({ loai: "test", phan: i + 1, tep, ok: true, dem: dem(tep.length * 10, 1, 0), baiDo: [] })),
    ...bang.e2e.map((ds, i) => ({ loai: "e2e", phan: i + 1, kichBan: ds.map((ten) => ({ ten, ok: true, giay: 2 })), audit: true, ok: true })),
  ];
}

test("bảng chia THẬT: phần riêng đủ ba bước; npm test ≥ 4 phần, e2e ≥ 6 phần; hợp các phần = toàn bộ, không trùng (kiemBangChia rỗng)", () => {
  assert.ok(lib.SO_PHAN_TEST >= 4 && lib.SO_PHAN_E2E >= 6);
  const tests = lib.danhSachTest();
  assert.ok(tests.includes(lib.TEP_DO_GIO), "bài đo giờ phải có trong glob");
  assert.ok(tests.includes("src/kiem-phan.test.ts"));
  const bang = lib.bangChia();
  assert.deepEqual(bang.rieng, lib.BUOC_RIENG);
  assert.equal(bang.test.length, lib.SO_PHAN_TEST);
  assert.equal(bang.e2e.length, lib.SO_PHAN_E2E);
  assert.equal(bang.khung.length, lib.SO_MANH_KHUNG);
  assert.deepEqual(lib.kiemBangChia(bang, { tests, e2e: ALL }), []);
  assert.ok(!bang.test.flat().includes(lib.TEP_DO_GIO), "bài đo giờ chỉ ở phần riêng");
  for (const p of [...bang.test, ...bang.e2e]) assert.ok(p.length > 0, "không phần nào rỗng");
});

// ADR-0215 Đ1.2–Đ1.3: bảng việc ghi THẲNG trong quy trình (không còn việc «Chia phần» in ra lúc chạy) ⇒ phải khớp hằng số; tổng việc chạy cùng lúc ≤ 20
// (trần gói GitHub miễn phí — vượt thì lượt kiểm tự xếp hàng, chậm đi chứ không nhanh lên). Rút lượt kiểm 25/11: việc = mảnh đo khung (mảnh 1 gánh phần riêng)
// + phần npm test + máy e2e (mỗi máy nhiều phần e2e).
test("quy trình kiem.yml: ma trận mảnh khung / phần npm test / máy e2e khớp SO_MANH_KHUNG / SO_PHAN_TEST / SO_MAY_E2E; tổng ≤ 20 việc cùng lúc; mọi phần e2e có máy", () => {
  const yml = readFileSync(new URL("../.github/workflows/kiem.yml", import.meta.url), "utf8");
  const day = (n: number) => `[${Array.from({ length: n }, (_, i) => i + 1).join(", ")}]`;
  const maTran = [...yml.matchAll(/^\s+(manh|phan|may): (\[[\d, ]+\])$/gm)].map((m) => `${m[1]}=${m[2]}`);
  assert.deepEqual(maTran, [`manh=${day(lib.SO_MANH_KHUNG)}`, `phan=${day(lib.SO_PHAN_TEST)}`, `may=${day(lib.SO_MAY_E2E)}`], "ma trận (mảnh khung, npm test, máy e2e) phải đúng 1…N");
  assert.ok(lib.SO_MANH_KHUNG + lib.SO_PHAN_TEST + lib.SO_MAY_E2E <= 20, `${lib.SO_MANH_KHUNG} + ${lib.SO_PHAN_TEST} + ${lib.SO_MAY_E2E} việc vượt trần 20 của gói miễn phí`);
  const theoMay = Array.from({ length: lib.SO_MAY_E2E }, (_, i) => lib.phanCuaMay(i + 1));
  assert.deepEqual(theoMay.flat().sort((a, b) => a - b), Array.from({ length: lib.SO_PHAN_E2E }, (_, i) => i + 1), "mỗi phần e2e đúng một máy");
  for (const ps of theoMay) assert.ok(ps.length >= 1, "không máy e2e nào rỗng");
  assert.throws(() => lib.phanCuaMay(0));
  assert.throws(() => lib.phanCuaMay(lib.SO_MAY_E2E + 1));
  // Phần 1 giữ kịch bản nặng nhất (chiaNhom: nặng trước, vào phần nhẹ nhất ⇒ phần 1) và chạy một mình khi số phần < 2 × số máy (lượt 45559378918).
  const bang = lib.bangChia();
  const nangNhat = [...bang.e2e.flat()].sort((a, b) => (THOI_GIAN_E2E[b] ?? 15) - (THOI_GIAN_E2E[a] ?? 15))[0];
  assert.ok(bang.e2e[0].includes(nangNhat), `phần 1 phải chứa kịch bản nặng nhất (${nangNhat})`);
  if (lib.SO_PHAN_E2E < 2 * lib.SO_MAY_E2E) assert.deepEqual(lib.phanCuaMay(1), [1], "phần nặng nhất chạy một mình một máy");
});

test("gopDem: cộng số bài của hai tiến trình, nối bài đỏ, gộp giây; thiếu một bản hoặc số hỏng ⇒ máy gom không coi là đếm được", () => {
  const g = (lib as unknown as { gopDem: (a: unknown, b: unknown) => Record<string, unknown> | null }).gopDem;
  const a = { tests: 3, pass: 2, fail: 1, skipped: 0, todo: 0, baiDo: ["src/a.test.ts: x"], giayTep: { "src/a.test.ts": 1 }, giayTuong: { "src/a.test.ts": 2 } };
  const b = { tests: 5, pass: 5, fail: 0, skipped: 1, todo: 0, baiDo: [], giayTep: { "src/b.test.ts": 3 }, giayTuong: { "src/b.test.ts": 4 } };
  assert.deepEqual(g(a, b), { tests: 8, pass: 7, fail: 1, skipped: 1, todo: 0, baiDo: ["src/a.test.ts: x"], giayTep: { "src/a.test.ts": 1, "src/b.test.ts": 3 }, giayTuong: { "src/a.test.ts": 2, "src/b.test.ts": 4 } });
  assert.equal(g(a, null), null);
  assert.equal(g(null, b), null);
  const hong = g(a, { ...b, tests: undefined }) as { tests: number };
  assert.ok(Number.isNaN(hong.tests), "số hỏng ⇒ NaN ⇒ laDem của máy gom từ chối");
});

test("phanCuaMay: 17 phần / 9 máy ⇒ máy 1 một mình phần 1, máy khác hai phần; 18 phần ⇒ hai phần mỗi máy; số phần ngoài [máy, 2·máy] ⇒ ném lỗi", () => {
  const p = (r: number, n: number) => (lib.phanCuaMay as unknown as (r: number, n: number, m: number) => number[])(r, n, 9);
  assert.deepEqual(Array.from({ length: 9 }, (_, i) => p(i + 1, 17)), [[1], [2, 10], [3, 11], [4, 12], [5, 13], [6, 14], [7, 15], [8, 16], [9, 17]]);
  assert.deepEqual(Array.from({ length: 9 }, (_, i) => p(i + 1, 18)), [[1, 10], [2, 11], [3, 12], [4, 13], [5, 14], [6, 15], [7, 16], [8, 17], [9, 18]]);
  assert.deepEqual(Array.from({ length: 9 }, (_, i) => p(i + 1, 9)), [[1], [2], [3], [4], [5], [6], [7], [8], [9]]);
  assert.throws(() => p(1, 8));
  assert.throws(() => p(1, 19));
});

// ADR-0222 Đ7(b): máy GitHub là Linux — Chrome phải qua scripts/chrome-ci.sh (bộ bọc mặc định trỏ Chrome macOS). Phần riêng chạy ĐẦU việc mảnh 1, TRƯỚC bước đo
// (bài đo giờ phải chạy một mình, không chung máy với wrangler dev / Chrome); bước đo vẫn chạy khi phần riêng đỏ (báo đủ lỗi một lần).
test("quy trình kiem.yml: việc đo khung có CHROME_BIN = scripts/chrome-ci.sh; phần riêng chỉ ở mảnh 1 và ĐỨNG TRƯỚC bước đo; gom chờ cả ba loại việc", () => {
  const yml = readFileSync(new URL("../.github/workflows/kiem.yml", import.meta.url), "utf8");
  const khung = /^  khung:\n([\s\S]*?)\n  test:/m.exec(yml)?.[1] ?? "";
  assert.match(khung, /CHROME_BIN: \$\{\{ github\.workspace \}\}\/scripts\/chrome-ci\.sh/);
  assert.ok(Number(/timeout-minutes: (\d+)/.exec(khung)?.[1]) >= 10, "việc đo khung cần trần giờ ≥ 10 phút");
  const iRieng = khung.indexOf("kiem-phan.mjs rieng");
  const iKhung = khung.indexOf("kiem-phan.mjs khung ${{ matrix.manh }}");
  assert.ok(iRieng > 0 && iKhung > iRieng, "phần riêng phải đứng trước bước đo khung");
  assert.match(khung.slice(0, iRieng + "kiem-phan.mjs rieng".length), /- if: matrix\.manh == 1\n\s+run: mkdir -p bao-cao && node scripts\/kiem-phan\.mjs rieng$/m);
  assert.match(yml, /needs: \[khung, test, e2e\]/);
  assert.ok(!lib.BUOC_RIENG.includes("do-khung"), "đo khung là việc riêng theo mảnh, không còn trong phần riêng");
  assert.ok(existsSync(new URL("../scripts/chrome-ci.sh", import.meta.url)));
});

test("bảng chia e2e: mỗi phần là DÃY CON của ALL (giữ ràng buộc thứ tự: feedback trước maintenance, passkey cuối…); phanE2e(k) = phần k", () => {
  const bang = lib.bangChia();
  for (const p of bang.e2e) assert.deepEqual(p, [...p].sort((a, b) => ALL.indexOf(a) - ALL.indexOf(b)));
  for (let k = 1; k <= lib.SO_PHAN_E2E; k++) assert.deepEqual(lib.phanE2e(k), bang.e2e[k - 1]);
  assert.throws(() => lib.phanE2e(0));
  assert.throws(() => lib.phanE2e(lib.SO_PHAN_E2E + 1));
});

test("kiemBangChia: bỏ một tệp / một kịch bản, trùng ở hai phần, thiếu bước riêng, bài đo giờ lọt vào phần thường, ít phần hơn mức tối thiểu ⇒ có lỗi", () => {
  const ok = bangNho();
  assert.deepEqual(lib.kiemBangChia(ok, toanBo), []);
  const hong: [string, (b: Bang) => void, RegExp][] = [
    ["bỏ một tệp", (b) => b.test[0]!.pop(), /thiếu.*src\//],
    ["bỏ một kịch bản", (b) => b.e2e[0]!.pop(), /thiếu.*s\d/],
    ["trùng tệp", (b) => b.test[1]!.push(b.test[0]![0]!), /hai phần/],
    ["thiếu bước riêng", (b) => b.rieng.splice(1, 1), /phần riêng/],
    ["bài đo giờ ở phần thường", (b) => b.test[0]!.push(lib.TEP_DO_GIO), /đo giờ/],
    ["ít phần test", (b) => b.test.splice(3, 1), /4 phần|phần npm test/],
    ["ít phần e2e", (b) => b.e2e.splice(5, 1), /6 phần|phần e2e/],
    ["bỏ một màn khỏi mảnh đo khung", (b) => b.khung[0]!.pop(), /đo khung gốc: thiếu m\d/],
    ["màn đo khung ở hai mảnh", (b) => b.khung[1]!.push(b.khung[0]![0]!), /đo khung gốc: .*hai phần/],
    ["không có mảnh đo khung", (b) => (b.khung = []), /đo khung gốc: không có mảnh/],
  ];
  for (const [ten, sua, re] of hong) {
    const b = structuredClone(ok);
    sua(b);
    const loi = lib.kiemBangChia(b, toanBo);
    assert.ok(loi.length > 0, `phải đỏ: ${ten}`);
    assert.match(loi.join("\n"), re, ten);
  }
});

test("gomKetQua: đủ và xanh ⇒ ok, tổng số tệp / bài / bỏ qua / kịch bản đúng, có giây từng kịch bản", () => {
  const bang = bangNho();
  const r = lib.gomKetQua(bang, baoCaoDu(bang), toanBo);
  assert.deepEqual(r.loi, []);
  assert.equal(r.ok, true);
  assert.equal(r.tong.soTep, TESTS.length);
  assert.equal(r.tong.soBai, 3 + (TESTS.length - 1) * 10);
  assert.equal(r.tong.soBoQua, 4);
  assert.equal(r.tong.soKichBan, E2E.length);
  assert.equal(r.giayE2e.s1, 2);
});

test("gomKetQua (ADR-0179 tiêu chí 2): thiếu báo cáo / phần chạy thiếu tệp / thiếu audit / audit đỏ / một phần đỏ / báo cáo trùng / thiếu phần riêng ⇒ ĐỎ, nêu lý do", () => {
  const bang = bangNho();
  const hong: [string, (bc: any[]) => any[], RegExp][] = [
    ["thiếu báo cáo một phần test", (bc) => bc.filter((x) => !(x.loai === "test" && x.phan === 2)), /npm test phần 2/],
    ["phần test chạy thiếu một tệp", (bc) => (bc.find((x) => x.loai === "test").tep.pop(), bc), /khác bảng chia|thiếu/],
    ["phần e2e không báo audit", (bc) => (delete bc.find((x) => x.loai === "e2e").audit, bc), /audit-invariants/],
    ["phần e2e audit = null (không chạy)", (bc) => ((bc.find((x) => x.loai === "e2e").audit = null), bc), /audit-invariants/],
    ["audit đỏ", (bc) => ((bc.find((x) => x.loai === "e2e").audit = false), bc), /audit-invariants/],
    ["phần e2e chạy thiếu kịch bản", (bc) => (bc.find((x) => x.loai === "e2e").kichBan.pop(), bc), /khác bảng chia|thiếu/],
    ["một kịch bản đỏ", (bc) => ((bc.find((x) => x.loai === "e2e").kichBan[0].ok = false), bc), /s\d/],
    ["một phần test đỏ", (bc) => {
      const t = bc.find((x) => x.loai === "test");
      t.ok = false;
      t.dem.fail = 1;
      t.baiDo = ["src/a.test.ts: ca giả"];
      return bc;
    }, /npm test phần 1/],
    ["báo cáo trùng một phần", (bc) => [...bc, structuredClone(bc.find((x) => x.loai === "test"))], /hai báo cáo|trùng/],
    ["thiếu phần riêng", (bc) => bc.filter((x) => x.loai !== "rieng"), /phần riêng/],
    ["Bước 0 đổi tệp sinh", (bc) => ((bc[0].buoc0 = { ok: false, doi: ["docs/x.json"] }), bc), /Bước 0/],
    ["typecheck đỏ", (bc) => ((bc[0].typecheck = { ok: false }), bc), /typecheck/],
    ["bài đo giờ đỏ", (bc) => ((bc[0].doGio.ok = false), bc), /đo giờ/],
    // ADR-0222 Đ7(b): lệnh đo khung gốc trên trang thật, chia mảnh. Thiếu báo cáo một mảnh, có ô không đạt, mảnh đo thiếu màn được giao (mã 2), mảnh đo KHÁC
    // phần được giao, hợp các mảnh không phủ mọi trang đã khai khuôn, mảnh lạ hay trùng đều ĐỎ — không bao giờ coi là bỏ qua.
    ["thiếu báo cáo một mảnh đo khung", (bc) => bc.filter((x) => !(x.loai === "khung" && x.manh === 2)), /thiếu báo cáo đo khung gốc mảnh 2/],
    ["mảnh đo khung có ô không đạt", (bc) => (Object.assign(bc.find((x) => x.loai === "khung"), { ok: false, maThoat: 1, khongDat: 3, loi: "3 ô không đạt" }), bc), /khung gốc.*mảnh 1.*3 ô không đạt/],
    ["mảnh đo thiếu màn được giao (mã 2)", (bc) => (Object.assign(bc.find((x) => x.loai === "khung"), { ok: false, maThoat: 2, loi: "mảnh 1/2 đo thiếu màn: m3" }), bc), /khung gốc.*đo thiếu màn/],
    ["mảnh ok mà mã ≠ 0", (bc) => ((bc.find((x) => x.loai === "khung").maThoat = 2), bc), /khung gốc/],
    ["mảnh không đo ô nào", (bc) => (Object.assign(bc.find((x) => x.loai === "khung"), { soO: 0 }), bc), /khung gốc/],
    ["mảnh đo khác phần được giao (bỏ một màn mà vẫn báo đạt)", (bc) => (bc.find((x) => x.loai === "khung").khoa.pop(), bc), /khung gốc.*đo khác phần được giao/],
    ["hợp các mảnh không phủ một trang đã khai khuôn", (bc) => {
      for (const x of bc.filter((y) => y.loai === "khung")) x.trang = x.trang.filter((t: string) => t !== "/b");
      return bc;
    }, /khung gốc.*đo thiếu \/b/],
    ["mảnh báo số mảnh khác bảng chia (chạy theo bảng cũ)", (bc) => ((bc.find((x) => x.loai === "khung").soManh = 5), bc), /khung gốc.*mảnh 1.*đo khác phần được giao/],
    ["báo cáo mảnh trùng", (bc) => [...bc, structuredClone(bc.find((x) => x.loai === "khung"))], /mảnh 1 có hai báo cáo/],
    ["báo cáo mảnh lạ", (bc) => [...bc, { ...structuredClone(bc.find((x) => x.loai === "khung")), manh: 9 }], /mảnh lạ/],
    ["báo cáo không đọc được", (bc) => [...bc, "rác"], /không đọc được/],
  ];
  for (const [ten, sua, re] of hong) {
    const r = lib.gomKetQua(bang, sua(baoCaoDu(bang)), toanBo);
    assert.equal(r.ok, false, `phải đỏ: ${ten}`);
    assert.match(r.loi.join("\n"), re, ten);
  }
});

test("gomKetQua: kết quả đỏ nêu TÊN bài / kịch bản đỏ để day-len in cho chủ", () => {
  const bang = bangNho();
  const bc = baoCaoDu(bang);
  bc.find((x) => x.loai === "e2e").kichBan[0].ok = false;
  const t = bc.find((x) => x.loai === "test");
  t.ok = false;
  t.baiDo = ["src/a.test.ts: ca giả"];
  const r = lib.gomKetQua(bang, bc, toanBo);
  assert.ok(r.baiDo.includes("src/a.test.ts: ca giả"));
  assert.ok(r.baiDo.some((x) => /^e2e /.test(x)));
});

test("TEP_DIEU_KHIEN (Đ2.3): có quy trình GitHub, bảng chia, bộ chạy, danh sách e2e, audit; chứa TRỌN chuỗi nhập của audit-invariants.mjs", () => {
  for (const t of ["package-lock.json", "tsconfig.json", "web/tsconfig.json", "web/sw/tsconfig.json", "tests/e2e/lib.mjs", ".github/workflows", "package.json", "scripts/chay-test.mjs", "scripts/kiem-phan.mjs", "scripts/dem-bai.mjs", "tests/e2e/run.mjs", "tests/e2e/danh-sach.mjs", "tests/e2e/thoi-gian.json", "scripts/audit-invariants.mjs", "src/claude-guard-thoi-gian.test.ts", "scripts/release-lib.mjs"]) {
    assert.ok(lib.TEP_DIEU_KHIEN.includes(t), t);
  }
  // Đi chuỗi nhập tương đối (import "./x.mjs" / import("./x.mjs")) từ audit-invariants.mjs: mọi tệp CÂU KIỂM (scripts/) chạm tới phải nằm trong danh sách.
  // Luật nghiệp vụ ở src/ mà câu kiểm dùng lại (audit-thuong-mai.mjs nhập src/shared/…) là MÃ SẢN PHẨM, đã có npm test canh — không phải tệp điều khiển.
  const seen = new Set<string>();
  const di = (rel: string) => {
    // Bỏ qua đường dẫn không phải tệp có thật (chuỗi "./x.ts" nằm trong mẫu chữ mà bộ sinh in ra, không phải lệnh nhập).
    if (seen.has(rel) || !existsSync(new URL(`../${rel}`, import.meta.url))) return;
    seen.add(rel);
    const src = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
    for (const m of src.matchAll(/(?:from\s+|import\(\s*)["'](\.\.?\/[^"']+)["']/g)) {
      const next = new URL(m[1]!, new URL(`../${rel}`, import.meta.url)).pathname.replace(new URL("../", import.meta.url).pathname, "");
      di(next);
    }
  };
  di("scripts/audit-invariants.mjs");
  di("scripts/sinh-so-do-trang.mjs"); // Bước 0 của phần riêng: bộ sinh kho trợ lý và mọi tệp scripts/ nó nạp
  assert.ok(seen.size >= 3, "phải thấy ít nhất audit-invariants, audit-checks, audit-thuong-mai");
  for (const t of [...seen].filter((x) => x.startsWith("scripts/"))) assert.ok(lib.TEP_DIEU_KHIEN.includes(t), `tệp ${t} (audit-invariants nạp) phải có trong TEP_DIEU_KHIEN`);
});

test("run.mjs --phan: VẪN chạy audit-invariants --strict cuối phần (chạy lẻ theo tên thì không); ghi báo cáo kèm audit", () => {
  const r = readFileSync(new URL("../tests/e2e/run.mjs", import.meta.url), "utf8");
  assert.match(r, /const coAudit = cacPhan !== null \|\| phan !== null \|\| !picked\.length;/);
  // Chạy theo máy (--may): mỗi phần một nhóm (D1 + wrangler dev riêng), báo cáo riêng từng phần, xanh chỉ khi audit của chính phần đó xanh và mọi kiểm log xanh.
  assert.match(r, /const nhomList = cacPhan \? cacPhan\.map\(\(k\) => phanE2e\(k\)\) : chiaNhom\(scripts, soNhom\);/);
  assert.match(r, /const ok = !m\.chet && daChay\.length === m\.ten\.length && daChay\.every\(\(x\) => x\.ok\) && m\.audit === true && kiemLog;/);
  assert.match(r, /join\(thuMucKetQua, `e2e-\$\{cacPhan\[m\.k\]\}\.json`\)/);
  assert.match(r, /if \(coAudit\) \{\n\s+console\.log\(`▶ audit-invariants/);
  assert.match(r, /"--persist-to", may\.persist, "--strict"\]/);
  assert.match(r, /kichBan: daChay, audit, ok:/);
  assert.match(r, /import \{ ALL, chiaNhom[^}]*\} from "\.\/danh-sach\.mjs";/, "danh sách kịch bản chỉ ở danh-sach.mjs");
  assert.doesNotMatch(r, /const ALL = \[/, "run.mjs không tự khai danh sách thứ hai");
});

test("bảng chia npm test theo GIÂY THẬT (scripts/thoi-gian-test.json): tệp nặng đứng riêng; tệp chưa có số ước theo cỡ tệp quy ra giây", () => {
  const tests = ["src/a.test.ts", "src/b.test.ts", "src/c.test.ts", "src/d.test.ts", "src/e.test.ts", "src/claude-guard-thoi-gian.test.ts"];
  const b = lib.bangChia({ tests, e2e: E2E, soPhanTest: 4, soPhanE2e: 6, kichThuoc: () => 1000, thoiGianTest: { "src/a.test.ts": 300, "src/b.test.ts": 100, "src/c.test.ts": 100, "src/d.test.ts": 100 } });
  assert.deepEqual(b.test.find((p) => p.includes("src/a.test.ts")), ["src/a.test.ts"], "tệp 300 giây đứng một mình");
  assert.deepEqual(lib.kiemBangChia(b, { tests, e2e: E2E }), []);
  // Bảng giây THẬT của kho: mọi khoá là tệp kiểm có thật hoặc đã bị xoá (không chặn), mọi giá trị là số giây ≥ 0.
  const tg = JSON.parse(readFileSync(new URL("../scripts/thoi-gian-test.json", import.meta.url), "utf8")) as Record<string, number>;
  for (const [k, v] of Object.entries(tg)) assert.ok(/^src\/.*\.test\.ts$/.test(k) && typeof v === "number" && v >= 0, k);
});

test("dem-bai: cộng giây từng TỆP từ bài cấp ngoài cùng (nesting 0); gom gộp giây từng tệp của mọi phần", async () => {
  const { default: demBai } = (await import(new URL("../scripts/dem-bai.mjs", import.meta.url).href)) as { default: (s: AsyncIterable<unknown>) => AsyncGenerator<string> };
  async function* nguon() {
    yield { type: "test:pass", data: { name: "x", nesting: 0, file: "/k/src/a.test.ts", details: { duration_ms: 1500 } } };
    yield { type: "test:pass", data: { name: "x1", nesting: 1, file: "/k/src/a.test.ts", details: { duration_ms: 1400 } } };
    yield { type: "test:fail", data: { name: "y", nesting: 0, file: "/k/src/a.test.ts", details: { duration_ms: 500 } } };
    yield { type: "test:pass", data: { name: "z", nesting: 0, file: "/k/src/b.test.ts", details: { duration_ms: 250 } } };
    // Sự kiện CẤP TỆP (dạng THẬT của node 22: tên = đường dẫn tương đối như truyền vào, `file` = đường dẫn đầy đủ): đồng hồ tường cả tệp, gồm lúc tiến trình con còn treo sau bài cuối — không phải một bài.
    yield { type: "test:complete", data: { name: "src/a.test.ts", nesting: 0, file: "/k/src/a.test.ts", details: { duration_ms: 75250, type: "test" } } };
    // Bài tên trùng đuôi tệp nhưng không phải sự kiện cấp tệp (tên không kết thúc .test.ts) ⇒ bỏ qua.
    yield { type: "test:complete", data: { name: "a", nesting: 0, file: "/k/src/a.test.ts", details: { duration_ms: 9 } } };
    yield { type: "test:complete", data: { name: "z", nesting: 0, file: "/k/src/b.test.ts", details: { duration_ms: 250 } } };
  }
  let ra = "";
  for await (const x of demBai(nguon())) ra += x;
  const d = JSON.parse(ra);
  assert.deepEqual(d.giayTep, { "src/a.test.ts": 2, "src/b.test.ts": 0.25 });
  assert.equal(d.tests, 4);
  assert.deepEqual(d.giayTuong, { "src/a.test.ts": 75.25 }, "chỉ sự kiện cấp tệp vào giayTuong");
  const bang = bangNho();
  const bc = baoCaoDu(bang);
  bc.find((x) => x.loai === "test").giayTep = { "src/a.test.ts": 2 };
  bc.find((x) => x.loai === "test").giayTuong = { "src/a.test.ts": 75.25 };
  bc[0].doGio.giayTep = { "src/claude-guard-thoi-gian.test.ts": 9 };
  const r = lib.gomKetQua(bang, bc, toanBo);
  assert.equal(r.giayTep["src/a.test.ts"], 2);
  assert.equal(r.giayTep["src/claude-guard-thoi-gian.test.ts"], 9);
  assert.equal(r.giayTuong["src/a.test.ts"], 75.25);
  // Tệp chờ lâu = đồng hồ tường hơn tổng giây các bài từ 15 giây: in tên cho người đọc nhật ký gom.
  assert.deepEqual(lib.tepChoLau(r), [{ tep: "src/a.test.ts", giayTuong: 75.25, giayBai: 2 }]);
  const kp = readFileSync(new URL("../scripts/kiem-phan.mjs", import.meta.url), "utf8");
  assert.match(kp, /giayTuong: r\.dem\?\.giayTuong \?\? \{\}/, "phần test ghi giayTuong vào báo cáo");
});

test("run.mjs (lượt kiểm 2 trên GitHub, 6/11): wrangler dev va cổng ⇒ tắt, chọn cổng MỚI, bật lại (tối đa 3 lần); lỗi khác ⇒ dừng ngay như cũ", async () => {
  const ds = (await import(new URL("../tests/e2e/danh-sach.mjs", import.meta.url).href)) as { laLoiTrungCong: (log: string) => boolean; SO_LAN_BAT_TOI_DA: number };
  // Nguyên văn nhật ký lượt 42180826984 (e2e phần 7).
  assert.equal(ds.laLoiTrungCong("*** Fatal uncaught kj::Exception: rust/cxx/kj-rs-io/ffi.rs:180: failed: bind(): Address already in use (os error 98)"), true);
  assert.equal(ds.laLoiTrungCong("Error: listen EADDRINUSE: address already in use 127.0.0.1:8787"), true);
  assert.equal(ds.laLoiTrungCong("✘ [ERROR] Could not resolve \"./khong-co.ts\""), false, "lỗi mã không được thử lại");
  assert.equal(ds.laLoiTrungCong(""), false);
  assert.equal(ds.SO_LAN_BAT_TOI_DA, 3);
  const r = readFileSync(new URL("../tests/e2e/run.mjs", import.meta.url), "utf8");
  assert.match(r, /import \{ ALL, chiaNhom, laLoiTrungCong, SO_LAN_BAT_TOI_DA \} from "\.\/danh-sach\.mjs";/);
  // Mỗi lần thử gọi lại freePort (cổng mới), và chỉ thử lại khi đúng lỗi trùng cổng.
  assert.match(r, /async function batMotLan\(may\) \{\n\s+const \[port, inspector, openaiPort\] = \[await freePort\(\), await freePort\(\), await freePort\(\)\];/);
  assert.match(r, /if \(lan >= SO_LAN_BAT_TOI_DA \|\| !laLoiTrungCong\(may\.log\)\) throw e;/);
  // Trùng cổng thì máy chủ chết ngay: không chờ hết 90 giây mới thử lại.
  assert.match(r, /laLoiTrungCong\(may\.log\)\) throw new Error/);
});

test("bảng giây npm test là ĐỒNG HỒ TƯỜNG cả tệp đo trên GitHub (lượt kiểm 3, 6/11): tệp làm việc nặng NGOÀI bài (cấp tệp) không bị tính 0 giây", () => {
  // muc-hien-mo-duoc-1/2/3 gọi hàng trăm đường × mọi tập quyền TRƯỚC khi khai bài: giây các bài ≈ 0 nhưng đồng hồ tường 67–93 giây trên GitHub.
  // Bảng cũ (giây các bài, đo ở máy) coi chúng là 0 ⇒ dồn vào cùng phần ⇒ phần 9 chạy 12 phút.
  const tg = JSON.parse(readFileSync(new URL("../scripts/thoi-gian-test.json", import.meta.url), "utf8")) as Record<string, number>;
  for (const k of [1, 2, 3]) assert.ok((tg[`src/muc-hien-mo-duoc-${k}.test.ts`] ?? 0) >= 30, `muc-hien-mo-duoc-${k}: ${tg[`src/muc-hien-mo-duoc-${k}.test.ts`]}`);
  // KHÔNG đòi mọi tệp có số đo: tệp kiểm mới (vd 5 tệp Trả sau nhập từ main 6/11) rơi về ước lượng theo cỡ tệp đúng thiết kế; đòi đủ thì mỗi tệp
  // mới làm npm test đỏ. Chỉ chặn bảng mục nát: phần lớn tệp phải có số đo (đo lại khi tụt dưới 90 %).
  const ds = lib.danhSachTest().filter((t) => t !== lib.TEP_DO_GIO);
  const co = ds.filter((t) => t in tg).length;
  assert.ok(co >= 0.9 * ds.length, `chỉ ${co}/${ds.length} tệp có số đo — chép giayTuong của lượt kiểm gần nhất vào scripts/thoi-gian-test.json`);
  // Bước gom gợi ý chép ĐỒNG HỒ TƯỜNG (giayTuong), không phải giây các bài.
  assert.match(readFileSync(new URL("../scripts/kiem-phan.mjs", import.meta.url), "utf8"), /chép vào scripts\/thoi-gian-test\.json khi cần chia lại\): có trong tệp ket-qua-tong, khoá giayTuong/);
});

// Việc 2.4 (kế hoạch 2026-11-15): tệp kiểm treo phải đỏ CÓ TÊN trong trần, không làm cả phần chờ tới khi GitHub huỷ (7 lượt «npm test phần 2» bị huỷ).
test("trần mỗi tệp kiểm (--test-timeout): một nguồn ở kiem-phan.mjs, cả npm test lẫn phần GitHub đều dùng; nằm giữa 3 và 15 phút", () => {
  const l = lib as Lib & { TRAN_TEP_MS: number; CO_TRAN_TEP: string };
  assert.ok(l.TRAN_TEP_MS >= 180_000 && l.TRAN_TEP_MS <= 900_000, `trần ${l.TRAN_TEP_MS} ms`);
  assert.equal(l.CO_TRAN_TEP, `--test-timeout=${l.TRAN_TEP_MS}`);
  const kp = readFileSync(new URL("../scripts/kiem-phan.mjs", import.meta.url), "utf8");
  assert.match(kp, /spawnSync\(process\.execPath, \["--test", CO_TRAN_TEP,/, "phần GitHub (chayNodeTest) mang trần");
  const ct = readFileSync(new URL("../scripts/chay-test.mjs", import.meta.url), "utf8");
  assert.match(ct, /\["--test", CO_TRAN_TEP, \.\.\.chinh\]/, "bộ chính của npm test mang trần");
});
