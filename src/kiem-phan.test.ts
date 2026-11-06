// ADR-0176 Đ1.2–Đ1.3: bảng chia phần của lượt kiểm trên GitHub và máy gom "không bỏ bài nào". Hàm THUẦN (không chạy node --test hay wrangler).
// Đột biến đã quan sát (sổ hàng rào): bỏ một tệp khỏi phần ⇒ đỏ; bỏ audit ở một phần e2e ⇒ đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type Bang = { rieng: string[]; test: string[][]; e2e: string[][] };
type Lib = {
  TEP_DO_GIO: string;
  BUOC_RIENG: string[];
  SO_PHAN_TEST: number;
  SO_PHAN_E2E: number;
  danhSachTest: () => string[];
  bangChia: (o?: { tests?: string[]; e2e?: string[]; soPhanTest?: number; soPhanE2e?: number; kichThuoc?: (f: string) => number }) => Bang;
  kiemBangChia: (bang: Bang, toanBo: { tests: string[]; e2e: string[] }) => string[];
  phanE2e: (k: number) => string[];
  gomKetQua: (bang: Bang, baoCao: unknown[], toanBo: { tests: string[]; e2e: string[] }) => { ok: boolean; loi: string[]; baiDo: string[]; tong: { soTep: number; soBai: number; soBoQua: number; soKichBan: number }; giayE2e: Record<string, number> };
  TEP_DIEU_KHIEN: string[];
};
const lib = (await import(new URL("../scripts/kiem-phan.mjs", import.meta.url).href)) as Lib;
const { ALL } = (await import(new URL("../tests/e2e/danh-sach.mjs", import.meta.url).href)) as { ALL: string[] };

const TESTS = ["src/a.test.ts", "src/b.test.ts", "src/c.test.ts", "src/d.test.ts", "src/e.test.ts", "src/claude-guard-thoi-gian.test.ts"];
const E2E = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];
const toanBo = { tests: TESTS, e2e: E2E };
const bangNho = () => lib.bangChia({ tests: TESTS, e2e: E2E, soPhanTest: 4, soPhanE2e: 6, kichThuoc: () => 1 });
const dem = (tests: number, skipped = 0, todo = 0) => ({ tests, pass: tests, fail: 0, skipped, todo });

/** Báo cáo đủ và xanh cho bảng nhỏ — từng ca sửa đúng một chỗ. */
function baoCaoDu(bang: Bang): any[] {
  return [
    { loai: "rieng", buoc0: { ok: true, doi: [] }, typecheck: { ok: true }, doGio: { ok: true, tep: [lib.TEP_DO_GIO], dem: dem(3) } },
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
  assert.deepEqual(lib.kiemBangChia(bang, { tests, e2e: ALL }), []);
  assert.ok(!bang.test.flat().includes(lib.TEP_DO_GIO), "bài đo giờ chỉ ở phần riêng");
  for (const p of [...bang.test, ...bang.e2e]) assert.ok(p.length > 0, "không phần nào rỗng");
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

test("gomKetQua (ADR-0176 tiêu chí 2): thiếu báo cáo / phần chạy thiếu tệp / thiếu audit / audit đỏ / một phần đỏ / báo cáo trùng / thiếu phần riêng ⇒ ĐỎ, nêu lý do", () => {
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
  for (const t of [".github/workflows", "package.json", "scripts/chay-test.mjs", "scripts/kiem-phan.mjs", "scripts/dem-bai.mjs", "tests/e2e/run.mjs", "tests/e2e/danh-sach.mjs", "tests/e2e/thoi-gian.json", "scripts/audit-invariants.mjs", "src/claude-guard-thoi-gian.test.ts", "scripts/release-lib.mjs"]) {
    assert.ok(lib.TEP_DIEU_KHIEN.includes(t), t);
  }
  // Đi chuỗi nhập tương đối (import "./x.mjs" / import("./x.mjs")) từ audit-invariants.mjs: mọi tệp CÂU KIỂM (scripts/) chạm tới phải nằm trong danh sách.
  // Luật nghiệp vụ ở src/ mà câu kiểm dùng lại (audit-thuong-mai.mjs nhập src/shared/…) là MÃ SẢN PHẨM, đã có npm test canh — không phải tệp điều khiển.
  const seen = new Set<string>();
  const di = (rel: string) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const src = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
    for (const m of src.matchAll(/(?:from\s+|import\(\s*)["'](\.\.?\/[^"']+)["']/g)) {
      const next = new URL(m[1]!, new URL(`../${rel}`, import.meta.url)).pathname.replace(new URL("../", import.meta.url).pathname, "");
      di(next);
    }
  };
  di("scripts/audit-invariants.mjs");
  assert.ok(seen.size >= 3, "phải thấy ít nhất audit-invariants, audit-checks, audit-thuong-mai");
  for (const t of [...seen].filter((x) => x.startsWith("scripts/"))) assert.ok(lib.TEP_DIEU_KHIEN.includes(t), `tệp ${t} (audit-invariants nạp) phải có trong TEP_DIEU_KHIEN`);
});

test("run.mjs --phan: VẪN chạy audit-invariants --strict cuối phần (chạy lẻ theo tên thì không); ghi báo cáo kèm audit", () => {
  const r = readFileSync(new URL("../tests/e2e/run.mjs", import.meta.url), "utf8");
  assert.match(r, /const coAudit = phan !== null \|\| !picked\.length;/);
  assert.match(r, /if \(coAudit\) \{\n\s+console\.log\(`▶ audit-invariants/);
  assert.match(r, /"--persist-to", may\.persist, "--strict"\]/);
  assert.match(r, /kichBan: daChay, audit, ok:/);
  assert.match(r, /import \{ ALL, chiaNhom \} from "\.\/danh-sach\.mjs";/, "danh sách kịch bản chỉ ở danh-sach.mjs");
  assert.doesNotMatch(r, /const ALL = \[/, "run.mjs không tự khai danh sách thứ hai");
});
